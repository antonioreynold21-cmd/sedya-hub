import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { setTenantContext } from '@/lib/tenant-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { ModuleKey } from '@/lib/access';
export type TenantSettings = { ppn_rate?: number; discount_approval_threshold_pct?: number; doc_numbering?: Record<string,string>; name?: string; logo_url?: string | null; primary_color?: string; address?: string; contact?: {wa?: string;ig?: string;email?: string}; bank?: {name?: string;account?: string;holder?: string} };
export type Tenant = { id: string; name: string; slug: string; is_demo: boolean; settings: TenantSettings };
type Access = { user_id: string; tenant_id: string | null; role: 'master'|'staff'; modules: ModuleKey[]; tenants: Tenant[] };
type Value = { tenantId: string|null; tenant: Tenant | undefined; access?: Access; switching: boolean; switchTenant: (id: string) => Promise<void> };
const Context = createContext<Value | null>(null);
export function useTenant() { const value = useContext(Context); if (!value) throw new Error('Konteks bisnis belum tersedia'); return value; }
export function TenantProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [switching,setSwitching] = useState(false);
  const query = useQuery({ queryKey: ['tenant-bootstrap'], staleTime: 30_000, queryFn: async () => {
    const { data,error } = await supabase.rpc('bootstrap_current_user');
    if (error) throw error;
    const access = data as unknown as Access;
    setTenantContext(access.tenant_id);
    return access;
  }});
  const tenant = query.data?.tenants.find(t=>t.id===query.data?.tenant_id);
  useEffect(()=> {
    const color=tenant?.settings.primary_color;
    if (color && /^#[0-9a-f]{6}$/i.test(color)) document.documentElement.style.setProperty('--primary',color);
    return ()=>{document.documentElement.style.removeProperty('--primary');};
  },[tenant?.settings.primary_color]);
  useEffect(()=>{
    const {data:{subscription}}=supabase.auth.onAuthStateChange(event=>{
      if(event==='SIGNED_OUT') { setTenantContext(null); qc.clear(); }
      else if(event==='SIGNED_IN'||event==='USER_UPDATED') qc.invalidateQueries({queryKey:['tenant-bootstrap']});
    });
    return ()=>subscription.unsubscribe();
  },[qc]);
  async function switchTenant(id:string) {
    setSwitching(true);
    try {
      await qc.cancelQueries();
      const {error}=await supabase.rpc('select_active_tenant',{p_tenant_id:id});
      if(error) throw error;
      setTenantContext(null); qc.clear();
      await qc.fetchQuery({queryKey:['tenant-bootstrap'],queryFn:async()=>{
        const {data,error}=await supabase.rpc('bootstrap_current_user'); if(error) throw error;
        const result=data as unknown as Access; setTenantContext(result.tenant_id); return result;
      }});
    } finally {setSwitching(false);}
  }
  if(query.isError) return <div role="alert" className="p-6"><p>Gagal memeriksa akses bisnis.</p><Button onClick={()=>query.refetch()}>Coba lagi</Button></div>;
  if(query.isPending || switching) return <p role="status" className="p-6 text-sm text-muted-foreground">Memeriksa akses bisnis…</p>;
  if(!query.data.tenant_id) return <div className="mx-auto max-w-md space-y-4 p-6"><h1 className="text-xl font-semibold">Belum ada akses bisnis</h1><p className="text-sm text-muted-foreground">Hubungi Master bisnis untuk mendapatkan undangan, lalu tempel tautan undangan di bawah.</p><form className="flex gap-2" onSubmit={async e=>{e.preventDefault();const raw=String(new FormData(e.currentTarget).get('link')||'').trim();let tok=raw;try{tok=new URL(raw).searchParams.get('invite')||raw;}catch{/* token mentah */}const {error}=await supabase.rpc('accept_tenant_invitation',{p_token:tok});if(error){toast.error(error.message);return;}toast.success('Undangan diterima');qc.invalidateQueries({queryKey:['tenant-bootstrap']});}}><Input name="link" placeholder="Tautan undangan" aria-label="Tautan undangan" required/><Button type="submit">Terima</Button></form><Button variant="outline" onClick={async()=>{await supabase.auth.signOut();qc.clear();window.location.href='/auth';}}>Keluar</Button></div>;
  return <Context.Provider value={{tenantId:query.data.tenant_id,tenant,access:query.data,switching,switchTenant}}>{children}</Context.Provider>;
}
