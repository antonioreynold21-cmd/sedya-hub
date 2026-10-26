import { calculateItemTotal } from './sales';
export type GroupableItem = { outlet_name?: string|null; section_name?: string|null; section_rank?: number|null; position?: number|null; qty: number|string; price: number|string; discount_type: string; discount_value: number|string };
export type ItemSection<T> = { name: string; rank: number; items: { item: T; no: number }[]; subtotal: number };
export type ItemGroups<T> = { legacy: true } | { legacy: false; outlets: { outlet: string|null; sections: ItemSection<T>[] }[] };
export function groupOrderItems<T extends GroupableItem>(items: T[]): ItemGroups<T> {
  if (!items.some(i => i.outlet_name || i.section_name)) return { legacy: true };
  const sorted = items.map((it, idx) => ({ it, pos: it.position ?? idx })).sort((a, b) => a.pos - b.pos);
  const outlets = new Map<string, { outlet: string|null; minPos: number; secs: Map<string, { name: string; rank: number; minPos: number; rows: T[] }> }>();
  for (const { it, pos } of sorted) {
    const ok = it.outlet_name ?? '\u0000';
    let o = outlets.get(ok);
    if (!o) { o = { outlet: it.outlet_name ?? null, minPos: pos, secs: new Map() }; outlets.set(ok, o); }
    const name = it.section_name?.trim() || 'Others';
    const rank = it.section_name?.trim() ? (it.section_rank ?? 3) : 3;
    const sk = name.toLowerCase();
    let s = o.secs.get(sk);
    if (!s) { s = { name, rank, minPos: pos, rows: [] }; o.secs.set(sk, s); }
    s.rows.push(it);
  }
  let no = 0;
  return { legacy: false, outlets: [...outlets.values()].sort((a, b) => a.minPos - b.minPos).map(o => ({
    outlet: o.outlet,
    sections: [...o.secs.values()].filter(s => s.rows.length).sort((a, b) => a.rank - b.rank || a.minPos - b.minPos).map(s => ({
      name: s.name, rank: s.rank, items: s.rows.map(item => ({ item, no: ++no })), subtotal: s.rows.reduce((t, i) => t + calculateItemTotal(i), 0),
    })),
  })) };
}
