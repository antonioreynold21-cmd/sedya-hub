import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantQuery } from '@/hooks/use-tenant-query';
import { tenantClient } from '@/lib/tenant-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from 'sonner';

type Shipment = { id: string; stored_by_member_id?: string | null; delivery_by_member_id?: string | null };
export function ShipmentTeamDialog({ shipment, onClose }: { shipment: Shipment; onClose: () => void }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [stored, setStored] = useState(shipment.stored_by_member_id ?? 'none');
  const [delivery, setDelivery] = useState(shipment.delivery_by_member_id ?? 'none');
  const team = useTenantQuery({ throwOnError: false, queryKey: ['shipment-team-options'], queryFn: async () => {
    const { data, error } = await tenantClient.rpc('shipment_team_options');
    if (error) throw error;
    return data;
  }});
  const save = useMutation({ mutationFn: async () => {
    const { error } = await tenantClient.rpc('assign_shipment_team', { p_shipment_id: shipment.id, p_stored_by: stored === 'none' ? null as unknown as string : stored, p_delivery_by: delivery === 'none' ? null as unknown as string : delivery });
    if (error) throw error;
  }, onSuccess: async () => { await qc.invalidateQueries(); toast.success('Penugasan tim disimpan'); onClose(); }, onError: (error: Error) => toast.error(error.message) });
  return <Dialog open onOpenChange={open => { if (!open && !save.isPending) onClose(); }}><DialogContent><DialogHeader><DialogTitle>Assign tim</DialogTitle></DialogHeader>
    {team.isError ? <div role="alert">Daftar tim gagal dimuat. <Button variant="outline" onClick={() => team.refetch()}>Coba lagi</Button></div> : team.isPending ? <p>Memuat anggota tim…</p> : <>
      <Input aria-label="Cari anggota tim" placeholder="Cari anggota tim" value={search} onChange={e => setSearch(e.target.value)} />
      {([{label:'Stored By', value:stored, change:setStored}, {label:'Delivery By', value:delivery, change:setDelivery}]).map(field => <div key={field.label} className="grid gap-2"><Label>{field.label}</Label><Select value={field.value} onValueChange={field.change}><SelectTrigger aria-label={field.label}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Kosongkan</SelectItem>{team.data?.filter(member => member.id === field.value || member.name.toLowerCase().includes(search.toLowerCase())).map(member => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}{field.value !== 'none' && !team.data?.some(member => member.id === field.value) && <SelectItem value={field.value} disabled>Anggota tidak aktif</SelectItem>}</SelectContent></Select></div>)}
    </>}
    <DialogFooter><Button variant="outline" disabled={save.isPending} onClick={onClose}>Batal</Button><Button disabled={team.isPending || team.isError || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Menyimpan…' : 'Simpan'}</Button></DialogFooter>
  </DialogContent></Dialog>;
}