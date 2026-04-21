import { Card, CardContent } from "@/components/ui/card";
import { Building2, MapPin, ShieldCheck, Mail, Phone, Globe } from "lucide-react";

interface OrganizerInstitution {
  name: string | null;
  address?: string | null;
  city?: string | null;
  oib?: string | null;
  invoice_email?: string | null;
  website?: string | null;
  phone?: string | null;
  facebook_url?: string | null;
  linkedin_url?: string | null;
  instagram_url?: string | null;
}

interface OrganizerCardProps {
  institution: OrganizerInstitution;
  variant?: "default" | "muted";
  fallbackPhone?: string | null;
}

export function OrganizerCard({ institution, variant = "default", fallbackPhone }: OrganizerCardProps) {
  const cardClass =
    variant === "muted" ? "border-border bg-muted/30" : "border-border";

  return (
    <Card className={cardClass}>
      <CardContent className="space-y-3 p-5 text-sm">
        {institution.name && (
          <div className="flex items-start gap-2">
            <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="font-medium">{institution.name}</span>
          </div>
        )}
        {(institution.address || institution.city) && (
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span>{[institution.address, institution.city].filter(Boolean).join(", ")}</span>
          </div>
        )}
        {institution.oib && (
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span>OIB/VAT: {institution.oib}</span>
          </div>
        )}
        {institution.invoice_email && (
          <div className="flex items-start gap-2">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <a
              href={`mailto:${institution.invoice_email}`}
              className="text-primary underline underline-offset-2"
            >
              {institution.invoice_email}
            </a>
          </div>
        )}
        {(institution.phone || fallbackPhone) && (
          <div className="flex items-start gap-2">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span>{institution.phone || fallbackPhone}</span>
          </div>
        )}
        {institution.website && (
          <div className="flex items-start gap-2">
            <Globe className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <a
              href={institution.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              {institution.website.replace(/^https?:\/\//, "")}
            </a>
          </div>
        )}
        <OrganizerSocialLinks
          facebook={institution.facebook_url}
          linkedin={institution.linkedin_url}
          instagram={institution.instagram_url}
        />
      </CardContent>
    </Card>
  );
}

function OrganizerSocialLinks({
  facebook,
  linkedin,
  instagram,
}: {
  facebook?: string | null;
  linkedin?: string | null;
  instagram?: string | null;
}) {
  const links = [
    { url: facebook, label: "Facebook" },
    { url: linkedin, label: "LinkedIn" },
    { url: instagram, label: "Instagram" },
  ].filter((l) => l.url);
  if (links.length === 0) return null;
  return (
    <div className="flex items-center gap-3 pt-1">
      {links.map((l) => (
        <a
          key={l.label}
          href={l.url!}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary underline underline-offset-2 hover:opacity-80"
        >
          {l.label}
        </a>
      ))}
    </div>
  );
}
