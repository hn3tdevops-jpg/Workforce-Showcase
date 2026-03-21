import { Building, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function TopNav() {
  const { session, logout, switchBusiness } = useAuth();
  
  const activeBusiness = session?.memberships.find(
    m => m.business_id === session.active_business_id
  );

  return (
    <header className="h-16 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
        
        <div className="h-4 w-px bg-border/50 hidden md:block"></div>
        
        <div className="hidden md:flex items-center gap-2">
          <Building className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Workspace</span>
          <span className="text-sm font-semibold">{activeBusiness?.business_name || "Unknown"}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 h-9 bg-card border-border/50 hover:bg-accent/50 transition-all">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary border border-primary/30">
                {activeBusiness?.business_name?.charAt(0) || "B"}
              </div>
              <span className="truncate max-w-[120px] font-medium hidden sm:inline-block">
                {activeBusiness?.business_name || "Select Business"}
              </span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 border-border/50 shadow-xl shadow-black/20">
            <DropdownMenuLabel className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Switch Business</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/50" />
            {session?.memberships.map((membership) => (
              <DropdownMenuItem 
                key={membership.business_id}
                onClick={() => switchBusiness(membership.business_id)}
                className={`gap-2 cursor-pointer ${membership.business_id === session.active_business_id ? 'bg-primary/10 text-primary focus:bg-primary/20' : ''}`}
              >
                <Building className="w-4 h-4 opacity-70" />
                <span className="font-medium truncate">{membership.business_name}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem onClick={logout} className="text-red-400 focus:bg-red-500/10 focus:text-red-400 cursor-pointer gap-2">
              <LogOut className="w-4 h-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
