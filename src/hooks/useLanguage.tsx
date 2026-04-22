import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export type Lang = "hr" | "en";

const STORAGE_KEY = "conwayo_lang";

const translations = {
  // Home / Index
  "home.aiBadge": { hr: "AI Registracija", en: "AI-Powered Registration" },
  "home.heroTitle": { hr: "Nadolazeći događaji", en: "Upcoming Events" },
  "home.heroSubtitle": {
    hr: "Pregledajte naše događaje, odaberite kartu i registrirajte se za nekoliko sekundi — bez potrebe za računom.",
    en: "Browse our events, pick your ticket, and register in seconds — no account needed.",
  },
  "home.noEventsTitle": { hr: "Nema dostupnih događaja", en: "No Events Available" },
  "home.noEventsDesc": {
    hr: "Uskoro će biti dostupni novi događaji.",
    en: "Check back soon for upcoming events.",
  },

  // Header / Nav
  "nav.allEvents": { hr: "Svi eventi", en: "All Events" },
  "nav.logIn": { hr: "Prijava", en: "Log In" },
  "nav.logOut": { hr: "Odjava", en: "Log Out" },
  "nav.myTickets": { hr: "Moje ulaznice", en: "My Tickets" },

  // Event Hero / Landing
  "event.registrationOpen": { hr: "Registracija otvorena", en: "Registration Open" },
  "event.dateLabel": { hr: "Datum", en: "Date" },
  "event.locationLabel": { hr: "Lokacija", en: "Location" },
  "event.webLabel": { hr: "Web", en: "Web" },
  "event.phoneLabel": { hr: "Telefon", en: "Phone" },
  "event.typeLabel": { hr: "Tip", en: "Event Type" },
  "event.aboutTitle": { hr: "O eventu", en: "About the Event" },
  "event.ticketsTitle": { hr: "Ulaznice", en: "Tickets" },
  "event.servicesTitle": { hr: "Dodatne usluge", en: "Additional Services" },
  "event.servicesNote": {
    hr: "Dodatne usluge možete odabrati tijekom procesa registracije.",
    en: "Additional services can be selected during registration.",
  },
  "event.organizerTitle": { hr: "Organizator", en: "Event Organizer" },
  "event.organizerLabel": { hr: "Organizator", en: "Organizer" },
  "event.coOrganizerLabel": { hr: "Suorganizator", en: "Co-organizer" },
  "event.coOrganizersTitle": { hr: "Suorganizatori", en: "Co-organizers" },
  "event.technicalOrganizerTitle": { hr: "Tehnički organizator", en: "Technical Organizer" },
  "event.cancellationTitle": { hr: "Uvjeti otkazivanja", en: "Cancellation Policy" },
  "event.registerNow": { hr: "Registriraj se", en: "Register Now" },
  "event.freeLabel": { hr: "Besplatno", en: "Free" },
  "event.priceIncludesVat": { hr: "Cijena uključuje PDV", en: "Price includes VAT" },
  "event.spotsLeft": { hr: "Preostalo mjesta", en: "Spots left" },
  "event.notAvailable": {
    hr: "Ovaj event trenutno nije dostupan",
    en: "This event is not currently available",
  },
  "event.notAvailableDesc": {
    hr: "Event je završio ili registracija još nije otvorena.",
    en: "The event may have ended or registration is not open yet.",
  },
  "event.onlineTitle": { hr: "Online registracija", en: "Online Registration" },
  "event.onlineDesc": {
    hr: "Registriraj se putem web obrasca. Plati karticom ili odaberi plaćanje po računu.",
    en: "Register via web form. Pay by card or choose invoice payment.",
  },
  "event.whatsappTitle": { hr: "AI Registracija", en: "AI Registration" },
  "event.whatsappDesc": {
    hr: "Prijavi se brzo i jednostavno putem WhatsApp AI agenta",
    en: "Register quickly and easily via the WhatsApp AI agent",
  },
  "event.whatsappButton": { hr: "Otvori WhatsApp", en: "Open WhatsApp" },

  // Registration
  "register.completeTitle": { hr: "Završi registraciju", en: "Complete Registration" },
  "register.selectTickets": { hr: "Odaberi ulaznice", en: "Select Your Tickets" },
  "register.attendeeDetails": { hr: "Podaci o sudionicima", en: "Attendee Details" },
  "register.tickets": { hr: "ulaznica", en: "tickets" },
  "register.ticket": { hr: "Ulaznica", en: "Ticket" },
  "register.billingInfo": { hr: "Podaci za naplatu", en: "Billing Information" },
  "register.whoPaying": { hr: "Tko plaća?", en: "Who is paying?" },
  "register.individual": { hr: "Fizička osoba", en: "Individual" },
  "register.company": { hr: "Tvrtka", en: "Company" },
  "register.payerName": { hr: "Ime platitelja", en: "Payer Name" },
  "register.companyName": { hr: "Naziv tvrtke", en: "Company Name" },
  "register.billingEmail": { hr: "Email za račun", en: "Billing Email" },
  "register.poNumber": { hr: "Broj narudžbenice", en: "PO Number" },
  "register.paymentMethod": { hr: "Način plaćanja", en: "Payment Method" },
  "register.cardPayment": { hr: "Kartično plaćanje", en: "Card Payment" },
  "register.cardPaymentDesc": { hr: "Plati odmah putem Stripe-a", en: "Pay now via Stripe" },
  "register.bankTransfer": { hr: "Bankovni prijenos", en: "Bank Transfer" },
  "register.bankTransferDesc": { hr: "Plati putem fakture", en: "Pay via invoice" },
  "register.streetAddress": { hr: "Ulica i kućni broj", en: "Street Address" },
  "register.city": { hr: "Grad", en: "City" },
  "register.postalCode": { hr: "Poštanski broj", en: "Postal Code" },
  "register.country": { hr: "Država", en: "Country" },
  "register.firstName": { hr: "Ime", en: "First Name" },
  "register.lastName": { hr: "Prezime", en: "Last Name" },
  "register.email": { hr: "Email", en: "Email" },
  "register.contactPhone": { hr: "Kontakt telefon", en: "Contact Phone" },
  "register.additionalOptions": {
    hr: "Dodatne opcije za ovog sudionika:",
    en: "Additional options for this attendee:",
  },
  "register.noTickets": {
    hr: "Trenutno nema dostupnih ulaznica.",
    en: "No tickets available at this time.",
  },
  "register.total": { hr: "Ukupno", en: "Total" },
  "register.additionalServices": { hr: "Dodatne usluge", en: "Additional services" },
  "register.processing": { hr: "Obrada...", en: "Processing..." },
  "register.requestInvoice": { hr: "Zatraži fakturu", en: "Request Invoice" },
  "register.registerAndPay": { hr: "Registriraj se i plati", en: "Register & Pay" },
  "register.termsAgree": {
    hr: "Slažem se s",
    en: "I agree to the",
  },
  "register.termsPurchase": {
    hr: "Uvjetima kupnje",
    en: "Terms of Purchase",
  },
  "register.termsAndCancellation": {
    hr: "i Politikom povrata",
    en: "and Cancellation Policy",
  },
  "register.termsError": {
    hr: "Molimo prihvatite Uvjete kupnje za nastavak.",
    en: "Please accept the Terms of Purchase to continue.",
  },
  "register.haveAccount": { hr: "Imate račun?", en: "Have an account?" },
  "register.loginPrefill": {
    hr: "Prijavite se za automatsko popunjavanje",
    en: "Log in to pre-fill details",
  },
  "register.guestBelow": {
    hr: "Ili nastavite kao gost ↓",
    en: "Or continue as a guest below ↓",
  },
  "register.loggedInAs": { hr: "Prijavljeni kao", en: "Logged in as" },
  "register.searchCountry": { hr: "Pretraži državu...", en: "Search country..." },
  "register.optional": { hr: "Opcionalno", en: "Optional" },

  // Footer
  "footer.poweredBy": {
    hr: "Prodaja ulaznica omogućena putem platforme Conwayo.",
    en: "Ticket sales powered by the Conwayo platform.",
  },
  "footer.owner": {
    hr: "Vlasnik platforme: Penta d.o.o., Izidora Kršnjavoga 25, 10000 Zagreb",
    en: "Platform owner: Penta d.o.o., Izidora Kršnjavoga 25, 10000 Zagreb",
  },
} as const;

type TranslationKey = keyof typeof translations;

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "hr") return saved;
    } catch {}
    return "hr";
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang] ?? entry["hr"] ?? key;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

/**
 * Helper: resolve a translated field from a JSON translations column.
 * Falls back to the original value if no translation exists.
 */
export function tr(
  translations: Record<string, any> | null | undefined,
  lang: string,
  field: string,
  fallback: string | null | undefined
): string {
  if (lang === 'hr') return fallback ?? '';
  const enVal = translations?.en?.[field];
  return typeof enVal === 'string' && enVal.trim().length > 0
    ? enVal
    : (fallback ?? '');
}
