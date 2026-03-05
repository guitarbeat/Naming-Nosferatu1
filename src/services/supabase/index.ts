/**
 * @module supabase
 * @description Canonical entry point for Supabase client, runtime, and API.
 * All imports from Supabase services should go through this file.
 */

// Export Supabase runtime and client initialization
export * from "./runtime";

// Export Supabase API functions
export * from "./api";

// Re-export types from the generated Supabase types
export type { Database } from "../../@db";
