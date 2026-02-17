import { Link } from "react-router-dom";

export function ConvwayoHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">C</span>
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground font-display">
            Convwayo
          </span>
        </Link>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
          Events
        </span>
      </div>
    </header>
  );
}
