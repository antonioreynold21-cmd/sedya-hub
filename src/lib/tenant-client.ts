import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type BusinessTable = 'clients' | 'orders' | 'order_items' | 'shipments' | 'pricelist_items' | 'payables' | 'receivables' | 'cash_requests' | 'expenses' | 'tasks' | 'team_members' | 'quotations' | 'quotation_items';
const business = new Set<string>(['clients','orders','order_items','shipments','pricelist_items','payables','receivables','cash_requests','expenses','tasks','team_members']);
// Context is used only for filters; the database validates the active membership independently.
let activeTenant: string | null = null;
export function setTenantContext(id: string | null) { activeTenant = id; }
export function tenantContext() { return activeTenant; }
export const tenantClient = {
  rpc: supabase.rpc.bind(supabase),
  from<T extends BusinessTable>(table: T) {
    const builder = supabase.from(table);

    const tenant = activeTenant;
    if (!tenant) throw new Error('Akun belum mempunyai akses bisnis');
    return new Proxy(builder, {
      get(target, key) {
        if (key === 'select') return (...args: Parameters<typeof builder.select>) => target.select(...args).eq('tenant_id' as never, tenant as never).is('deleted_at' as never, null);
        if (key === 'update') return (...args: Parameters<typeof builder.update>) => target.update(...args).eq('tenant_id' as never, tenant as never).is('deleted_at' as never, null);
        if (key === 'insert') return (values: unknown, options?: unknown) => {
          const map = (row: unknown) => ({ ...(row as object), tenant_id: tenant });
          return target.insert((Array.isArray(values) ? values.map(map) : map(values)) as Parameters<typeof builder.insert>[0], options as Parameters<typeof builder.insert>[1]);
        };
        if (key === 'delete') return () => { throw new Error('Gunakan Arsip dan Persetujuan'); };
        const value = Reflect.get(target, key);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    }) as Omit<typeof builder, 'insert'> & {
      insert: (values: Omit<Database['public']['Tables'][T]['Insert'], 'tenant_id'> | Omit<Database['public']['Tables'][T]['Insert'], 'tenant_id'>[], options?: Parameters<typeof builder.insert>[1]) => ReturnType<typeof builder.insert>;
    };
  },
};
