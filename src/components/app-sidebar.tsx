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
  { title: "Order & Dokumen", url: "/orders", icon: FileText, module: "orders" },
  { title: "Pengiriman", url: "/shipments", icon: Truck, module: "shipments" },
  { title: "Pricelist", url: "/pricelist", icon: Tags, module: "pricelist" },
  { title: "Workflow Tim", url: "/workflow", icon: KanbanSquare, module: "workflow" },
  { title: "Team", url: "/team", icon: UsersRound, module: "team" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const { can, isMaster } = useAccess();

  const visible = items.filter((i) => can(i.module));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Leaf className="size-5" />
          </span>
          {!collapsed && (
            <div className="leading-tight">
              <p className="text-sm font-semibold text-sidebar-foreground">Sedyain Indonesia</p>
              <p className="text-xs text-sidebar-foreground/70">
                {isMaster ? "Akun Master" : "Internal Operations"}
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
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
