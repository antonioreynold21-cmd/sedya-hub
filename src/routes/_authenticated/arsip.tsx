import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useMutation,useQueryClient } from '@tanstack/react-query';
import { useTenantQuery } from '@/hooks/use-tenant-query';
import { useAccess } from '@/hooks/use-access';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table,TableHeader,TableHead,TableRow,TableBody,TableCell } from '@/components/ui/table';
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
export const Route=createFileRoute('/_authenticated/arsip')({head:()=>({meta:[{title:'Arsip — Sedyain Hub'},{name:'description',content:'Data bisnis yang diarsipkan dan pemulihan oleh Master.'},{property:'og:title',content:'Arsip — Sedyain Hub'},{property:'og:description',content:'Pemulihan data bisnis tenant.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'},{name:'robots',content:'noindex'}]}),component:ArchivePage});
type Row={entity_type:string;id:string;label:string;deleted_at:string;reason:string};
const labels:Record<string,string>={clients:'Client',orders:'Order',order_items:'Item order',shipments:'Pengiriman',pricelist_items:'Pricelist',payables:'Utang',receivables:'Piutang',cash_requests:'Request kas',expenses:'Pengeluaran',tasks:'Task',team_members:'Tim'};
function ArchivePage(){
 const {isMaster}=useAccess();const qc=useQueryClient();const [selected,setSelected]=useState<Row|null>(null);const [reason,setReason]=useState('');
 const {data:rows=[],isPending}=useTenantQuery({queryKey:['archive'],enabled:isMaster,queryFn:async()=>{const {data,error}=await supabase.rpc('list_archive');if(error)throw error;return data as unknown as Row[];}});
 const restore=useMutation({mutationFn:async()=>{if(!selected)return;const {error}=await supabase.rpc('restore_entity',{p_entity_type:selected.entity_type,p_entity_id:selected.id,p_reason:reason});if(error)throw error;},onSuccess:()=>{qc.invalidateQueries();toast.success('Data dipulihkan');setSelected(null);setReason('');},onError:(e:Error)=>toast.error(e.message)});
 if(!isMaster)return <p>Khusus akun Master.</p>;
 return <div><PageHeader title="Arsip"/><Table><TableHeader><TableRow><TableHead>Modul</TableHead><TableHead>Data</TableHead><TableHead>Alasan</TableHead><TableHead>Diarsipkan</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader><TableBody>{rows.map(r=><TableRow key={r.id}><TableCell>{labels[r.entity_type]}</TableCell><TableCell>{r.label}</TableCell><TableCell>{r.reason}</TableCell><TableCell>{new Date(r.deleted_at).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric',timeZone:'Asia/Jakarta'})}</TableCell><TableCell><Button variant="outline" onClick={()=>{setSelected(r);setReason('');}}>Pulihkan</Button></TableCell></TableRow>)}{!rows.length&&<TableRow><TableCell colSpan={5}>{isPending?'Memuat…':'Arsip kosong.'}</TableCell></TableRow>}</TableBody></Table><Dialog open={Boolean(selected)} onOpenChange={v=>{if(!v&&!restore.isPending)setSelected(null);}}><DialogContent><DialogHeader><DialogTitle>Pulihkan {selected?.label}</DialogTitle></DialogHeader><Input aria-label="Alasan pemulihan" placeholder="Alasan pemulihan wajib" value={reason} onChange={e=>setReason(e.target.value)}/><DialogFooter><Button variant="outline" onClick={()=>setSelected(null)}>Batal</Button><Button disabled={!reason.trim()||restore.isPending} onClick={()=>restore.mutate()}>Pulihkan</Button></DialogFooter></DialogContent></Dialog></div>;
}
