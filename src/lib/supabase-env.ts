export const browserSupabaseEnv = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"] as const;
export const serverSupabaseEnv = ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"] as const;
export const adminSupabaseEnv = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const;

type EnvSource = Record<string, string | undefined>;

export function missingEnv(source: EnvSource, keys: readonly string[]): string[] {
  return keys.filter((key) => !source[key]?.trim());
}

export function requireEnv<const K extends readonly string[]>(
  source: EnvSource,
  keys: K,
  scope: string,
): { [P in K[number]]: string } {
  const missing = missingEnv(source, keys);
  if (missing.length > 0) {
    throw new Error(`Missing ${scope} environment variable(s): ${missing.join(", ")}.`);
  }
  const result = {} as { [P in K[number]]: string };
  for (const key of keys) {
    const value = source[key]?.trim();
    if (!value) throw new Error(`Missing ${scope} environment variable(s): ${key}.`);
    result[key as K[number]] = value;
  }
  return result;
}

export function assertPublishableKey(key: string): void {
  if (key.startsWith("sb_secret_")) {
    throw new Error("VITE_SUPABASE_PUBLISHABLE_KEY must be the publishable key, not a secret key.");
  }
}

export function assertSameSupabaseProject(source: EnvSource): void {
  const browserUrl = source["VITE_SUPABASE_URL"]?.trim();
  const serverUrl = source["SUPABASE_URL"]?.trim();
  if (browserUrl && serverUrl && browserUrl !== serverUrl) {
    throw new Error("SUPABASE_URL and VITE_SUPABASE_URL must point at the same Supabase project.");
  }
  const browserKey = source["VITE_SUPABASE_PUBLISHABLE_KEY"]?.trim();
  const serverKey = source["SUPABASE_PUBLISHABLE_KEY"]?.trim();
  if (browserKey && serverKey && browserKey !== serverKey) {
    throw new Error(
      "SUPABASE_PUBLISHABLE_KEY and VITE_SUPABASE_PUBLISHABLE_KEY must be the same publishable key.",
    );
  }
  if (browserKey) assertPublishableKey(browserKey);
}
