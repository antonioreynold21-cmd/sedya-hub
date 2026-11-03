import { createFileRoute } from "@tanstack/react-router";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS = ["ada", "sebagian", "kosong", "belum_dibeli"];
const MAX = 10 * 1024;
type Body = Record<string, unknown>;
type Spec = { fn: string; params: (b: Body) => Record<string, unknown> | string };

const json = (status: number, body: { ok: boolean; message: string; data?: unknown }) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function safeEqual(a: string, b: string) {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let d = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return d === 0;
}
const isInt = (v: unknown) => typeof v === "number" && Number.isSafeInteger(v);
const tenant = (b: Body) => (typeof b.tenant_id === "string" && UUID.test(b.tenant_id) ? null : "tenant_id tidak valid");
const daftar = (b: Body) => (typeof b.daftar_id === "string" && UUID.test(b.daftar_id) ? null : "daftar_id tidak valid");
const withTenant = (fn: string, extra?: (b: Body) => string | null, map?: (b: Body) => Record<string, unknown>): Spec => ({
  fn, params: (b) => tenant(b) ?? extra?.(b) ?? { p_tenant: b.tenant_id, ...(map?.(b) ?? {}) },
});

const ACTIONS: Record<string, Spec> = {
  link_telegram: { fn: "bridge_link_telegram", params: (b) =>
    typeof b.token !== "string" || b.token.length < 20 || b.token.length > 128 ? "token tidak valid"
      : !isInt(b.chat_id) ? "chat_id tidak valid" : { p_token: b.token, p_chat_id: b.chat_id } },
  set_item_status: withTenant("bridge_set_item_status", (b) =>
    !isInt(b.chat_id) ? "chat_id tidak valid"
      : typeof b.item_id !== "string" || !UUID.test(b.item_id) ? "item_id tidak valid"
      : typeof b.status !== "string" || !STATUS.includes(b.status) ? "status tidak valid"
      : b.qty_dibeli != null && (typeof b.qty_dibeli !== "number" || !Number.isFinite(b.qty_dibeli) || b.qty_dibeli < 0) ? "qty_dibeli tidak valid" : null,
    (b) => ({ p_chat_id: b.chat_id, p_item_id: b.item_id, p_status: b.status, p_qty_dibeli: b.qty_dibeli ?? null })),
  list_notifikasi_pic: withTenant("bridge_list_notifikasi_pic"),
  mark_pic_notified: withTenant("bridge_mark_pic_notified", daftar, (b) => ({ p_daftar_id: b.daftar_id })),
  list_ringkasan_kurir: withTenant("bridge_list_ringkasan_kurir"),
  mark_ringkasan_terkirim: withTenant("bridge_mark_ringkasan_terkirim", daftar, (b) => ({ p_daftar_id: b.daftar_id })),
  list_pengingat: withTenant("bridge_list_pengingat"),
};

async function handle(request: Request) {
  const expected = process.env.BRIDGE_SECRET;
  if (!expected) return json(500, { ok: false, message: "Terjadi kesalahan" });
  if (!safeEqual(request.headers.get("x-bridge-secret") ?? "", expected)) return json(401, { ok: false, message: "Tidak berizin" });
  if (Number(request.headers.get("content-length") ?? 0) > MAX) return json(413, { ok: false, message: "Body terlalu besar" });
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX) return json(413, { ok: false, message: "Body terlalu besar" });
  let body: Body;
  try { const p = JSON.parse(raw); if (!p || typeof p !== "object" || Array.isArray(p)) throw 0; body = p; }
  catch { return json(400, { ok: false, message: "Body JSON tidak valid" }); }
  const spec = typeof body.action === "string" ? ACTIONS[body.action] : undefined;
  if (!spec) return json(400, { ok: false, message: "action tidak valid" });
  const params = spec.params(body);
  if (typeof params === "string") return json(400, { ok: false, message: params });
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseAdmin.rpc as any)(spec.fn, params);
    if (error) { console.error("belanja-bridge rpc error", body.action, error.code); return json(500, { ok: false, message: "Terjadi kesalahan" }); }
    if (data && typeof data === "object" && !Array.isArray(data) && typeof data.ok === "boolean")
      return json(200, { ok: data.ok, message: String(data.message ?? ""), data });
    return json(200, { ok: true, message: "OK", data });
  } catch (e) {
    console.error("belanja-bridge failure", body.action, e instanceof Error ? e.name : "unknown");
    return json(500, { ok: false, message: "Terjadi kesalahan" });
  }
}

const notAllowed = () => json(405, { ok: false, message: "Metode tidak diizinkan" });

export const Route = createFileRoute("/api/public/belanja-bridge")({
  server: { handlers: { POST: ({ request }) => handle(request), GET: notAllowed, PUT: notAllowed, PATCH: notAllowed, DELETE: notAllowed } },
});
