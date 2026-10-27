import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv, type ConfigEnv } from "vite";

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

export default defineConfig((env) => {
  loadLocalEnv(env);
  const { command } = env;

  return {
    server: {
      host: true,
      port: 8080,
    },
    resolve: {
      tsconfigPaths: true,
      alias: { "@": `${process.cwd()}/src` },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    plugins: [
      tailwindcss(),
      tanstackStart({
        importProtection: {
          behavior: "error",
          client: {
            files: ["**/server/**"],
            specifiers: ["server-only"],
          },
        },
        server: { entry: "server" },
      }),
      command === "build" &&
        nitro({
          // Node is the fallback. Vercel, Netlify, and Cloudflare still
          // auto-detect when their build environment is present.
          defaultPreset: "node-server",
        }),
      viteReact(),
    ],
  };
});
