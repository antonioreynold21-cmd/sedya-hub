const hostnamePattern =
  /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i;

export type PublicOriginEnv = {
  APP_URL?: string | undefined;
  RAILWAY_PUBLIC_DOMAIN?: string | undefined;
};

/** Origins the browser can actually use. Railway injects RAILWAY_PUBLIC_DOMAIN; APP_URL covers a custom domain. */
export function collectPublicOrigins(env: PublicOriginEnv): string[] {
  const origins: string[] = [];
  const appUrl = env.APP_URL?.trim();
  if (appUrl) {
    let url: URL;
    try {
      url = new URL(appUrl);
    } catch {
      throw new Error("APP_URL is not a valid absolute URL.");
    }
    if (url.username || url.password) throw new Error("APP_URL must not include credentials.");
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) {
      throw new Error("APP_URL must be an https origin.");
    }
    origins.push(url.origin);
  }

  const domain = env.RAILWAY_PUBLIC_DOMAIN?.trim();
  if (domain) {
    if (!hostnamePattern.test(domain))
      throw new Error("RAILWAY_PUBLIC_DOMAIN is not a valid hostname.");
    origins.push(`https://${domain}`);
  }
  return origins;
}

export function isAllowedCsrfOrigin(
  origin: string,
  requestOrigin: string,
  allowed: readonly string[],
): boolean {
  return origin === requestOrigin || allowed.includes(origin);
}
