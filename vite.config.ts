// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart (with the server-only import guard),
//     viteReact, tailwindcss, vite-tsconfig-paths, nitro (build-only, pinned to the layout
//     Lovable deploys from dist/), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, nitro: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv, type ConfigEnv, type Plugin } from "vite";

import { assertSameSupabaseProject, browserSupabaseEnv, requireEnv } from "./src/lib/supabase-env";

const serverRuntimeEnv = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

function loadLocalEnv({ command, mode }: ConfigEnv) {
  const fileEnv = loadEnv(mode, process.cwd(), "");
  const source = { ...fileEnv, ...process.env };
  requireEnv(source, browserSupabaseEnv, command === "build" ? "browser build" : "browser");
  assertSameSupabaseProject(source);
  // Local .env is not injected into the production process. Copy only named server
  // variables for `vite dev`; never place them in Vite `define`.
  if (command === "serve") {
    for (const key of serverRuntimeEnv) {
      if (process.env[key] === undefined && fileEnv[key]) process.env[key] = fileEnv[key];
    }
  }
}

// Runs the project's own Supabase environment guard on every `vite dev` / `vite build`,
// before the bundler starts, so a mismatched or missing key fails fast.
const supabaseEnvGuard: Plugin = {
  name: "sedyain-supabase-env-guard",
  config(_config, env) {
    loadLocalEnv(env);
  },
};

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  nitro: {
    // Node is the fallback for self-hosted builds (`npm start`). Inside a Lovable build
    // the platform pins its own Cloudflare preset and dist/ output layout, so this only
    // applies outside it.
    preset: "node-server",
  },
  plugins: [supabaseEnvGuard],
});
