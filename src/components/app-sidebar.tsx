import { useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/components/tenant-provider";
import { useTenantQuery } from "@/hooks/use-tenant-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Wallet,
  KanbanSquare,
  UsersRound,
  Leaf,
  FileText,
  Truck,
  Tags,
  ShieldCheck,
  Building2,
  Archive,
  ClipboardCheck,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAccess } from "@/hooks/use-access";
import type { ModuleKey } from "@/lib/access";

const items: { title: string; url: string; icon: typeof Users; module: ModuleKey }[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, module: "dashboard" },
  { title: "CRM", url: "/crm", icon: Users, module: "crm" },
  { title: "Client", url: "/client", icon: Building2, module: "crm" },
  { title: "Finance", url: "/finance", icon: Wallet, module: "finance" },
  { title: "Penawaran", url: "/penawaran", icon: FileText, module: "quotations" },
  { title: "Order & Dokumen", url: "/orders", icon: FileText, module: "orders" },
  { title: "Pengiriman", url: "/shipments", icon: Truck, module: "shipments" },
  { title: "Pricelist", url: "/pricelist", icon: Tags, module: "pricelist" },
  { title: "Workflow Tim", url: "/workflow", icon: KanbanSquare, module: "workflow" },
  { title: "Team", url: "/team", icon: UsersRound, module: "team" },
];

export function AppSidebar() {
  const qc=useQueryClient();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const { can, isMaster } = useAccess();

  const {tenant,tenantId,access,switchTenant}=useTenant();
  const {data:pending=0}=useTenantQuery({queryKey:['approval-count'],enabled:isMaster,queryFn:async()=>{const {count,error}=await supabase.from('approval_requests').select('id',{count:'exact',head:true}).eq('tenant_id',tenantId??'').eq('status','pending');if(error)throw error;return count??0;}});
  const {data:notifications=[]}=useTenantQuery({queryKey:['notifications'],queryFn:async()=>{const {data,error}=await supabase.from('notifications').select('*').eq('tenant_id',tenantId??'').is('read_at',null).order('created_at',{ascending:false});if(error)throw error;return data;}});
  const visible = items.filter((i) => can(i.module));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            {tenant?.settings.logo_url ? <img src={tenant.settings.logo_url} alt={tenant.name} className="size-8 object-contain"/> : <Leaf className="size-5" />}
          </span>
          {!collapsed && (
            <div className="leading-tight">
              <p className="text-sm font-semibold text-sidebar-foreground">{tenant?.name}</p>
              <p className="text-xs text-sidebar-foreground/70">
                {isMaster ? "Akun Master" : "Internal Operations"}
              </p>
            </div>
          )}
        </div>
        {!collapsed && (access?.tenants.length ?? 0)>1 && <Select value={tenantId??''} onValueChange={id=>{switchTenant(id).catch(e=>toast.error(e.message));}}><SelectTrigger aria-label="Pilih bisnis"><SelectValue/></SelectTrigger><SelectContent>{access?.tenants.map(t=><SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select>}
      </SidebarHeader>
      <SidebarContent>
        {!collapsed&&notifications.length>0&&<SidebarGroup><SidebarGroupLabel>Notifikasi</SidebarGroupLabel>{notifications.map(n=><div key={n.id} className="px-2 py-2 text-xs text-sidebar-foreground"><p>{n.message}</p><SidebarMenuButton onClick={async()=>{const {error}=await supabase.from('notifications').update({read_at:new Date().toISOString()}).eq('id',n.id);if(error)toast.error(error.message);else await qc.invalidateQueries();}}>Tandai dibaca</SidebarMenuButton></div>)}</SidebarGroup>}
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visible.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={currentPath === item.url} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isMaster && (
          <SidebarGroup>
            <SidebarGroupLabel>Administrasi</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem><SidebarMenuButton asChild isActive={currentPath==='/arsip'} tooltip="Arsip"><Link to="/arsip"><Archive className="size-4"/><span>Arsip</span></Link></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton asChild isActive={currentPath==='/persetujuan'} tooltip="Persetujuan"><Link to="/persetujuan"><ClipboardCheck className="size-4"/><span>Persetujuan</span>{pending>0&&<span className="ml-auto rounded bg-sidebar-primary px-1.5 text-xs text-sidebar-primary-foreground">{pending}</span>}</Link></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={currentPath === "/akses"}
                    tooltip="Kelola Akses Tim"
                  >
                    <Link to="/akses" className="flex items-center gap-2">
                      <ShieldCheck className="size-4" />
                      <span>Kelola Akses Tim</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
