import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/features/kakei/db/types";
import { getSupabasePublishableKey, getSupabaseUrl } from "./env";

export function createClient() {
  return createBrowserClient<Database>(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
  );
}
