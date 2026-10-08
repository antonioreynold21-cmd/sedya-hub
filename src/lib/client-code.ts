export function suggestClientCode(name: string) {
  return name.trim().split(/\s+/)[0]?.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6) ?? '';
}
export function validClientCode(code: string) {
  return /^[A-Z0-9]{1,8}$/.test(code);
}
export function shipmentName(name: string | null | undefined) {
  return !name || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(name) ? '—' : name;
}