import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQuery } from '@/hooks/use-tenant-query';
import { useTenant } from '@/components/tenant-provider';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QueryState } from '@/components/query-state';
import { Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type ClientSettings = Pick<Database['public']['Tables']['clients']['Row'], 'id' | 'name' | 'wajib_no_po' | 'perlu_tukar_faktur' | 'term_jatuh_tempo_hari'>;
type Outlet = Database['public']['Tables']['client_outlets']['Row'];
function friendlyError(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  return code === '23505' ? 'Nama outlet sudah digunakan untuk client ini.' : code === '42501' ? 'Anda tidak berizin mengubah pengaturan ini.' : 'Perubahan gagal disimpan. Periksa isian lalu coba lagi.';
}

export function ClientSettingsDialog({ client, onClose }: { client: ClientSettings; onClose: () => void }) {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  const [po, setPo] = useState(client.wajib_no_po);
  const [exchange, setExchange] = useState(client.perlu_tukar_faktur);
  const [term, setTerm] = useState(client.term_jatuh_tempo_hari?.toString() ?? '');
  const [editor, setEditor] = useState<{ id: string | null; nama: string; alamat: string } | null>(null);
  const [confirm, setConfirm] = useState<Outlet | null>(null);
  const outlets = useTenantQuery({ queryKey: ['client-outlets', client.id], throwOnError: false, queryFn: async () => {
    if (!tenantId) throw new Error('Bisnis belum tersedia');
    const { data, error } = await supabase.from('client_outlets').select('*').eq('tenant_id', tenantId).eq('client_id', client.id).is('deleted_at', null).order('created_at');
    if (error) throw error;
    return data;
  }});
  const settings = useMutation({ mutationFn: async () => {
    if (!tenantId) throw new Error('Bisnis belum tersedia');
    const days = term.trim() === '' ? null : Number(term);
    if (days !== null && (!Number.isInteger(days) || days < 0 || days > 365)) throw new Error('Term harus bilangan bulat 0–365 hari.');
    const { data, error } = await supabase.from('clients').update({ wajib_no_po: po, perlu_tukar_faktur: exchange, term_jatuh_tempo_hari: days }).eq('tenant_id', tenantId).eq('id', client.id).is('deleted_at', null).select('id');
    if (error) throw error;
    if (!data?.length) throw new Error('Anda tidak berizin mengubah pengaturan ini.');
  }, onSuccess: () => { qc.invalidateQueries(); toast.success('Pengaturan client disimpan'); onClose(); }, onError: (e: Error) => toast.error(e.message.startsWith('Term') || e.message.startsWith('Anda') ? e.message : friendlyError(e)) });
  const saveOutlet = useMutation({ mutationFn: async (value: { id: string | null; nama: string; alamat: string }) => {
    if (!tenantId) throw new Error('Bisnis belum tersedia');
    const nama = value.nama.trim();
    if (!nama) throw new Error('Nama outlet wajib diisi.');
    const payload = { nama, alamat: value.alamat.trim() || null };
    const query = value.id ? supabase.from('client_outlets').update(payload).eq('tenant_id', tenantId).eq('id', value.id).eq('client_id', client.id).is('deleted_at', null) : supabase.from('client_outlets').insert({ ...payload, tenant_id: tenantId, client_id: client.id });
    const { data, error } = await query.select('id');
    if (error) throw error;
    if (!data?.length) throw new Error('Anda tidak berizin mengubah outlet.');
  }, onSuccess: () => { qc.invalidateQueries(); setEditor(null); toast.success('Outlet disimpan'); }, onError: (e: Error) => toast.error(e.message.startsWith('Nama') ? e.message : friendlyError(e)) });
  const toggle = useMutation({ mutationFn: async (outlet: Outlet) => {
    if (!tenantId) throw new Error('Bisnis belum tersedia');
    const { data, error } = await supabase.from('client_outlets').update({ aktif: !outlet.aktif }).eq('tenant_id', tenantId).eq('client_id', client.id).eq('id', outlet.id).is('deleted_at', null).select('id');
    if (error) throw error;
    if (!data?.length) throw new Error('Tidak berizin');
  }, onSuccess: () => { qc.invalidateQueries(); setConfirm(null); toast.success('Status outlet diperbarui'); }, onError: (e) => toast.error(friendlyError(e)) });

  return <>
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>Pengaturan Client</DialogTitle><p className="text-sm text-muted-foreground">{client.name}</p></DialogHeader>
        <form className="space-y-4" onSubmit={e => { e.preventDefault(); settings.mutate(); }}>
          <div className="flex min-h-11 items-center justify-between gap-3"><Label htmlFor="client-po">Wajib No. PO Customer</Label><Switch id="client-po" checked={po} onCheckedChange={setPo} className="min-h-11" /></div>
          <div className="flex min-h-11 items-center justify-between gap-3"><Label htmlFor="client-exchange">Perlu tukar faktur</Label><Switch id="client-exchange" checked={exchange} onCheckedChange={setExchange} className="min-h-11" /></div>
          <div className="space-y-1.5"><Label htmlFor="client-term">Term jatuh tempo (hari)</Label><Input id="client-term" type="number" min={0} max={365} step={1} value={term} onChange={e => setTerm(e.target.value)} className="min-h-11" /><p className="text-xs text-muted-foreground">Hanya disimpan, belum dipakai perhitungan</p></div>
          <Button type="submit" disabled={settings.isPending} className="min-h-11 w-full">{settings.isPending ? 'Menyimpan…' : 'Simpan pengaturan'}</Button>
        </form>
        <section className="space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between gap-2"><h2 className="font-semibold">Outlet</h2><Button variant="outline" className="min-h-11" onClick={() => setEditor({ id: null, nama: '', alamat: '' })}><Plus className="size-4" />Tambah outlet</Button></div>
          <p className="text-sm text-muted-foreground">Outlet nonaktif tidak muncul di order baru; riwayat order tetap</p>
          <QueryState loading={outlets.isPending} error={outlets.isError} retry={() => outlets.refetch()} />
          {!outlets.isPending && !outlets.isError && !outlets.data?.length && <p className="text-sm text-muted-foreground">Belum ada outlet.</p>}
          {!outlets.isError && outlets.data?.map(outlet => <div key={outlet.id} className="space-y-2 border-b border-border py-3">
            <div className="flex flex-wrap justify-between gap-2"><p className="min-w-0 break-words font-medium">{outlet.nama}</p><span className="text-sm text-muted-foreground">{outlet.aktif ? 'Aktif' : 'Nonaktif'}</span></div>
            {outlet.alamat && <p className="break-words text-sm text-muted-foreground">{outlet.alamat}</p>}
            <div className="flex flex-wrap gap-2"><Button variant="outline" className="min-h-11" onClick={() => setEditor({ id: outlet.id, nama: outlet.nama, alamat: outlet.alamat ?? '' })}><Pencil className="size-4" />Ubah</Button><Button variant="outline" className="min-h-11" onClick={() => setConfirm(outlet)}>{outlet.aktif ? 'Nonaktifkan' : 'Aktifkan'}</Button></div>
          </div>)}
        </section>
      </DialogContent>
    </Dialog>
    <Dialog open={Boolean(editor)} onOpenChange={open => { if (!open) setEditor(null); }}><DialogContent><DialogHeader><DialogTitle>{editor?.id ? 'Ubah outlet' : 'Tambah outlet'}</DialogTitle></DialogHeader>
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); if (editor) saveOutlet.mutate(editor); }}>
        <div className="space-y-1.5"><Label htmlFor="outlet-name">Nama outlet</Label><Input id="outlet-name" required className="min-h-11" value={editor?.nama ?? ''} onChange={e => setEditor(prev => prev ? { ...prev, nama: e.target.value } : null)} /></div>
        <div className="space-y-1.5"><Label htmlFor="outlet-address">Alamat</Label><Input id="outlet-address" className="min-h-11" value={editor?.alamat ?? ''} onChange={e => setEditor(prev => prev ? { ...prev, alamat: e.target.value } : null)} /></div>
        <Button type="submit" className="min-h-11 w-full" disabled={saveOutlet.isPending}>{saveOutlet.isPending ? 'Menyimpan…' : 'Simpan outlet'}</Button>
      </form>
    </DialogContent></Dialog>
    <Dialog open={Boolean(confirm)} onOpenChange={open => { if (!open) setConfirm(null); }}><DialogContent><DialogHeader><DialogTitle>{confirm?.aktif ? 'Nonaktifkan outlet?' : 'Aktifkan outlet?'}</DialogTitle></DialogHeader><p className="break-words">{confirm?.nama}</p><p className="text-sm text-muted-foreground">Outlet nonaktif tidak muncul di order baru; riwayat order tetap</p><div className="flex justify-end gap-2"><Button variant="outline" className="min-h-11" onClick={() => setConfirm(null)}>Batal</Button><Button className="min-h-11" disabled={toggle.isPending} onClick={() => { if (confirm) toggle.mutate(confirm); }}>Konfirmasi</Button></div></DialogContent></Dialog>
  </>;
}