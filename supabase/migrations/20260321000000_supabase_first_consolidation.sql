DO $$
BEGIN
	IF to_regclass('public.cat_user_roles') IS NULL AND to_regclass('public.user_roles') IS NOT NULL THEN
		ALTER TABLE public.user_roles RENAME TO cat_user_roles;
	END IF;

	IF to_regclass('public.cat_tournament_selections') IS NULL AND to_regclass('public.tournament_selections') IS NOT NULL THEN
		ALTER TABLE public.tournament_selections RENAME TO cat_tournament_selections;
	END IF;

	IF to_regclass('public.cat_audit_log') IS NULL AND to_regclass('public.audit_log') IS NOT NULL THEN
		ALTER TABLE public.audit_log RENAME TO cat_audit_log;
	END IF;

	IF to_regclass('public.cat_site_settings') IS NULL AND to_regclass('public.site_settings') IS NOT NULL THEN
		ALTER TABLE public.site_settings RENAME TO cat_site_settings;
	END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_name()
RETURNS text
LANGUAGE sql
STABLE
AS $$
	SELECT COALESCE(
		(
			SELECT cau.user_name
			FROM public.cat_app_users cau
			WHERE cau.user_id = auth.uid()
			LIMIT 1
		),
		NULLIF(current_setting('app.user_name', true), ''),
		CASE
			WHEN NULLIF(current_setting('request.jwt.claims', true), '') IS NULL THEN NULL
			ELSE current_setting('request.jwt.claims', true)::json ->> 'user_name'
		END
	)
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
	SELECT EXISTS (
		SELECT 1
		FROM public.cat_user_roles cur
		WHERE cur.user_id = auth.uid()
			AND cur.role::text = 'admin'
	)
$$;

GRANT EXECUTE ON FUNCTION public.get_current_user_name() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_current_user_name() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;

