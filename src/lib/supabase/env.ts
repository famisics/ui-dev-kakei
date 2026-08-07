function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`環境変数 ${name} が設定されていません`);
  }
  return value;
}

export function getSupabaseUrl(): string {
  return getEnv("NEXT_PUBLIC_SUPABASE_URL");
}

export function getSupabasePublishableKey(): string {
  return getEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
}
