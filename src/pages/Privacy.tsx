import { useLanguage } from "@/hooks/useLanguage";
import { ConvwayoHeader } from "@/components/ConvwayoHeader";
import { Link } from "react-router-dom";

const LAST_UPDATED = { hr: "Zadnja izmjena: 19.04.2026.", en: "Last updated: 19.04.2026." };

const content = {
  hr: {
    title: "Pravila privatnosti",
    sections: [
      {
        h: "Voditelj obrade",
        p: "Penta turistička agencija d.o.o., Izidora Kršnjavoga 25, 10000 Zagreb, OIB: 31375495391. Za pitanja o zaštiti podataka kontaktirajte registration@conwayo.ai.",
      },
      {
        h: "Koje podatke prikupljamo",
        p: "Prikupljamo ime i prezime, e-mail adresu, telefonski broj te OIB za tvrtke. Također prikupljamo automatske podatke kao što su IP adresa i kolačići, kao i podatke koje nam dostave organizatori događaja.",
      },
      {
        h: "Pravna osnova obrade",
        p: "Podatke obrađujemo na temelju ugovora (registracija na događaj), zakonske obveze (računovodstvo), legitimnog interesa (sigurnost platforme) te privole (marketing i voice kanal).",
      },
      {
        h: "Kanali obrade",
        p: "Obrada se odvija putem web platforme, WhatsApp AI agenta (+385 91 201 5954) te glasovnog AI agenta (Retell AI Inc., SAD). Audio snimke i transkripti se ne pohranjuju (postavka: Basic Attributes Only). Za glasovni kanal potrebna je eksplicitna privola; ako korisnik odbije pristanak, svi prikupljeni podaci se brišu.",
      },
      {
        h: "Primatelji podataka",
        p: "Podaci se mogu proslijediti sljedećim primateljima: Retell AI (SAD, SCC+DPA), Stripe (SAD, SCC), Meta/WhatsApp (SCC), Supabase (DPA), OpenAI (SCC), Google Analytics (SCC) te organizatorima događaja.",
      },
      {
        h: "Rokovi čuvanja",
        p: "Transakcijski podaci čuvaju se 11 godina, računi i korisnički računi do prestanka aktivnosti plus 3 godine, registracije 2 godine, metadata glasovnih poziva 30 dana, audio snimke i transkripti se ne pohranjuju, privola za voice kanal trajno.",
      },
      {
        h: "Vaša prava",
        p: "Imate pravo na pristup, ispravak, brisanje, prenosivost, prigovor te povlačenje privole. Za ostvarivanje prava kontaktirajte registration@conwayo.ai. Pritužbu možete podnijeti AZOP-u na www.azop.hr.",
      },
      {
        h: "Sigurnost",
        p: "Podaci se štite SSL/TLS enkripcijom i kontrolom pristupa. U slučaju povrede podataka obavijestit ćemo vas u roku od 72 sata.",
      },
      {
        h: "Kontakt",
        p: "Za sva pitanja vezana uz privatnost kontaktirajte nas na registration@conwayo.ai.",
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    sections: [
      {
        h: "Data Controller",
        p: "Penta Tourist Agency LLC, Izidora Kršnjavoga 25, 10000 Zagreb, Croatia, VAT ID: 31375495391. For data protection questions contact registration@conwayo.ai.",
      },
      {
        h: "What data we collect",
        p: "We collect first and last name, email address, phone number and VAT ID for companies. We also collect automatic data such as IP address and cookies, as well as data provided by event organizers.",
      },
      {
        h: "Legal basis for processing",
        p: "We process data on the basis of contract (event registration), legal obligation (accounting), legitimate interest (platform security) and consent (marketing and voice channel).",
      },
      {
        h: "Processing channels",
        p: "Processing takes place via the web platform, WhatsApp AI agent (+385 91 201 5954) and voice AI agent (Retell AI Inc., USA). Audio recordings and transcripts are not stored (Basic Attributes Only setting). Explicit consent is required for the voice channel; if the user declines consent, all collected data is deleted.",
      },
      {
        h: "Data recipients",
        p: "Data may be shared with the following recipients: Retell AI (USA, SCC+DPA), Stripe (USA, SCC), Meta/WhatsApp (SCC), Supabase (DPA), OpenAI (SCC), Google Analytics (SCC) and event organizers.",
      },
      {
        h: "Retention periods",
        p: "Transaction data is kept for 11 years, invoices and user accounts until end of activity plus 3 years, registrations for 2 years, voice call metadata for 30 days, audio recordings and transcripts are not stored, and voice consent permanently.",
      },
      {
        h: "Your rights",
        p: "You have the right to access, rectification, erasure, portability, objection and withdrawal of consent. To exercise your rights contact registration@conwayo.ai. You may lodge a complaint with AZOP at www.azop.hr.",
      },
      {
        h: "Security",
        p: "Data is protected by SSL/TLS encryption and access control. In the event of a data breach we will notify you within 72 hours.",
      },
      {
        h: "Contact",
        p: "For all privacy-related questions contact us at registration@conwayo.ai.",
      },
    ],
  },
} as const;

export default function Privacy() {
  const { lang } = useLanguage();
  const c = content[lang];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ConvwayoHeader showBackToEvents />

      <main className="container mx-auto px-4 max-w-4xl py-12 md:py-16">
        <header className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            {c.title}
          </h1>
          <p className="text-sm text-muted-foreground">{LAST_UPDATED[lang]}</p>
        </header>

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

        <footer className="mt-16 pt-8 border-t">
          <p className="text-xs text-muted-foreground text-center">
            © Conwayo {new Date().getFullYear()}
          </p>
        </footer>
      </main>
    </div>
  );
}
