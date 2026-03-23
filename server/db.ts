import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema";

const { Pool } = pg;

let pool: pg.Pool | null = null;
let db: NodePgDatabase<typeof schema> | null = null;

// Prefer SUPABASE_DATABASE_URL (user-provided Supabase connection string),
// fall back to DATABASE_URL (Replit-managed Postgres) if not set.
const connectionString =
	process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (connectionString) {
	try {
		pool = new Pool({
			connectionString,
			ssl: process.env.SUPABASE_DATABASE_URL
				? { rejectUnauthorized: false }
				: false,
		});
		db = drizzle(pool, { schema });
		console.log("✓ Database connected successfully");
	} catch (error) {
		console.warn(
			"⚠ Failed to connect to database:",
			error instanceof Error ? error.message : String(error),
		);
		db = null;
		pool = null;
	}
}

export { pool, db };
