import { useTenant } from '@/components/tenant-provider';
import { ALWAYS_ALLOWED, type ModuleKey } from '@/lib/access';
export type AccessInfo = { userId: string|null; role: 'master'|'staff'; modules: ModuleKey[] };
export function useAccess() {
 const tenant=useTenant(); const raw=tenant.access;
 const access: AccessInfo|undefined=raw?{userId:raw.user_id,role:raw.role,modules:raw.modules}:undefined;
 const isMaster=access?.role==='master';
 function can(module:ModuleKey) {return Boolean(tenant.tenantId&&access&&(isMaster||ALWAYS_ALLOWED.includes(module)||access.modules.includes(module)));}
 return {access,isMaster,can,isLoading:tenant.switching,isError:false};
}
