import { strict as assert } from "node:assert";

import { healthResponse } from "./health";
import { collectPublicOrigins, isAllowedCsrfOrigin } from "./public-origin";
import { assertSameSupabaseProject, missingEnv, requireEnv } from "./supabase-env";

assert.deepEqual(missingEnv({}, ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"]), [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
]);
assert.throws(
  () => requireEnv({}, ["SUPABASE_URL"], "server runtime"),
  /Missing server runtime environment variable\(s\): SUPABASE_URL\./,
);
assert.throws(
  () =>
    assertSameSupabaseProject({
      VITE_SUPABASE_URL: "https://one.supabase.co",
      SUPABASE_URL: "https://two.supabase.co",
    }),
  /same Supabase project/,
);
assert.throws(
  () => assertSameSupabaseProject({ VITE_SUPABASE_PUBLISHABLE_KEY: "sb_secret_example" }),
  /publishable key/,
);
assert.doesNotThrow(() =>
  assertSameSupabaseProject({
    VITE_SUPABASE_URL: "https://one.supabase.co",
    SUPABASE_URL: "https://one.supabase.co",
    VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
  }),
);

assert.deepEqual(
  collectPublicOrigins({
    APP_URL: "https://hub.example.com/app",
    RAILWAY_PUBLIC_DOMAIN: "app.up.railway.app",
  }),
  ["https://hub.example.com", "https://app.up.railway.app"],
);
assert.throws(() => collectPublicOrigins({ APP_URL: "http://hub.example.com" }), /https origin/);
assert.equal(
  isAllowedCsrfOrigin("https://hub.example.com", "http://0.0.0.0:8080", [
    "https://hub.example.com",
  ]),
  true,
);
assert.equal(
  isAllowedCsrfOrigin("https://evil.example", "http://127.0.0.1:3000", ["https://hub.example.com"]),
  false,
);
assert.equal(isAllowedCsrfOrigin("http://localhost:8080", "http://localhost:8080", []), true);

const health = healthResponse();
assert.equal(health.status, 200);
assert.equal(health.headers.get("cache-control"), "no-store");
assert.deepEqual(await health.json(), { status: "ok" });

console.log("PASS: env boundary, public origin, and health response");
