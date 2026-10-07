import { Button } from '@/components/ui/button';
export function QueryState({ loading, error, retry }: { loading?: boolean; error?: boolean; retry?: () => void }) {
  if (error) return <div role="alert" className="space-y-3 py-6"><p className="text-sm text-destructive">Data gagal dimuat.</p><Button variant="outline" onClick={retry}>Coba lagi</Button></div>;
  if (loading) return <p role="status" className="py-6 text-sm text-muted-foreground">Memuat data…</p>;
  return null;
}
