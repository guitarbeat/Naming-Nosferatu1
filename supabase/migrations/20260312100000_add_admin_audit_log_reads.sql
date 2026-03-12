-- Ensure admin visibility actions are audited and expose recent admin actions to the dashboard.

CREATE OR REPLACE FUNCTION toggle_name_visibility(
	p_name_id UUID,
	p_hide BOOLEAN,
	p_user_name TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	v_current_hidden BOOLEAN;
	v_name TEXT;
	v_user_name TEXT;
BEGIN
	IF NOT is_admin() THEN
		RAISE EXCEPTION 'Only admins can toggle name visibility';
	END IF;

	v_user_name := COALESCE(get_current_user_name(), NULLIF(BTRIM(p_user_name), ''));

	SELECT name, is_hidden
	INTO v_name, v_current_hidden
	FROM cat_name_options
	WHERE id = p_name_id;

	IF NOT FOUND THEN
		RAISE EXCEPTION 'Name not found: %', p_name_id;
	END IF;

	IF v_current_hidden IS DISTINCT FROM p_hide THEN
		UPDATE cat_name_options
		SET is_hidden = p_hide
		WHERE id = p_name_id;

		INSERT INTO audit_log (
			table_name,
			operation,
			old_values,
			new_values,
			user_name
		) VALUES (
			'cat_name_options',
			CASE WHEN p_hide THEN 'HIDE' ELSE 'UNHIDE' END,
			jsonb_build_object(
				'id', p_name_id,
				'name', v_name,
				'is_hidden', v_current_hidden
			),
			jsonb_build_object(
				'id', p_name_id,
				'name', v_name,
				'is_hidden', p_hide
			),
			v_user_name
		);
	END IF;

	RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION toggle_name_visibility(UUID, BOOLEAN, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION get_recent_admin_actions(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
	id UUID,
	created_at TIMESTAMPTZ,
	operation TEXT,
	table_name TEXT,
	user_name TEXT,
	target_name TEXT,
	old_values JSONB,
	new_values JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	v_limit INTEGER;
BEGIN
	IF NOT is_admin() THEN
		RAISE EXCEPTION 'Admin access required to read admin actions';
	END IF;

	v_limit := LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50);

	RETURN QUERY
	SELECT
		audit.id,
		audit.created_at,
		audit.operation,
		audit.table_name,
		audit.user_name,
		COALESCE(
			audit.new_values ->> 'name',
			audit.old_values ->> 'name',
			current_name.name
		) AS target_name,
		audit.old_values,
		audit.new_values
	FROM audit_log AS audit
	LEFT JOIN cat_name_options AS current_name
		ON current_name.id::text = COALESCE(
			audit.new_values ->> 'id',
			audit.old_values ->> 'id'
		)
	WHERE audit.table_name = 'cat_name_options'
		AND audit.operation IN ('HIDE', 'UNHIDE', 'LOCK_IN', 'UNLOCK_IN')
	ORDER BY audit.created_at DESC
	LIMIT v_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_recent_admin_actions(INTEGER) TO authenticated;
