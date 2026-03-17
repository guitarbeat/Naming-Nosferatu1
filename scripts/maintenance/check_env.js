const supabaseUrl = process.env.VITE_SUPABASE_URL;
const hasSupabaseAnonKey = Boolean(process.env.VITE_SUPABASE_ANON_KEY);

console.log("VITE_SUPABASE_URL:", supabaseUrl);
console.log("VITE_SUPABASE_ANON_KEY is set:", hasSupabaseAnonKey);
