import { createContext,useContext,useState,type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/components/tenant-provider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter } from '@/components/ui/dialog';
import type { BusinessTable } from '@/lib/tenant-client';
type Request = { table: BusinessTable; id: string; resolve: (value: string) => void; reject: (error: Error) => void };
const Context=createContext<((table:BusinessTable,id:string)=>Promise<string>)|null>(null);
export function useArchive() {const value=useContext(Context); if(!value) throw new Error('Arsip belum tersedia');return value;}
export function ArchiveProvider({children}:{children:ReactNode}) {
 const {access}=useTenant();const qc=useQueryClient();const [request,setRequest]=useState<Request|null>(null);const [reason,setReason]=useState('');const [busy,setBusy]=useState(false);
 const master=access?.role==='master';
 function close(){ if(busy)return;request?.resolve('cancelled');setRequest(null);setReason('');}
 async function submit(){if(!request||!reason.trim())return;setBusy(true);try{const {data,error}=await supabase.rpc('archive_entity',{p_entity_type:request.table,p_entity_id:request.id,p_reason:reason.trim()});if(error)throw error; await qc.invalidateQueries();toast.success(data==='pending'?'Permintaan dikirim ke Master':'Data dipindahkan ke Arsip');request.resolve(data);setRequest(null);setReason('');}catch(error){toast.error(error instanceof Error?error.message:'Gagal mengarsipkan');}finally{setBusy(false);}}
 return <Context.Provider value={(table,id)=>new Promise((resolve,reject)=>{setReason('');setRequest({table,id,resolve,reject});})}>{children}<Dialog open={Boolean(request)} onOpenChange={v=>{if(!v)close();}}><DialogContent><DialogHeader><DialogTitle>{master?'Konfirmasi pengarsipan':'Ajukan pengarsipan'}</DialogTitle><DialogDescription>{master?'Data dapat dipulihkan dari Arsip.':'Data tetap aktif sampai Master menyetujui.'}</DialogDescription></DialogHeader><Label htmlFor="archive-reason">Alasan wajib</Label><Textarea id="archive-reason" value={reason} onChange={e=>setReason(e.target.value)}/><DialogFooter><Button variant="outline" disabled={busy} onClick={close}>Batal</Button><Button disabled={busy||!reason.trim()} onClick={submit}>{busy?'Memproses…':master?'Arsipkan':'Kirim permintaan'}</Button></DialogFooter></DialogContent></Dialog></Context.Provider>;
}
