import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShoppingBag } from "lucide-react";
import type { EventService } from "@/hooks/useEventServices";

interface ServiceCardProps {
  service: EventService;
  currency: string;
  purchased?: boolean;
  onPurchase: (serviceId: string) => Promise<void>;
}

export function ServiceCard({ service, currency, purchased, onPurchase }: ServiceCardProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await onPurchase(service.id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={purchased ? "border-success/30 bg-success/5" : ""}>
      <CardContent className="flex items-center justify-between gap-4 py-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-foreground truncate">{service.name}</p>
            {purchased && <Badge variant="default" className="text-xs">Purchased</Badge>}
          </div>
          {service.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{service.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-bold text-primary whitespace-nowrap">
            {service.price > 0 ? `${service.price} ${currency}` : "Free"}
          </span>
          {!purchased && (
            <Button size="sm" onClick={handleClick} disabled={loading}>
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ShoppingBag className="h-3 w-3 mr-1" />
              )}
              {loading ? "..." : "Add"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
