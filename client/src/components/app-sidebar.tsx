import { LayoutDashboard, Shield, Bus, Users, DollarSign, History, QrCode, LogOut, Settings, FileBarChart } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Tableau de bord", url: "/", icon: LayoutDashboard },
  { title: "Assurances", url: "/insurances", icon: Shield },
  { title: "Compagnies Transport", url: "/transport", icon: Bus },
  { title: "Passagers", url: "/passengers", icon: Users },
  { title: "Revenus", url: "/revenue", icon: DollarSign },
  { title: "Rapports", url: "/reports", icon: FileBarChart },
  { title: "Historique", url: "/logs", icon: History },
  { title: "Parametres", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-3" data-testid="link-sidebar-logo">
          <img src="/logo.jpeg" alt="SecureFlow Logo" className="w-9 h-9 rounded-md object-contain" />
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight">SecureFlow</span>
            <span className="text-[11px] text-muted-foreground leading-none">Super Admin</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.url || (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url} data-testid={`link-nav-${item.url.replace("/", "") || "dashboard"}`}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <QrCode className="w-3 h-3" />
          <span>Connecte: {user?.fullName}</span>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={logout} data-testid="button-logout">
          <LogOut className="w-3 h-3 mr-2" />
          Se deconnecter
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
