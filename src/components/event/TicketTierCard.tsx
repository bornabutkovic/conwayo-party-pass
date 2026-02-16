import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TicketTier } from "@/hooks/useEvent";

interface TicketTierCardProps {
  tier: TicketTier;
  selected: boolean;
  currency: string;
  onSelect: () => void;
}

export function TicketTierCard({ tier, selected, currency, onSelect }: TicketTierCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative w-full rounded-lg border-2 p-5 text-left transition-all",
        selected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
      )}
    >
      {selected && (
        <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-4 w-4" />
        </div>
      )}

      <h3 className="text-lg font-semibold text-card-foreground">{tier.name}</h3>

      {tier.description && (
        <p className="mt-1 text-sm text-muted-foreground">{tier.description}</p>
      )}

      <p className="mt-3 text-2xl font-bold text-primary">
        {tier.price > 0 ? `${tier.price} ${currency}` : "Free"}
      </p>
    </button>
  );
}
