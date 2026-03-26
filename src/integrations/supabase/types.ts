export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	// Allows to automatically instantiate createClient with right options
	// instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
	__InternalSupabase: {
		PostgrestVersion: "12.2.3 (519615d)";
	};
	public: {
		Tables: {
			cat_app_users: {
				Row: {
					created_at: string;
					deleted_at: string | null;
					is_deleted: boolean;
					preferences: Json | null;
					updated_at: string;
					user_id: string;
					user_name: string;
				};
				Insert: {
					created_at?: string;
					deleted_at?: string | null;
					is_deleted?: boolean;
					preferences?: Json | null;
					updated_at?: string;
					user_id?: string;
					user_name: string;
				};
				Update: {
					created_at?: string;
					deleted_at?: string | null;
					is_deleted?: boolean;
					preferences?: Json | null;
					updated_at?: string;
					user_id?: string;
					user_name?: string;
				};
				Relationships: [];
			};
			cat_audit_log: {
				Row: {
					client_ip: unknown;
					created_at: string | null;
					id: string;
					new_values: Json | null;
					old_values: Json | null;
					operation: string;
					table_name: string;
					user_agent: string | null;
					user_id: string | null;
					user_name: string | null;
				};
				Insert: {
					client_ip?: unknown;
					created_at?: string | null;
					id?: string;
					new_values?: Json | null;
					old_values?: Json | null;
					operation: string;
					table_name: string;
					user_agent?: string | null;
					user_id?: string | null;
					user_name?: string | null;
				};
				Update: {
					client_ip?: unknown;
					created_at?: string | null;
					id?: string;
					new_values?: Json | null;
					old_values?: Json | null;
					operation?: string;
					table_name?: string;
					user_agent?: string | null;
					user_id?: string | null;
					user_name?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "cat_audit_log_user_id_fkey";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "cat_app_users";
						referencedColumns: ["user_id"];
					},
				];
			};
			cat_names: {
				Row: {
					avg_rating: number | null;
					categories: string[] | null;
					created_at: string;
					deleted_at: string | null;
					description: string | null;
					global_losses: number;
					global_wins: number;
					id: string;
					is_active: boolean | null;
					is_deleted: boolean;
					is_hidden: boolean;
					locked_in: boolean;
					name: string;
					pronunciation: string | null;
					provenance: Json | null;
					sort_order: number | null;
					status: Database["public"]["Enums"]["name_status"] | null;
				};
				Insert: {
					avg_rating?: number | null;
					categories?: string[] | null;
					created_at?: string;
					deleted_at?: string | null;
					description?: string | null;
					global_losses?: number;
					global_wins?: number;
					id?: string;
					is_active?: boolean | null;
					is_deleted?: boolean;
					is_hidden?: boolean;
					locked_in?: boolean;
					name: string;
					pronunciation?: string | null;
					provenance?: Json | null;
					sort_order?: number | null;
					status?: Database["public"]["Enums"]["name_status"] | null;
				};
				Update: {
					avg_rating?: number | null;
					categories?: string[] | null;
					created_at?: string;
					deleted_at?: string | null;
					description?: string | null;
					global_losses?: number;
					global_wins?: number;
					id?: string;
					is_active?: boolean | null;
					is_deleted?: boolean;
					is_hidden?: boolean;
					locked_in?: boolean;
					name?: string;
					pronunciation?: string | null;
					provenance?: Json | null;
					sort_order?: number | null;
					status?: Database["public"]["Enums"]["name_status"] | null;
				};
				Relationships: [];
			};
			user_cat_name_ratings: {
				Row: {
					is_hidden: boolean | null;
					losses: number | null;
					name_id: string;
					rating: number | null;
					rating_history: Json | null;
					updated_at: string;
					user_id: string;
					user_name: string;
					wins: number | null;
				};
				Insert: {
					is_hidden?: boolean | null;
					losses?: number | null;
					name_id: string;
					rating?: number | null;
					rating_history?: Json | null;
					updated_at?: string;
					user_id: string;
					user_name: string;
					wins?: number | null;
				};
				Update: {
					is_hidden?: boolean | null;
					losses?: number | null;
					name_id?: string;
					rating?: number | null;
					rating_history?: Json | null;
					updated_at?: string;
					user_id?: string;
					user_name?: string;
					wins?: number | null;
				};
				Relationships: [
					{
						foreignKeyName: "user_cat_name_ratings_name_id_fkey";
						columns: ["name_id"];
						isOneToOne: false;
						referencedRelation: "cat_names";
						referencedColumns: ["id"];
					},
					{
						foreignKeyName: "user_cat_name_ratings_user_id_fkey";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "cat_app_users";
						referencedColumns: ["user_id"];
					},
				];
			};
			cat_rate_limit_events: {
				Row: {
					blocked_until: string | null;
					event_count: number | null;
					event_type: string;
					first_seen: string | null;
					id: string;
					identifier: string;
					last_seen: string | null;
				};
				Insert: {
					blocked_until?: string | null;
					event_count?: number | null;
					event_type: string;
					first_seen?: string | null;
					id?: string;
					identifier: string;
					last_seen?: string | null;
				};
				Update: {
					blocked_until?: string | null;
					event_count?: number | null;
					event_type?: string;
					first_seen?: string | null;
					id?: string;
					identifier?: string;
					last_seen?: string | null;
				};
				Relationships: [];
			};
			cat_site_settings: {
				Row: {
					created_at: string | null;
					id: string;
					key: string;
					updated_at: string | null;
					updated_by: string | null;
					value: Json;
				};
				Insert: {
					created_at?: string | null;
					id?: string;
					key: string;
					updated_at?: string | null;
					updated_by?: string | null;
					value: Json;
				};
				Update: {
					created_at?: string | null;
					id?: string;
					key?: string;
					updated_at?: string | null;
					updated_by?: string | null;
					value?: Json;
				};
				Relationships: [];
			};
			cat_user_roles: {
				Row: {
					created_at: string | null;
					id: string;
					role: Database["public"]["Enums"]["app_role"];
					user_id: string | null;
					user_name: string | null;
				};
				Insert: {
					created_at?: string | null;
					id?: string;
					role: Database["public"]["Enums"]["app_role"];
					user_id?: string | null;
					user_name?: string | null;
				};
				Update: {
					created_at?: string | null;
					id?: string;
					role?: Database["public"]["Enums"]["app_role"];
					user_id?: string | null;
					user_name?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "cat_user_roles_user_id_fkey";
						columns: ["user_id"];
						isOneToOne: false;
						referencedRelation: "cat_app_users";
						referencedColumns: ["user_id"];
					},
				];
			};
			flo_entries: {
				Row: {
					created_at: string;
					date: string;
					id: string;
					is_period_day: boolean;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					date: string;
					id?: string;
					is_period_day?: boolean;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					created_at?: string;
					date?: string;
					id?: string;
					is_period_day?: boolean;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [];
			};
			flo_shares: {
				Row: {
					created_at: string;
					id: string;
					owner_id: string;
					shared_with_id: string;
					updated_at: string | null;
				};
				Insert: {
					created_at?: string;
					id?: string;
					owner_id: string;
					shared_with_id: string;
					updated_at?: string | null;
				};
				Update: {
					created_at?: string;
					id?: string;
					owner_id?: string;
					shared_with_id?: string;
					updated_at?: string | null;
				};
				Relationships: [];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			add_app_access_to_user: { Args: { app_name: string }; Returns: undefined };
			apply_tournament_match_elo: {
				Args: {
					p_left_name_ids: string[];
					p_right_name_ids: string[];
					p_user_name: string;
					p_winner_side: string;
				};
				Returns: {
					losses: number;
					name_id: string;
					rating: number;
					wins: number;
				}[];
			};
			calculate_elo_change: {
				Args: {
					current_rating: number;
					opponent_rating: number;
					result: number;
				};
				Returns: number;
			};
			change_user_role:
				| {
						Args: {
							new_role: Database["public"]["Enums"]["app_role"];
							target_user_id: string;
						};
						Returns: boolean;
				  }
				| {
						Args: { new_role: string; target_user_id: string };
						Returns: boolean;
				  };
			check_current_user_admin: { Args: never; Returns: boolean };
			check_profile_access_rate_limit: { Args: never; Returns: boolean };
			check_rate_limit: {
				Args: {
					p_block_minutes?: number;
					p_event_type: string;
					p_identifier: string;
					p_max_events?: number;
					p_window_minutes?: number;
				};
				Returns: boolean;
			};
			check_user_role_by_name:
				| {
						Args: {
							required_role: Database["public"]["Enums"]["app_role"];
							user_name_param: string;
						};
						Returns: boolean;
				  }
				| {
						Args: { required_role: string; user_name_param: string };
						Returns: boolean;
				  };
			cleanup_old_rate_limits: { Args: never; Returns: number };
			cleanup_orphaned_auth_users: { Args: never; Returns: undefined };
			create_user_account: {
				Args: {
					p_preferences?: Json;
					p_user_name: string;
					p_user_role?: string;
				};
				Returns: undefined;
			};
			delete_own_account: { Args: never; Returns: boolean };
			delete_user_complete: {
				Args: { target_user_id: string };
				Returns: boolean;
			};
			get_all_users_with_roles: {
				Args: never;
				Returns: {
					avatar_url: string;
					created_at: string;
					display_name: string;
					email: string;
					role: Database["public"]["Enums"]["app_role"];
					user_id: string;
					username: string;
				}[];
			};
			get_client_identifier: { Args: never; Returns: string };
			get_current_user_name: { Args: never; Returns: string };
			get_current_user_role: {
				Args: never;
				Returns: Database["public"]["Enums"]["app_role"];
			};
			get_existing_usernames: {
				Args: never;
				Returns: {
					avatar_url: string;
					display_name: string;
					username: string;
				}[];
			};
			get_popularity_scores: {
				Args: {
					p_current_user_name?: string;
					p_limit?: number;
					p_user_filter?: string;
				};
				Returns: {
					avg_rating: number;
					category: string;
					created_at: string;
					description: string;
					name: string;
					name_id: string;
					popularity_score: number;
					times_selected: number;
				}[];
			};
			get_safe_profile_data: {
				Args: { profile_user_id: string };
				Returns: {
					avatar_url: string;
					created_at: string;
					display_name: string;
					id: string;
					username: string;
				}[];
			};
			get_secure_profile: { Args: { target_user_id: string }; Returns: Json };
			get_security_summary: {
				Args: { hours_back?: number };
				Returns: {
					count: number;
					details: Json;
					metric: string;
				}[];
			};
			get_top_names_by_category: {
				Args: { p_category: string; p_limit?: number };
				Returns: {
					avg_rating: number;
					category: string;
					description: string;
					id: string;
					name: string;
					total_ratings: number;
				}[];
			};
			get_top_selections: {
				Args: { limit_count: number };
				Returns: {
					count: number;
					name: string;
					name_id: string;
				}[];
			};
			get_user_flo_data_admin: {
				Args: { target_user_id: string };
				Returns: {
					created_at: string;
					date: string;
					id: string;
					is_period_day: boolean;
					updated_at: string;
				}[];
			};
			get_user_name_from_header: { Args: never; Returns: string };
			get_user_profile_by_id: {
				Args: { user_id: string };
				Returns: {
					avatar_url: string;
					created_at: string;
					display_name: string;
					email: string;
					first_name: string;
					id: string;
					username: string;
				}[];
			};
			get_user_stats: {
				Args: { p_user_name: string };
				Returns: {
					avg_rating: number;
					hidden_count: number;
					total_losses: number;
					total_ratings: number;
					total_wins: number;
					win_rate: number;
				}[];
			};
			get_users_with_flo_data: {
				Args: never;
				Returns: {
					display_name: string;
					email: string;
					first_name: string;
					flo_entries: Json;
					user_id: string;
				}[];
			};
			has_role:
				| {
						Args: {
							_role: Database["public"]["Enums"]["app_role"];
							_user_id: string;
						};
						Returns: boolean;
				  }
				| { Args: { _role: string; _user_name: string }; Returns: boolean }
				| { Args: { required_role: string }; Returns: boolean };
			increment_selection: {
				Args: { p_name_id: string; p_user_name: string };
				Returns: undefined;
			};
			is_admin: { Args: never; Returns: boolean };
			is_user_admin: { Args: { user_id_to_check: string }; Returns: boolean };
			merge_user_accounts: {
				Args: { p_new_user_id: string; p_username: string };
				Returns: undefined;
			};
			refresh_materialized_views: { Args: never; Returns: undefined };
			set_user_context: {
				Args: { user_name_param: string };
				Returns: undefined;
			};
			toggle_name_hidden: {
				Args: { p_hidden: boolean; p_name_id: string; p_user_name?: string };
				Returns: boolean;
			};
			toggle_name_locked_in:
				| {
						Args: { p_locked_in: boolean; p_name_id: string };
						Returns: boolean;
				  }
				| {
						Args: {
							p_locked_in: boolean;
							p_name_id: string;
							p_user_name?: string;
						};
						Returns: boolean;
				  }
				| {
						Args: { p_locked_in: boolean; p_name_id: string };
						Returns: boolean;
				  };
			toggle_name_locked_in_debug:
				| {
						Args: { p_locked_in: boolean; p_name_id: string };
						Returns: boolean;
				  }
				| {
						Args: {
							p_locked_in: boolean;
							p_name_id: string;
							p_user_name?: string;
						};
						Returns: boolean;
				  };
			toggle_name_visibility:
				| { Args: { p_hide: boolean; p_name_id: string }; Returns: boolean }
				| {
						Args: { p_hide: boolean; p_name_id: string; p_user_name?: string };
						Returns: boolean;
				  };
			unblock_client: {
				Args: { p_event_type: string; p_identifier: string };
				Returns: boolean;
			};
			update_user_tournament_data: {
				Args: { p_tournament_data: Json; p_user_name: string };
				Returns: undefined;
			};
			user_exists_by_username: {
				Args: { p_username: string };
				Returns: {
					avatar_url: string;
					display_name: string;
					first_name: string;
					id: string;
					username: string;
				}[];
			};
			user_has_app_access: {
				Args: { app_name: string; user_id_param: string };
				Returns: boolean;
			};
			validate_cat_name_suggestion: {
				Args: { p_description?: string; p_name: string };
				Returns: boolean;
			};
			validate_cat_name_suggestion_with_rate_limit: {
				Args: { p_description?: string; p_name: string };
				Returns: boolean;
			};
			validate_environment_setup: { Args: never; Returns: boolean };
			validate_username: { Args: { p_username: string }; Returns: Json };
		};
		Enums: {
			app_role: "admin" | "user";
			name_status: "candidate" | "intake" | "tournament" | "eliminated" | "archived";
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
		? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema["Tables"]
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
		? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema["Tables"]
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
		? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		| keyof DefaultSchema["Enums"]
		| { schema: keyof DatabaseWithoutInternals },
	EnumName extends DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
		: never = never,
> = DefaultSchemaEnumNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
		? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof DefaultSchema["CompositeTypes"]
		| { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
		: never = never,
> = PublicCompositeTypeNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
		? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
		: never;

export const Constants = {
	public: {
		Enums: {
			app_role: ["admin", "user"],
			name_status: ["candidate", "intake", "tournament", "eliminated", "archived"],
		},
	},
} as const;