CREATE OR REPLACE FUNCTION public.toggle_name_visibility(
	p_name_id uuid,
	p_hide boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	v_previous boolean;
	v_user_name text;
BEGIN
	IF auth.uid() IS NULL THEN
		RAISE EXCEPTION 'Authentication required';
	END IF;

	IF NOT public.is_admin() THEN
		RAISE EXCEPTION 'Admin access required';
	END IF;

	SELECT is_hidden INTO v_previous
	FROM public.cat_name_options
	WHERE id = p_name_id
	FOR UPDATE;

	IF NOT FOUND THEN
		RAISE EXCEPTION 'Name not found';
	END IF;

	UPDATE public.cat_name_options
	SET is_hidden = p_hide
	WHERE id = p_name_id;

	v_user_name := public.get_current_user_name();

	INSERT INTO public.cat_audit_log (
		table_name,
		operation,
		old_values,
		new_values,
		user_id,
		user_name,
		created_at
	)
	VALUES (
		'cat_name_options',
		CASE WHEN p_hide THEN 'HIDE' ELSE 'UNHIDE' END,
		jsonb_build_object('is_hidden', v_previous),
		jsonb_build_object('is_hidden', p_hide),
		auth.uid(),
		v_user_name,
		now()
	);

	RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_name_locked_in(
	p_name_id uuid,
	p_locked_in boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	v_previous boolean;
	v_user_name text;
BEGIN
	IF auth.uid() IS NULL THEN
		RAISE EXCEPTION 'Authentication required';
	END IF;

	IF NOT public.is_admin() THEN
		RAISE EXCEPTION 'Admin access required';
	END IF;

	SELECT locked_in INTO v_previous
	FROM public.cat_name_options
	WHERE id = p_name_id
	FOR UPDATE;

	IF NOT FOUND THEN
		RAISE EXCEPTION 'Name not found';
	END IF;

	UPDATE public.cat_name_options
	SET locked_in = p_locked_in
	WHERE id = p_name_id;

	v_user_name := public.get_current_user_name();

	INSERT INTO public.cat_audit_log (
		table_name,
		operation,
		old_values,
		new_values,
		user_id,
		user_name,
		created_at
	)
	VALUES (
		'cat_name_options',
		CASE WHEN p_locked_in THEN 'LOCK_IN' ELSE 'UNLOCK_IN' END,
		jsonb_build_object('locked_in', v_previous),
		jsonb_build_object('locked_in', p_locked_in),
		auth.uid(),
		v_user_name,
		now()
	);

	RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_name_visibility(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_name_locked_in(uuid, boolean) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.toggle_name_visibility(uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.toggle_name_locked_in(uuid, boolean) FROM anon;

CREATE OR REPLACE FUNCTION public.get_site_stats()
RETURNS json
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
	total_names int;
	hidden_names int;
	total_users int;
	total_ratings int;
	total_selections int;
	avg_rating numeric;
BEGIN
	SELECT count(*) INTO total_names
	FROM public.cat_name_options
	WHERE is_active = true AND is_deleted = false;

	SELECT count(*) INTO hidden_names
	FROM public.cat_name_options
	WHERE is_hidden = true AND is_deleted = false;

	SELECT count(*) INTO total_users
	FROM public.cat_app_users
	WHERE is_deleted = false;

	SELECT count(*), COALESCE(avg(rating), 1500)
	INTO total_ratings, avg_rating
	FROM public.cat_name_ratings;

	SELECT count(*) INTO total_selections
	FROM public.cat_tournament_selections;

	RETURN json_build_object(
		'totalNames', total_names,
		'hiddenNames', hidden_names,
		'activeNames', GREATEST(total_names - hidden_names, 0),
		'totalUsers', total_users,
		'totalRatings', total_ratings,
		'totalSelections', total_selections,
		'avgRating', round(avg_rating)
	);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_leaderboard_stats(limit_count integer DEFAULT 50)
RETURNS TABLE (
	name_id uuid,
	name text,
	description text,
	avg_rating numeric,
	total_ratings bigint,
	wins bigint,
	losses bigint,
	created_at timestamptz
)
LANGUAGE sql
STABLE
AS $$
	SELECT
		cno.id AS name_id,
		cno.name,
		cno.description,
		COALESCE(round(avg(cnr.rating)), cno.avg_rating, 1500) AS avg_rating,
		count(cnr.name_id) AS total_ratings,
		COALESCE(sum(cnr.wins), 0) AS wins,
		COALESCE(sum(cnr.losses), 0) AS losses,
		cno.created_at
	FROM public.cat_name_options cno
	LEFT JOIN public.cat_name_ratings cnr ON cnr.name_id = cno.id
	WHERE cno.is_active = true
		AND cno.is_hidden = false
		AND cno.is_deleted = false
	GROUP BY cno.id, cno.name, cno.description, cno.avg_rating, cno.created_at
	ORDER BY avg_rating DESC, name ASC
	LIMIT limit_count
$$;

CREATE OR REPLACE FUNCTION public.get_top_selections(limit_count integer DEFAULT 50)
RETURNS TABLE (
	name_id uuid,
	name text,
	count bigint
)
LANGUAGE sql
STABLE
AS $$
	SELECT
		cts.name_id,
		cno.name,
		count(*) AS count
	FROM public.cat_tournament_selections cts
	INNER JOIN public.cat_name_options cno ON cno.id = cts.name_id
	GROUP BY cts.name_id, cno.name
	ORDER BY count DESC, cno.name ASC
	LIMIT limit_count
$$;

GRANT EXECUTE ON FUNCTION public.get_site_stats() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_stats(integer) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_top_selections(integer) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.get_user_ratings_raw()
RETURNS TABLE (
	name_id uuid,
	rating numeric,
	wins integer,
	losses integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
	SELECT
		cnr.name_id,
		cnr.rating,
		cnr.wins,
		cnr.losses
	FROM public.cat_name_ratings cnr
	WHERE cnr.user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.get_user_stats()
RETURNS TABLE (
	total_ratings integer,
	total_selections integer,
	total_wins integer,
	total_losses integer,
	win_rate numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
	WITH rating_stats AS (
		SELECT
			count(*)::integer AS total_ratings,
			COALESCE(sum(wins), 0)::integer AS total_wins,
			COALESCE(sum(losses), 0)::integer AS total_losses
		FROM public.cat_name_ratings
		WHERE user_id = auth.uid()
	), selection_stats AS (
		SELECT count(*)::integer AS total_selections
		FROM public.cat_tournament_selections
		WHERE user_id = auth.uid()
	)
	SELECT
		rating_stats.total_ratings,
		selection_stats.total_selections,
		rating_stats.total_wins,
		rating_stats.total_losses,
		CASE
			WHEN rating_stats.total_wins + rating_stats.total_losses = 0 THEN 0
			ELSE round(
				(rating_stats.total_wins::numeric / (rating_stats.total_wins + rating_stats.total_losses)::numeric) * 100,
				1
			)
		END AS win_rate
	FROM rating_stats
	CROSS JOIN selection_stats
$$;

GRANT EXECUTE ON FUNCTION public.get_user_ratings_raw() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_stats() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_ratings_raw() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_stats() FROM anon;

CREATE OR REPLACE FUNCTION public.save_user_ratings(p_ratings jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
	v_user_id uuid := auth.uid();
	v_user_name text;
	v_saved_count integer := 0;
BEGIN
	IF v_user_id IS NULL THEN
		RAISE EXCEPTION 'Authentication required';
	END IF;

	IF p_ratings IS NULL OR jsonb_typeof(p_ratings) <> 'array' THEN
		RAISE EXCEPTION 'p_ratings must be a JSON array';
	END IF;

	SELECT cau.user_name INTO v_user_name
	FROM public.cat_app_users cau
	WHERE cau.user_id = v_user_id
	LIMIT 1;

	INSERT INTO public.cat_name_ratings (
		user_id,
		user_name,
		name_id,
		rating,
		wins,
		losses
	)
	SELECT
		v_user_id,
		COALESCE(v_user_name, v_user_id::text),
		(value ->> 'name_id')::uuid,
		COALESCE((value ->> 'rating')::numeric, 1500),
		COALESCE((value ->> 'wins')::integer, 0),
		COALESCE((value ->> 'losses')::integer, 0)
	FROM jsonb_array_elements(p_ratings) value
	ON CONFLICT (user_id, name_id) DO UPDATE
	SET
		user_name = EXCLUDED.user_name,
		rating = EXCLUDED.rating,
		wins = EXCLUDED.wins,
		losses = EXCLUDED.losses,
		updated_at = now();

	GET DIAGNOSTICS v_saved_count = ROW_COUNT;
	RETURN v_saved_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_user_ratings(jsonb) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.save_user_ratings(jsonb) FROM anon;
