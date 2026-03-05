/**
 * @module supabase
 * @description Canonical entry point for Supabase client, runtime, and API.
 * All imports from Supabase services should go through this file.
 */

// Re-export types from the generated Supabase types
export type { Database } from "../../../supabase/types";

// Export Supabase API functions
export * from "./api";
// Export Supabase runtime and client initialization
export * from "./runtime";
