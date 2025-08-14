import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage, // Explicitly use localStorage
    storageKey: "supabase.auth.token", // Custom storage key
    debug: true, // Enable debug mode
  },
});

// Debug storage
console.log("🔧 Supabase client initialized:", {
  url: supabaseUrl,
  hasAnonKey: !!supabaseAnonKey,
  localStorage: !!window.localStorage,
  existingToken: window.localStorage.getItem("supabase.auth.token"),
});
