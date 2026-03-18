import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogIn, LogOut, Ticket, ChevronDown } from "lucide-react";
import conwayoLogo from "@/assets/conwayo-logo.png";

export function ConvwayoHeader() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const firstName = user?.user_metadata?.first_name || "";
  const lastName = user?.user_metadata?.last_name || "";
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || user?.email?.charAt(0).toUpperCase() || "?";
  const displayName = firstName ? `${firstName} ${lastName}`.trim() : user?.email?.split("@")[0] || "User";

  return (
    <header className="sticky top-0 z-50 glass">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src={conwayoLogo}
            alt="Conwayo"
            className="h-9 w-auto"
          />
        </Link>

        <div className="flex items-center gap-3">
          {!loading && !user && (
            <Button
              asChild
              size="sm"
              className="gradient-brand border-0 text-white font-semibold shadow-brand hover:shadow-brand-hover transition-all duration-300 hover:scale-105"
            >
              <Link to="/auth">
                <LogIn className="mr-1.5 h-4 w-4" />
                Log In
              </Link>
            </Button>
          )}

          {!loading && user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full border border-border/50 glass px-2.5 py-1.5 hover:shadow-brand transition-all duration-200">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs gradient-brand text-white font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-foreground hidden sm:inline">
                    {displayName}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 glass">
                <DropdownMenuItem onClick={() => navigate("/my-tickets")}>
                  <Ticket className="mr-2 h-4 w-4" />
                  My Tickets
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
