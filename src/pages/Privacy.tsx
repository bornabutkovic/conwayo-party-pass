import { useLanguage } from "@/hooks/useLanguage";
import { ConvwayoHeader } from "@/components/ConvwayoHeader";

const LAST_UPDATED = { hr: "Zadnja izmjena: 27.05.2026.", en: "Last updated: 27.05.2026." };

const content = {
  hr: {
    title: "Pravila privatnosti",
    intro: "Penta turistička agencija d.o.o. (u nastavku „mi\", „nama\", „naš\") je vlasnik web stranice www.conwayo.io. Stvorili smo ovu izjavu o privatnosti kako bismo pokazali da brinemo o privatnosti naših korisnika te ih informirali o načinima prikupljanja i obrade osobnih podataka. Molimo vas da ovu Izjavu pročitate pažljivo.",
    sections: [
      { h: "Voditelj obrade", p: "Penta turistička agencija d.o.o., Izidora Kršnjavoga 25, 10000 Zagreb, OIB: 31375495391. Za pitanja o zaštiti podataka kontaktirajte registration@conwayo.ai." },
      { h: "Prikupljanje podataka", p: "Osobni podatak jest svaki podatak koji se odnosi na pojedinca čiji je identitet poznat ili se može utvrditi. Vaše osobne podatke prikupljamo samo kada nam svojom voljom date takve informacije — kada ispunite obrazac na web stranici, prijavite se putem WhatsAppa ili glasovnog agenta, te prijavite se na newsletter. Automatski prikupljamo i neosobne podatke putem naših servera ili kolačića: najposjećenije stranice, broj ispunjenih obrazaca, IP adresu, podatke o uređaju i pregledniku, kolačiće." },
      {
        h: "Koje podatke prikupljamo",
        items: [
          "Podaci koje nam izravno dajete: ime i prezime / naziv tvrtke, OIB (za poslovne korisnike), e-mail adresa, broj telefona, podaci o računu (login, hashirana lozinka)",
          "Podaci vezani uz plaćanje: podatke o karticama ne pohranjujemo — obrada ide preko pružatelja platnih usluga (npr. Stripe)",
          "Podaci koje prikupljamo automatski: IP adresa, podaci o uređaju i pregledniku, ponašanje na stranici, kolačići",
          "Podaci dobiveni od Organizatora: podaci o prijavi na događaj, status sudjelovanja, posebni podaci vezani uz event (ako ih Organizator traži)",
        ],
      },
      {
        h: "Obrada podataka — svrha i pravna osnova",
        p: "Ova Politika privatnosti odnosi se na obradu osobnih podataka putem: web stranice Conwayo.io, WhatsApp komunikacije, glasovnog AI agenta (Voice Agent) i svih povezanih digitalnih kanala.",
        items: [
          "Izvršenje ugovora (čl. 6(1)(b)): registracija i korisnički račun, kupnja kotizacija, korisnička podrška",
          "Zakonska obveza (čl. 6(1)(c)): računovodstvo, porezi",
          "Legitimni interes (čl. 6(1)(f)): sigurnost sustava, prevencija prijevara, analitika i poboljšanje usluge",
          "Privola (čl. 6(1)(a)): marketing, kolačići, WhatsApp komunikacija, glasovni kanal (Voice Agent)",
        ],
      },
      {
        h: "Uloge u obradi podataka",
        items: [
          "Platforma (Conwayo) — voditelj obrade za: korisničke račune, tehničke podatke, obradu plaćanja, komunikaciju",
          "Organizator Događaja — zaseban voditelj obrade za: podatke Sudionika vezane uz Događaj, izdavanje računa, marketing vlastitih događaja",
          "Platforma može djelovati kao izvršitelj obrade u ime Organizatora ili zaseban voditelj obrade, ovisno o konkretnoj obradi",
        ],
      },
      { h: "Automatizirana obrada i AI (WhatsApp)", p: "Komunikacija putem WhatsApp kanala može biti automatizirana korištenjem AI sustava. To uključuje: odgovaranje na upite, vođenje kroz registraciju, generiranje uputa za plaćanje. Takva obrada ne proizvodi pravne učinke niti donosi automatizirane odluke koje značajno utječu na korisnika. Korisnik uvijek može zatražiti komunikaciju s ljudskim operaterom." },
      {
        h: "Glasovni kanal (Voice Agent)",
        p: "Conwayo nudi opcionalnu registraciju putem glasovnog AI agenta (Voice Agent). Korištenjem ovog kanala:",
        items: [
          "Razgovor obrađuje AI sustav tvrtke Retell AI Inc. (SAD) koji djeluje kao izvršitelj obrade",
          "Prikupljaju se isključivo: metadata poziva, ime, e-mail adresa i odabir kotizacije — audio snimke i transkripti se NE pohranjuju (postavka: Basic Attributes Only)",
          "Obrada se temelji na vašoj eksplicitnoj privoli danoj usmeno na početku poziva (čl. 6(1)(a) GDPR)",
          "Metadata poziva čuvaju se kod Retell AI 30 dana, nakon čega se automatski brišu",
          "Evidencija privole (datum, ID poziva, verzija teksta obavijesti) pohranjuje se trajno radi dokazivanja sukladno čl. 7(1) GDPR",
          "Ako odbijete privolu na početku poziva, svi prikupljeni podaci odmah se brišu iz sustava",
          "Prijenos podataka u SAD reguliran je Standardnim ugovornim klauzulama (SCC) i potpisanim DPA-om s Retell AI",
        ],
      },
      {
        h: "Primatelji podataka",
        p: "Podatke dijelimo samo kada je potrebno:",
        items: [
          "Pružatelji IT infrastrukture (hosting, baze podataka)",
          "Platni procesori — Stripe (SAD, SCC)",
          "Komunikacijski alati — Meta/WhatsApp (SCC)",
          "Analitički alati — Google Analytics (SCC)",
          "AI alati — OpenAI (SCC)",
          "Glasovni AI agent — Retell AI Inc. (SAD, SCC + DPA)",
          "Organizatori događaja — u mjeri potrebnoj za provedbu događaja",
        ],
        footer: "Svi izvršitelji obrade ugovorno su obvezani na zaštitu podataka.",
      },
      { h: "Prijenos podataka izvan EU/EGP", p: "Neki partneri (npr. Retell AI, Meta, Google, Stripe, OpenAI) mogu obrađivati podatke izvan EU. U tim slučajevima koristimo standardne ugovorne klauzule (SCC) i druge GDPR zaštitne mehanizme." },
      {
        h: "Rokovi čuvanja",
        items: [
          "Transakcijski podaci: 11 godina",
          "Korisnički računi: dok je račun aktivan + max. 3 godine neaktivnosti",
          "Marketing podaci: do povlačenja privole",
          "Analitika: do 24 mjeseca",
          "Metadata glasovnih poziva (Retell AI): 30 dana",
          "Audio snimke i transkripti: ne pohranjuju se (Basic Attributes Only)",
          "Evidencija privole za glasovni kanal: trajno (čl. 7(1) GDPR)",
        ],
      },
      { h: "Zaštita podataka", p: "Primjenjujemo SSL/TLS enkripciju, kontrolu pristupa i autentifikaciju te redovite sigurnosne provjere. U slučaju povrede osobnih podataka obavijestit ćemo vas i nadležno tijelo u roku od 72 sata." },
      { h: "Uporaba kolačića", p: "Koristimo nužne, analitičke, marketinške i funkcionalne kolačiće. Marketinške kolačiće koristimo isključivo uz vašu privolu." },
      { h: "Prava pojedinaca", p: "Imate pravo na: pristup osobnim podacima, ispravak netočnih podataka, brisanje podataka, ograničenje obrade, prenosivost podataka, prigovor na obradu, povlačenje privole u bilo kojem trenutku. Zahtjeve pošaljite na registration@conwayo.ai — odgovaramo unutar 30 dana. Pritužbu možete podnijeti Agenciji za zaštitu osobnih podataka (AZOP), Martićeva 14, Zagreb, www.azop.hr." },
      { h: "Kontakt", p: "Za sva pitanja vezana uz privatnost kontaktirajte nas na registration@conwayo.ai. Penta turistička agencija d.o.o., Izidora Kršnjavoga 25, 10000 Zagreb, OIB: 31375495391." },
    ],
  },
  en: {
    title: "Privacy Policy",
    intro: "Penta Tourist Agency LLC (hereinafter 'we', 'us', 'our') owns the website www.conwayo.io. We created this Privacy Policy to demonstrate our commitment to user privacy and to inform users about how we collect and process personal data. Please read this Policy carefully.",
    sections: [
      { h: "Data Controller", p: "Penta Tourist Agency LLC, Izidora Kršnjavoga 25, 10000 Zagreb, Croatia, VAT ID: 31375495391. For data protection questions contact registration@conwayo.ai." },
      { h: "Data Collection", p: "Personal data means any information relating to an identified or identifiable individual. We only collect personal data when you voluntarily provide it — when you fill in a form on the website, register via WhatsApp or voice agent, or sign up for our newsletter. We also automatically collect non-personal data via our servers or cookies: most visited pages, number of completed forms, IP address, device and browser data, cookies." },
      {
        h: "What data we collect",
        items: [
          "Data you provide directly: first and last name / company name, VAT/OIB number (business users), email address, phone number, account data (login, hashed password)",
          "Payment data: we do not store card details — processing is handled by payment service providers (e.g. Stripe)",
          "Data collected automatically: IP address, device and browser data, website behaviour, cookies",
          "Data received from Organisers: event registration data, participation status, event-specific data (if requested by the Organiser)",
        ],
      },
      {
        h: "Data Processing — Purpose and Legal Basis",
        p: "This Privacy Policy covers the processing of personal data via: Conwayo.io website, WhatsApp communications, voice AI agent (Voice Agent) and all related digital channels.",
        items: [
          "Performance of a contract (Art. 6(1)(b)): registration and user account, ticket purchase, customer support",
          "Legal obligation (Art. 6(1)(c)): accounting, taxes",
          "Legitimate interests (Art. 6(1)(f)): system security, fraud prevention, analytics and service improvement",
          "Consent (Art. 6(1)(a)): marketing, cookies, WhatsApp communications, voice channel (Voice Agent)",
        ],
      },
      {
        h: "Roles in Data Processing",
        items: [
          "Platform (Conwayo) — data controller for: user accounts, technical data, payment processing, communications",
          "Event Organiser — separate data controller for: Participant data related to the Event, invoicing, marketing of own events",
          "The Platform may act as data processor on behalf of the Organiser or as a separate data controller, depending on the specific processing activity",
        ],
      },
      { h: "Automated Processing and AI (WhatsApp)", p: "Communications via the WhatsApp channel may be automated using AI systems. This includes: responding to queries, guiding through registration, generating payment instructions. Such processing does not produce legal effects or significantly affect users through automated decisions. Users may always request communication with a human operator." },
      {
        h: "Voice Channel (Voice Agent)",
        p: "Conwayo offers optional registration via a voice AI agent (Voice Agent). By using this channel:",
        items: [
          "The conversation is processed by an AI system provided by Retell AI Inc. (USA), acting as data processor",
          "Only the following data is collected: call metadata, name, email address and ticket selection — audio recordings and transcripts are NOT stored (Basic Attributes Only setting)",
          "Processing is based on your explicit consent given verbally at the start of the call (Art. 6(1)(a) GDPR)",
          "Call metadata is stored at Retell AI for 30 days, after which it is automatically deleted",
          "Consent records (timestamp, call ID, disclosure version) are retained permanently as proof of consent under Art. 7(1) GDPR",
          "If you decline consent at the start of the call, all collected data is immediately deleted from the system",
          "Data transfers to the USA are governed by Standard Contractual Clauses (SCC) and a signed DPA with Retell AI",
        ],
      },
      {
        h: "Data Recipients",
        p: "We share data only when necessary:",
        items: [
          "IT infrastructure providers (hosting, databases)",
          "Payment processors — Stripe (USA, SCC)",
          "Communication tools — Meta/WhatsApp (SCC)",
          "Analytics tools — Google Analytics (SCC)",
          "AI tools — OpenAI (SCC)",
          "Voice AI agent — Retell AI Inc. (USA, SCC + DPA)",
          "Event Organisers — to the extent necessary for event execution",
        ],
        footer: "All processors are contractually bound to protect your data.",
      },
      { h: "International Data Transfers", p: "Some partners (e.g. Retell AI, Meta, Google, Stripe, OpenAI) may process data outside the EU/EEA. In all such cases we use Standard Contractual Clauses (SCC) or other GDPR-approved transfer mechanisms." },
      {
        h: "Retention Periods",
        items: [
          "Transaction data: 11 years",
          "User accounts: while active + max. 3 years of inactivity",
          "Marketing data: until consent is withdrawn",
          "Analytics: up to 24 months",
          "Voice call metadata (Retell AI): 30 days",
          "Audio recordings and transcripts: not stored (Basic Attributes Only)",
          "Voice consent records: permanently (Art. 7(1) GDPR)",
        ],
      },
      { h: "Data Security", p: "We apply SSL/TLS encryption, access control and authentication, and regular security audits. In the event of a personal data breach we will notify you and the supervisory authority within 72 hours." },
      { h: "Cookies", p: "We use necessary, analytical, marketing and functional cookies. We use marketing cookies only with your prior consent." },
      { h: "Individual Rights", p: "You have the right to: access your personal data, rectification of inaccurate data, erasure ('right to be forgotten'), restriction of processing, data portability, objection to processing, withdrawal of consent at any time. Send requests to registration@conwayo.ai — we respond within 30 days. You may lodge a complaint with the Croatian Personal Data Protection Agency (AZOP), Martićeva 14, Zagreb, www.azop.hr, or your local supervisory authority." },
      { h: "Contact", p: "For all privacy-related questions contact us at registration@conwayo.ai. Penta Tourist Agency LLC, Izidora Kršnjavoga 25, 10000 Zagreb, Croatia, VAT ID: 31375495391." },
    ],
  },
} as const;

type Section = {
  h: string;
  p?: string;
  items?: readonly string[];
  footer?: string;
};

export default function Privacy() {
  const { lang } = useLanguage();
  const c = content[lang];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ConvwayoHeader showBackToEvents />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: "Poppins, sans-serif" }}>
            {c.title}
          </h1>
          <p className="text-sm text-muted-foreground">{LAST_UPDATED[lang]}</p>
        </div>

        <p className="text-base mb-10 leading-relaxed">{c.intro}</p>

        <div className="space-y-10">
          {(c.sections as readonly Section[]).map((s) => (
            <section key={s.h}>
              <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>
                {s.h}
              </h2>
              {s.p && <p className="text-base leading-relaxed mb-3">{s.p}</p>}
              {s.items && (
                <ul className="list-disc list-inside space-y-1 text-base leading-relaxed">
                  {s.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              {s.footer && <p className="text-sm text-muted-foreground mt-3">{s.footer}</p>}
            </section>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>© Conwayo {new Date().getFullYear()}</p>
        </div>
      </main>
    </div>
  );
}
