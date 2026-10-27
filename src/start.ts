import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { collectPublicOrigins, isAllowedCsrfOrigin } from "./lib/public-origin";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
  // Sec-Fetch-Site still has to be same-origin. This only widens the Origin
  // fallback to the deployment's own public origins, not to a forwarded host.
  origin: (origin, ctx) =>
    isAllowedCsrfOrigin(
      origin,
      new URL(ctx.request.url).origin,
      collectPublicOrigins({
        APP_URL: process.env["APP_URL"],
        RAILWAY_PUBLIC_DOMAIN: process.env["RAILWAY_PUBLIC_DOMAIN"],
      }),
    ),
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));
