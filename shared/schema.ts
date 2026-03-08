import {
	bigint,
	bigserial,
	boolean,
	doublePrecision,
	integer,
	jsonb,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

export const catAppUsers = pgTable("cat_app_users", {
	userId: uuid("user_id").defaultRandom().primaryKey(),
	userName: text("user_name").unique(), // User name (legacy PK, now just unique/lookup)
	preferences: jsonb("preferences").default({}),
	isDeleted: boolean("is_deleted").default(false),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const catNameOptions = pgTable("cat_name_options", {
	id: bigserial("id", { mode: "number" }).primaryKey(),
	name: text("name").notNull(),
	description: text("description"),
	pronunciation: text("pronunciation"),
	avgRating: doublePrecision("avg_rating").default(1500),
	isHidden: boolean("is_hidden").default(false),
	isActive: boolean("is_active").default(true),
	lockedIn: boolean("locked_in").default(false),
	status: text("status").default("candidate"),
	provenance: jsonb("provenance"),
	isDeleted: boolean("is_deleted").default(false),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const catNameRatings = pgTable(
	"cat_name_ratings",
	{
		userId: uuid("user_id")
			.notNull()
			.references(() => catAppUsers.userId, { onDelete: "cascade" }),
		nameId: bigint("name_id", { mode: "number" })
			.notNull()
			.references(() => catNameOptions.id, { onDelete: "cascade" }),
		rating: doublePrecision("rating").default(1500),
		wins: integer("wins").default(0),
		losses: integer("losses").default(0),
	},
	(table) => {
		return {
			pk: primaryKey({ columns: [table.userId, table.nameId] }),
		};
	},
);

export const catTournamentSelections = pgTable("cat_tournament_selections", {
	id: bigserial("id", { mode: "number" }).primaryKey(),
	userId: uuid("user_id")
		.notNull()
		.references(() => catAppUsers.userId, { onDelete: "cascade" }),
	nameId: bigint("name_id", { mode: "number" })
		.notNull()
		.references(() => catNameOptions.id),
	tournamentId: text("tournament_id"),
	selectedAt: timestamp("selected_at", { withTimezone: true }).defaultNow(),
	selectionType: text("selection_type"),
});

export const userRoles = pgTable(
	"cat_user_roles",
	{
		userId: uuid("user_id")
			.notNull()
			.references(() => catAppUsers.userId, { onDelete: "cascade" }),
		role: text("role").notNull(),
	},
	(table) => {
		return {
			pk: primaryKey({ columns: [table.userId, table.role] }),
		};
	},
);

export const catAuditLog = pgTable("cat_audit_log", {
	id: bigserial("id", { mode: "number" }).primaryKey(),
	userId: uuid("user_id").references(() => catAppUsers.userId, { onDelete: "set null" }),
	action: text("action").notNull(),
	details: jsonb("details"),
	timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow(),
});
