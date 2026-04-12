import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogIn, LogOut, Ticket, ChevronDown, ArrowLeft } from "lucide-react";
import conwayoLogo from "@/assets/conwayo-logo.png";

interface ConvwayoHeaderProps {
  showBackToEvents?: boolean;
}

export function ConvwayoHeader({ showBackToEvents = false }: ConvwayoHeaderProps) {
  const { user, loading, signOut } = useAuth();
  const { lang, setLang, t } = useLanguage();
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
          {/* Language switcher */}
          <div className="flex items-center rounded-md border border-border/50 overflow-hidden text-xs font-medium">
            <button
              onClick={() => setLang("hr")}
              className={`px-2.5 py-1.5 transition-colors ${
                lang === "hr"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              HR
            </button>
            <button
              onClick={() => setLang("en")}
              className={`px-2.5 py-1.5 transition-colors ${
                lang === "en"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              EN
            </button>
          </div>

          {showBackToEvents && (
            <Link
              to="/"
              className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("nav.allEvents")}
            </Link>
          )}

          {!loading && !user && (
            <Button
              asChild
              size="sm"
              className="gradient-brand border-0 text-white font-semibold shadow-brand hover:shadow-brand-hover transition-all duration-300 hover:scale-105"
            >
              <Link to="/auth">
                <LogIn className="mr-1.5 h-4 w-4" />
                {t("nav.logIn")}
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
                  {t("nav.myTickets")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("nav.logOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
