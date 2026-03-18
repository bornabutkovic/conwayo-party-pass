import { CheckCircle2, Ticket, Users, CreditCard, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { QRCodeSVG } from "qrcode.react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface AttendeeInfo {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  tierName: string;
  tierPrice: number;
  services: { name: string; price: number }[];
}

interface OrderConfirmationProps {
  eventName: string;
  eventDate?: string | null;
  eventEndDate?: string | null;
  venueName?: string | null;
  locationCity?: string | null;
  currency: string;
  attendees: AttendeeInfo[];
  totalAmount: number;
  payerType: "individual" | "company";
  slug: string;
  // Invoice-specific
  invoiceMessage?: string;
  paymentDueDays?: number | null;
  billingEmail?: string;
  companyName?: string;
  // Stripe-specific
  redirectingToStripe?: boolean;
  onPayNow?: () => void;
}

export function OrderConfirmation({
  eventName,
  eventDate,
  eventEndDate,
  venueName,
  locationCity,
  currency,
  attendees,
  totalAmount,
  payerType,
  slug,
  invoiceMessage,
  paymentDueDays,
  billingEmail,
  companyName,
  redirectingToStripe,
  onPayNow,
}: OrderConfirmationProps) {
  const navigate = useNavigate();

  const formatDate = (d: string | null | undefined) => {
    if (!d) return null;
    try {
      return format(new Date(d), "dd MMM yyyy");
    } catch {
      return d;
    }
  };

  const dateStr = formatDate(eventDate);
  const endDateStr = formatDate(eventEndDate);
  const dateDisplay = dateStr && endDateStr && dateStr !== endDateStr
    ? `${dateStr} – ${endDateStr}`
    : dateStr;

  const isInvoice = payerType === "company";

  return (
    <div className="min-h-screen bg-background">
      <section className="container mx-auto px-4 py-12 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">
            {isInvoice ? "Invoice Request Received!" : "Registration Confirmed!"}
          </h1>
          <p className="text-muted-foreground">
            {isInvoice
              ? "A payment instruction will be sent to your email."
              : "Complete your payment to activate your tickets."}
          </p>
        </div>

        {/* Event Info Card */}
        <div className="rounded-xl border border-border bg-card p-5 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            {eventName}
          </h2>
          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            {dateDisplay && (
              <div>
                <span className="font-medium text-foreground">Date:</span> {dateDisplay}
              </div>
            )}
            {(venueName || locationCity) && (
              <div>
                <span className="font-medium text-foreground">Venue:</span>{" "}
                {[venueName, locationCity].filter(Boolean).join(", ")}
              </div>
            )}
          </div>
        </div>

        {/* Attendees */}
        <div className="rounded-xl border border-border bg-card mb-6">
          <div className="p-5 pb-3">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Attendees ({attendees.length})
            </h3>
          </div>

          {attendees.map((att, idx) => {
            const ticketUrl = att.id
              ? `${window.location.origin}/ticket/${att.id}`
              : null;
            const attServices = att.services.filter(s => s.price >= 0);

            return (
              <div key={idx}>
                {idx > 0 && <Separator />}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          #{idx + 1}
                        </span>
                        <span className="font-medium text-foreground">
                          {att.firstName} {att.lastName}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{att.email}</p>
                      <Badge variant="outline" className="text-xs">
                        {att.tierName} — {att.tierPrice > 0 ? `${att.tierPrice} ${currency}` : "Free"}
                      </Badge>

                      {/* Per-attendee services */}
                      {attServices.length > 0 && (
                        <div className="mt-3 space-y-1">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Additional services
                          </p>
                          {attServices.map((svc, sIdx) => (
                            <div key={sIdx} className="flex justify-between text-sm">
                              <span className="text-foreground">{svc.name}</span>
                              <span className="text-muted-foreground font-medium">
                                +{svc.price} {currency}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Ticket link */}
                      {ticketUrl && (
                        <a
                          href={ticketUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                        >
                          View ticket <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>

                    {/* QR Code */}
                    {att.id && (
                      <div className="shrink-0">
                        <div className={`rounded-lg border border-border bg-background p-2 ${!isInvoice && payerType === "individual" ? "blur-sm opacity-60" : ""}`}>
                          <QRCodeSVG value={att.id} size={80} level="H" />
                        </div>
                        {!isInvoice && (
                          <p className="text-[10px] text-muted-foreground text-center mt-1">
                            Pending payment
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Summary */}
        <div className="rounded-xl border border-border bg-card p-5 mb-6">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-primary" />
            Order Summary
          </h3>
          <div className="space-y-2 text-sm">
            {attendees.map((att, idx) => {
              const attServiceTotal = att.services.reduce((s, svc) => s + svc.price, 0);
              return (
                <div key={idx} className="flex justify-between">
                  <span className="text-muted-foreground">
                    {att.firstName} {att.lastName} — {att.tierName}
                    {attServiceTotal > 0 && ` + services`}
                  </span>
                  <span className="font-medium text-foreground">
                    {(att.tierPrice + attServiceTotal).toFixed(2)} {currency}
                  </span>
                </div>
              );
            })}
            <Separator className="my-2" />
            <div className="flex justify-between text-base font-bold">
              <span className="text-foreground">Total</span>
              <span className="text-primary">{totalAmount.toFixed(2)} {currency}</span>
            </div>
          </div>
        </div>

        {/* Payment Instructions (Invoice) */}
        {isInvoice && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 mb-6">
            <h3 className="text-base font-semibold text-foreground mb-2">Payment Instructions</h3>
            <p className="text-sm text-muted-foreground mb-2">
              {invoiceMessage || "A quote with payment details has been sent to your email."}
            </p>
            {billingEmail && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Email:</span> {billingEmail}
              </p>
            )}
            {companyName && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Company:</span> {companyName}
              </p>
            )}
            {paymentDueDays && (
              <p className="text-sm text-muted-foreground mt-1">
                <span className="font-medium text-foreground">Payment deadline:</span>{" "}
                {paymentDueDays} days from invoice date
              </p>
            )}
          </div>
        )}

        {/* Stripe Payment CTA */}
        {!isInvoice && totalAmount > 0 && onPayNow && (
          <div className="space-y-3 mb-6">
            <Button
              size="lg"
              className="w-full text-lg"
              onClick={onPayNow}
              disabled={redirectingToStripe}
            >
              {redirectingToStripe ? (
                <>
                  <CreditCard className="mr-2 h-5 w-5 animate-pulse" />
                  Redirecting to Stripe...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-5 w-5" />
                  PAY NOW — {totalAmount.toFixed(2)} {currency}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Back button */}
        <div className="text-center">
          <Button variant="ghost" onClick={() => navigate(`/event/${slug}`)}>
            Back to Event
          </Button>
        </div>
      </section>
    </div>
  );
}
