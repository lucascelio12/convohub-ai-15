import { NavLink, useLocation } from "react-router-dom";
import { 
  MessageSquare, 
  Send, 
  Users, 
  Building2,
  Layers, 
  Smartphone, 
  BarChart3, 
  Settings,
  LogOut,
  User,
  TrendingUp
} from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const menuItems = [
  { title: "Conversas", url: "/conversations", icon: MessageSquare },
  { title: "Filas", url: "/queues", icon: Layers },
  { title: "Chips", url: "/chips", icon: Smartphone },
  { title: "Campanhas", url: "/campaigns", icon: Send },
  { title: "Relatórios", url: "/reports", icon: BarChart3 },
  { title: "Relatórios Avançados", url: "/advanced-reports", icon: TrendingUp },
  { title: "Configurações", url: "/settings", icon: Settings },
];

const adminItems = [
  { title: "Usuários", url: "/users", icon: Users },
  { title: "Empresas", url: "/companies", icon: Building2 },
];

export function AppSidebar() {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const currentPath = location.pathname;
  const collapsed = false; // Simplified for now

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50";

  const handleSignOut = async () => {
    await signOut();
  };

  const canAccess = (item: any) => {
    if (!profile) return false;
    
    // Admin tem acesso a tudo
    if (profile.role === 'admin') return true;
    
    // Manager não pode acessar usuários e configurações
    if (profile.role === 'manager') {
      return !['users', 'settings'].some(restricted => item.url.includes(restricted));
    }
    
    // Agent só pode acessar conversas e relatórios básicos
    if (profile.role === 'agent') {
      return ['conversations', 'reports'].some(allowed => item.url.includes(allowed));
    }
    
    // User padrão tem acesso a funcionalidades básicas
    if (profile.role === 'user') {
      return ['conversations', 'queues', 'chips', 'campaigns', 'reports'].some(allowed => item.url.includes(allowed));
    }
    
    return false;
  };

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"}>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          {!collapsed && (
            <span className="font-semibold text-sidebar-foreground">ChatBot System</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.filter(canAccess).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {profile?.role === 'admin' && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={getNavCls}>
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-2 mb-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile?.name}
              </p>
              <p className="text-xs text-sidebar-foreground/60 capitalize">
                {profile?.role}
              </p>
            </div>
          )}
        </div>
        {!collapsed && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSignOut}
            className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}