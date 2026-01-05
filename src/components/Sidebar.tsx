import { Link } from "react-router-dom";
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  Trophy,
  Target,
  Calendar,
  BookOpen,
  MessageSquare,
  Award,
  TrendingUp,
  Bell,
  Sparkles,
  UserCircle,
  Settings,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  currentPath: string;
}

const mainNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Discussions", url: "/discussions", icon: MessageSquare },
  { title: "Achievements", url: "/achievements", icon: Trophy },
  { title: "Goals", url: "/goals", icon: Target },
  { title: "Meetings", url: "/meetings", icon: Calendar },
];

const communityItems = [
  { title: "Members", url: "/members", icon: Users },
  { title: "Masterminds", url: "/masterminds", icon: UsersRound },
  { title: "Messages", url: "/messages", icon: MessageSquare },
];

const growthItems = [
  { title: "Learning Hub", url: "/learn", icon: BookOpen },
  { title: "Leaderboard", url: "/leaderboard", icon: TrendingUp },
  { title: "Badges", url: "/badges", icon: Award },
];

export const Sidebar = ({ currentPath }: SidebarProps) => {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const NavItem = ({ item }: { item: { title: string; url: string; icon: any } }) => {
    const isActive = currentPath === item.url;
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild>
          <Link
            to={item.url}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span>{item.title}</span>}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <ShadcnSidebar 
      className={cn(
        "border-r border-border bg-card transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
      collapsible="icon"
    >
      <SidebarHeader className="p-4 border-b border-border">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-gold flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-lg bg-gradient-gold bg-clip-text text-transparent">
                Top 1% Club
              </span>
              <span className="text-xs text-muted-foreground">Elite Network</span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="py-4">
        <SidebarGroup>
          {!isCollapsed && <SidebarGroupLabel className="px-4 text-xs text-muted-foreground uppercase tracking-wider">Main</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu className="px-2 space-y-1">
              {mainNavItems.map((item) => (
                <NavItem key={item.url} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-6">
          {!isCollapsed && <SidebarGroupLabel className="px-4 text-xs text-muted-foreground uppercase tracking-wider">Community</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu className="px-2 space-y-1">
              {communityItems.map((item) => (
                <NavItem key={item.url} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-6">
          {!isCollapsed && <SidebarGroupLabel className="px-4 text-xs text-muted-foreground uppercase tracking-wider">Growth</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu className="px-2 space-y-1">
              {growthItems.map((item) => (
                <NavItem key={item.url} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-border">
        <SidebarMenu className="space-y-1">
          <NavItem item={{ title: "Profile", url: "/profile", icon: UserCircle }} />
          <NavItem item={{ title: "Notifications", url: "/notifications", icon: Bell }} />
        </SidebarMenu>
      </SidebarFooter>
    </ShadcnSidebar>
  );
};
