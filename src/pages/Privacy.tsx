import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type Lang = "hr" | "en";

const LAST_UPDATED = "19.04.2026.";

const content = {
  hr: {
    brand: "Conwayo",
    title: "Politika privatnosti",
    subtitle: `Zadnja izmjena: ${LAST_UPDATED}`,
    back: "Natrag",
    footer: `© Conwayo ${new Date().getFullYear()}`,
    sections: [
      {
        h: "Voditelj obrade podataka",
        p: "Penta d.o.o., Izidora Kršnjavoga 25, 10000 Zagreb, Hrvatska, kao vlasnik platforme Conwayo, voditelj je obrade osobnih podataka prikupljenih putem platforme.",
      },
      {
        h: "Koje podatke prikupljamo",
        p: "Prikupljamo osnovne osobne podatke (ime, prezime, e-mail, telefon), podatke za naplatu (adresa, OIB/VAT, naziv tvrtke) te tehničke podatke o korištenju platforme.",
      },
      {
        h: "Svrha obrade",
        p: "Podatke obrađujemo radi registracije sudionika na događaje, izdavanja računa, dostave ulaznica i komunikacije vezane uz događaj.",
      },
      {
        h: "Rok čuvanja podataka",
        p: "Osobne podatke čuvamo onoliko dugo koliko je potrebno za ispunjenje navedenih svrha te u skladu sa zakonskim obvezama (npr. porezni propisi).",
      },
      {
        h: "Treće strane kojima prosljeđujemo podatke",
        p: "Podatke dijelimo s pružateljima usluga koji nam pomažu u radu platforme (npr. Stripe za plaćanja, pružatelji e-mail i hosting usluga), isključivo u nužnoj mjeri.",
      },
      {
        h: "Vaša prava",
        p: "Imate pravo na pristup, ispravak, brisanje, ograničenje obrade i prenosivost svojih osobnih podataka, kao i pravo na prigovor te pravo podnijeti pritužbu nadležnom tijelu (AZOP).",
      },
      {
        h: "Kontakt",
        p: "Za sva pitanja vezana uz zaštitu osobnih podataka možete nas kontaktirati e-mailom na info@conwayo.io.",
      },
    ],
  },
  en: {
    brand: "Conwayo",
    title: "Privacy Policy",
    subtitle: `Last updated: ${LAST_UPDATED}`,
    back: "Back",
    footer: `© Conwayo ${new Date().getFullYear()}`,
    sections: [
      {
        h: "Data Controller",
        p: "Penta d.o.o., Izidora Kršnjavoga 25, 10000 Zagreb, Croatia, as the owner of the Conwayo platform, is the data controller for personal data collected through the platform.",
      },
      {
        h: "What data we collect",
        p: "We collect basic personal data (first name, last name, email, phone), billing information (address, OIB/VAT, company name), and technical data about the use of the platform.",
      },
      {
        h: "Purpose of processing",
        p: "We process data to register attendees for events, issue invoices, deliver tickets, and handle event-related communication.",
      },
      {
        h: "Data retention",
        p: "We retain personal data for as long as necessary to fulfill the above purposes and in accordance with legal obligations (e.g. tax regulations).",
      },
      {
        h: "Third parties",
        p: "We share data with service providers that help us operate the platform (e.g. Stripe for payments, email and hosting providers), strictly to the extent necessary.",
      },
      {
        h: "Your rights",
        p: "You have the right to access, rectify, erase, restrict processing of, and port your personal data, as well as the right to object and to lodge a complaint with the competent authority (AZOP).",
      },
      {
        h: "Contact",
        p: "For any questions regarding the protection of personal data, you can contact us by email at info@conwayo.io.",
      },
    ],
  },
} as const;

export default function Privacy() {
  const [lang, setLang] = useState<Lang>("hr");
  const c = content[lang];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-6 py-12 md:py-16">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {c.back}
          </Link>

          <div className="inline-flex items-center rounded-full border bg-muted/40 p-0.5">
            <Button
              type="button"
              size="sm"
              variant={lang === "hr" ? "default" : "ghost"}
              className="h-7 rounded-full px-3 text-xs"
              onClick={() => setLang("hr")}
            >
              HR
            </Button>
            <Button
              type="button"
              size="sm"
              variant={lang === "en" ? "default" : "ghost"}
              className="h-7 rounded-full px-3 text-xs"
              onClick={() => setLang("en")}
            >
              EN
            </Button>
          </div>
        </div>

        {/* Header */}
        <header className="mb-10">
          <div className="font-display text-sm uppercase tracking-[0.2em] text-primary mb-3">
            {c.brand}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
            {c.title}
          </h1>
          <p className="text-sm text-muted-foreground">{c.subtitle}</p>
        </header>

        {/* Sections */}
        <article className="space-y-10">
          {c.sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-xl md:text-2xl font-semibold mb-3">{s.h}</h2>
              <p className="text-base leading-relaxed text-muted-foreground">
                {s.p}
              </p>
            </section>
          ))}
        </article>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t">
          <p className="text-xs text-muted-foreground text-center">{c.footer}</p>
        </footer>
      </div>
    </div>
  );
}
