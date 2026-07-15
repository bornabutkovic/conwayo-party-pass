import { useLanguage } from "@/hooks/useLanguage";
import { ConvwayoHeader } from "@/components/ConvwayoHeader";

const LAST_UPDATED_HR = "Svibanj 2026. (v1.0)";
const LAST_UPDATED_EN = "May 2026 (v1.0)";

const INTRO_HR =
  "Ovaj dokument definira rokove čuvanja osobnih podataka koje obrađuje Conwayo - Penta turistička agencija d.o.o. sa sjedištem na adresi Izidora Kršnjavoga 25, 10000 Zagreb, OIB: 31375495391, te pravnu osnovu za svaki rok, u skladu s Uredbom (EU) 2016/679 (GDPR) i primjenjivim hrvatskim zakonodavstvom. Nakon isteka propisanog roka, podaci se brišu ili anonimiziraju.";

const INTRO_EN =
  "This document defines the retention periods for personal data processed by Conwayo - Penta turistička agencija d.o.o., with its registered office at Izidora Kršnjavoga 25, 10000 Zagreb, Croatia, Company Registration Number (OIB): 31375495391, and the legal basis for each period, in accordance with Regulation (EU) 2016/679 (GDPR) and applicable Croatian legislation. Upon expiry of the prescribed period, the data is deleted or anonymised.";

const ROWS_HR: [string, string, string, string, string][] = [
  ["Profili sudionika", "Ime i prezime, e-mail adresa", "2 godine od zadnje aktivnosti ili odjave", "čl. 6. st. 1. t. b) i f) GDPR - izvršenje ugovora / legitimni interes", "Anonimizacija ili trajno brisanje"],
  ["Profili sudionika", "Broj telefona", "2 godine od zadnje aktivnosti", "čl. 6. st. 1. t. b) GDPR - izvršenje ugovora", "Trajno brisanje"],
  ["Profili sudionika", "Marketinška privola (email newsletter)", "Do povlačenja privole + 1 godina radi dokaza privole", "čl. 6. st. 1. t. a) GDPR - privola", "Brisanje iz liste; log privole čuva se još 1 godinu"],
  ["Narudžbe i plaćanja", "Računi, uplate, povrati, financijska dokumentacija", "11 godina", "čl. 6. st. 1. t. c) GDPR - zakonska obveza", "Po isteku roka trajno brisanje / uništenje"],
  ["Narudžbe i plaćanja", "Podaci o transakciji (iznos, datum, referenca)", "11 godina", "Zakon o računovodstvu, Zakon o PDV-u", "Trajno brisanje"],
  ["Narudžbe i plaćanja", "Podaci o plaćanju (broj kartice, IBAN) - ako se čuvaju", "Preporučuje se ne čuvati nakon transakcije; ako se čuvaju, najviše 1 godinu", "PCI DSS standard; načelo minimizacije podataka (čl. 5. GDPR)", "Trenutno brisanje nakon transakcije"],
  ["WhatsApp kanal - registracija i plaćanje", "Razgovor o registraciji: ime, kontakt, odabir događaja, privola", "2 godine od datuma događaja", "čl. 6. st. 1. t. b) GDPR - izvršenje ugovora", "Arhiviranje u sustavu + brisanje s WhatsApp uređaja"],
  ["WhatsApp kanal - registracija i plaćanje", "Platežna poveznica i potvrda o plaćanju (WhatsApp poruka)", "11 godina", "čl. 6. st. 1. t. c) GDPR - zakonska obveza", "Čuva se u platnom sustavu; briše se s WhatsApp uređaja"],
  ["WhatsApp kanal - registracija i plaćanje", "Privola za WhatsApp komunikaciju (log prihvaćanja)", "Do povlačenja privole + 1 godina", "čl. 6. st. 1. t. a) GDPR - privola; obveza dokazivanja", "Log privole čuva se i nakon odjave radi dokazivanja"],
  ["WhatsApp kanal - registracija i plaćanje", "Poruke korisničke podrške i upiti sudionika", "1 godina od zatvaranja upita", "čl. 6. st. 1. t. f) GDPR - legitimni interes", "Ručno brisanje razgovora ili arhiviranje izvan WhatsAppa"],
  ["WhatsApp kanal - registracija i plaćanje", "Dokumenti i mediji poslani putem WhatsAppa (potvrde kotizacije)", "1 godina ili po rješavanju predmeta", "Legitimni interes; načelo minimizacije podataka", "Brisanje s uređaja i svih backupa"],
  ["Glasovni kanal (Voice)", "Audio snimka razgovora", "najviše 30 dana (pohranjeno kod Retell AI, SAD)", "čl. 6(1)(a) GDPR - privola. Prijenos osobnih podataka u SAD provodi se uz primjenu odgovarajućih zaštitnih mjera sukladno čl. 46 GDPR-a, uključujući Standard Contractual Clauses (SCC)", "Automatski briše Retell AI"],
  ["Glasovni kanal (Voice)", "Transkript razgovora", "2 godine od datuma poziva", "čl. 6(1)(b) GDPR — izvršenje ugovora", "Trajno brisanje"],
  ["Glasovni kanal (Voice)", "Evidencija privole (consent log)", "dok postoji potreba dokazivanja privole", "čl. 7(1) GDPR — dokazivanje privole", "—"],
  ["Glasovni kanal (Voice)", "Podaci registracije iz voice sessiona", "2 godine od datuma događaja", "čl. 6(1)(b) GDPR — izvršenje ugovora", "Anonimizacija ili brisanje"],
  ["Podaci o događajima", "Naziv, datum, lokacija, program događaja", "Trajno, kao povijesna i organizacijska vrijednost", "Legitimni interes voditelja obrade (čl. 6. st. 1. t. f) GDPR)", "Ne briše se; može se arhivirati"],
  ["Podaci o događajima", "Popisi sudionika po događaju (ime + status)", "5 godina od događaja, potom anonimizacija", "Legitimni interes / izvršenje ugovora", "Anonimizacija; čuvaju se samo agregatni podaci"],
  ["Podaci o događajima", "Fotografije i snimke s događaja", "Trajno, uz uvjet da su sudionici informirani i da postoji privola", "Privola za individualne/promotivne fotografije ili legitimni interes voditelja obrade za fotografije atmosfere događaja, uz provedeni balansni test", "Na zahtjev ispitanika uklanjanje prepoznatljivih osoba"],
];

const ROWS_EN: [string, string, string, string, string][] = [
  ["Attendee profiles", "First and last name, email address", "2 years from last activity or unsubscription", "Art. 6(1)(b) and (f) GDPR - performance of a contract / legitimate interest", "Anonymisation or permanent deletion"],
  ["Attendee profiles", "Phone number", "2 years from last activity", "Art. 6(1)(b) GDPR - performance of a contract", "Permanent deletion"],
  ["Attendee profiles", "Marketing consent (email newsletter)", "Until consent is withdrawn + 1 year to evidence consent", "Art. 6(1)(a) GDPR - consent", "Removal from the list; consent log kept for a further 1 year"],
  ["Orders and payments", "Invoices, payments, refunds, financial documentation", "11 years", "Art. 6(1)(c) GDPR - legal obligation", "Permanent deletion / destruction after the period expires"],
  ["Orders and payments", "Transaction data (amount, date, reference)", "11 years", "Croatian Accounting Act, Croatian VAT Act", "Permanent deletion"],
  ["Orders and payments", "Payment data (card number, IBAN) - if retained", "Recommended not to retain after the transaction; if retained, maximum 1 year", "PCI DSS standard; data minimisation principle (Art. 5 GDPR)", "Immediate deletion after the transaction"],
  ["WhatsApp channel - registration and payment", "Registration conversation: name, contact details, event selection, consent", "2 years from the event date", "Art. 6(1)(b) GDPR - performance of a contract", "Archived in the system + deleted from the WhatsApp device"],
  ["WhatsApp channel - registration and payment", "Payment link and payment confirmation (WhatsApp message)", "11 years", "Art. 6(1)(c) GDPR - legal obligation", "Retained in the payment system; deleted from the WhatsApp device"],
  ["WhatsApp channel - registration and payment", "Consent for WhatsApp communication (acceptance log)", "Until consent is withdrawn + 1 year", "Art. 6(1)(a) GDPR - consent; obligation to demonstrate consent", "Consent log retained even after opt-out, to evidence consent"],
  ["WhatsApp channel - registration and payment", "Customer support messages and attendee enquiries", "1 year from closing the enquiry", "Art. 6(1)(f) GDPR - legitimate interest", "Manual deletion of the conversation or archiving outside WhatsApp"],
  ["WhatsApp channel - registration and payment", "Documents and media sent via WhatsApp (registration fee confirmations)", "1 year or until the matter is resolved", "Legitimate interest; data minimisation principle", "Deletion from the device and all backups"],
  ["Voice channel", "Audio recording of the call", "Maximum 30 days (stored with Retell AI, USA)", "Art. 6(1)(a) GDPR - consent. The transfer of personal data to the USA is carried out with appropriate safeguards in accordance with Art. 46 GDPR, including Standard Contractual Clauses (SCCs)", "Automatically deleted by Retell AI"],
  ["Voice channel", "Call transcript", "2 years from the call date", "Art. 6(1)(b) GDPR - performance of a contract", "Permanent deletion"],
  ["Voice channel", "Consent log", "For as long as it may be necessary to demonstrate consent", "Art. 7(1) GDPR - demonstrating consent", "—"],
  ["Voice channel", "Registration data from the voice session", "2 years from the event date", "Art. 6(1)(b) GDPR - performance of a contract", "Anonymisation or deletion"],
  ["Event data", "Event name, date, location, programme", "Permanent, as historical and organisational record", "Legitimate interest of the controller (Art. 6(1)(f) GDPR)", "Not deleted; may be archived"],
  ["Event data", "Attendee lists per event (name + status)", "5 years from the event, then anonymised", "Legitimate interest / performance of a contract", "Anonymisation; only aggregate data is retained"],
  ["Event data", "Photographs and recordings from events", "Permanent, provided attendees have been informed and consent exists", "Consent for individual/promotional photographs, or the controller's legitimate interest for atmosphere photographs of the event, subject to a balancing test", "Identifiable individuals removed upon the data subject's request"],
];

const WHATSAPP_BULLETS_HR = [
  "Različiti rokovi za različite vrste podataka: registracijski razgovor čuva se 2 godine, potvrda o plaćanju 11 godina, a privola 1 godinu nakon povlačenja. Svaka vrsta podataka mora biti pohranjena odvojeno s jasnom oznakom roka.",
  "WhatsApp Business API vs. privatni WhatsApp: preporučuje se korištenje WhatsApp Business API-ja, a ne privatnog broja. Poruke primljene putem API-ja mogu se arhivirati u interni sustav.",
  "Privola za WhatsApp komunikaciju mora biti dobivena prije slanja osobnih podataka. Registracijska i transakcijska komunikacija dopuštena je bez privole ako je korisnik sam inicirao kontakt. WhatsApp komunikacija ne koristi se za marketinške svrhe bez privole ispitanika.",
  "Sigurnost: platežne poveznice i osobni podaci ne smiju biti vidljivi u grupnim WhatsApp chatovima. Koristiti isključivo privatne razgovore za registracije i plaćanja.",
];

const WHATSAPP_BULLETS_EN = [
  "Different retention periods apply to different data types: the registration conversation is kept for 2 years, the payment confirmation for 11 years, and consent for 1 year after withdrawal. Each type of data must be stored separately with a clear retention marker.",
  "WhatsApp Business API vs. a private WhatsApp number: use of the WhatsApp Business API is recommended, rather than a private number. Messages received via the API may be archived into the internal system.",
  "Consent for WhatsApp communication must be obtained before personal data is sent. Registration and transactional communication is permitted without consent if the user initiated contact themselves. WhatsApp communication is not used for marketing purposes without the data subject's consent.",
  "Security: payment links and personal data must not be visible in group WhatsApp chats. Only private conversations must be used for registrations and payments.",
];

const PROC_BULLETS_HR = [
  "Godišnja revizija: jednom godišnje odgovorna osoba provjerava baze podataka i briše ili anonimizira podatke kojima je istekao rok čuvanja.",
  "Zahtjevi ispitanika: na zahtjev za brisanje postupiti u roku od 30 dana, osim za podatke koje je obvezno čuvati po zakonu.",
  "WhatsApp: poruke vezane uz registracije arhivirati u interni sustav odmah po zaključenju registracije. Na uređajima tvrtke postaviti automatsko brisanje poruka starijih od 24 mjeseca.",
  "Potvrde o plaćanju: pohraniti ih u računovodstveni sustav, uz rok čuvanja od 11 godina.",
  "Fotografije s događaja: voditi evidenciju privola. Na zahtjev ispitanika ukloniti fotografije na kojima je osoba prepoznatljiva.",
  "Dokumentacija o brisanju: za svaki ciklus brisanja voditi kratki zapis o tome što je obrisano, kada i tko je proveo brisanje.",
];

const PROC_BULLETS_EN = [
  "Annual review: once a year, the responsible person reviews the databases and deletes or anonymises data whose retention period has expired.",
  "Data subject requests: deletion requests must be actioned within 30 days, except for data that must be retained by law.",
  "WhatsApp: messages relating to registrations must be archived into the internal system immediately upon completion of the registration. Company devices must be set to automatically delete messages older than 24 months.",
  "Payment confirmations: store them in the accounting system, with an 11-year retention period.",
  "Event photographs: maintain a consent record. Upon the data subject's request, remove photographs in which the person is identifiable.",
  "Deletion documentation: for each deletion cycle, keep a brief record of what was deleted, when, and by whom.",
];

export default function DataRetention() {
  const { lang } = useLanguage();
  const isEn = lang === "en";

  const LAST_UPDATED = isEn ? LAST_UPDATED_EN : LAST_UPDATED_HR;
  const INTRO = isEn ? INTRO_EN : INTRO_HR;
  const ROWS = isEn ? ROWS_EN : ROWS_HR;
  const WHATSAPP_BULLETS = isEn ? WHATSAPP_BULLETS_EN : WHATSAPP_BULLETS_HR;
  const PROC_BULLETS = isEn ? PROC_BULLETS_EN : PROC_BULLETS_HR;

  const TABLE_HEADERS = isEn
    ? ["Data category", "Data type", "Retention period", "Legal basis", "Deletion"]
    : ["Kategorija podataka", "Vrsta podataka", "Rok čuvanja", "Pravna osnova", "Brisanje"];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ConvwayoHeader showBackToEvents />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: "Poppins, sans-serif" }}>
            {isEn ? "Personal Data Retention Policy" : "Pravila o čuvanju osobnih podataka"}
          </h1>
          <p className="text-sm text-muted-foreground">{LAST_UPDATED}</p>
        </div>

        <p className="text-base mb-10 leading-relaxed">{INTRO}</p>

        <div className="space-y-10">
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>
              {isEn ? "1. Data categories and retention periods" : "1. Kategorije podataka i rokovi čuvanja"}
            </h2>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm border-collapse min-w-[900px]">
                <thead className="bg-muted/50">
                  <tr>
                    {TABLE_HEADERS.map((h) => (
                      <th key={h} className="text-left font-semibold p-3 border-b border-border align-top">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      {row.map((cell, j) => (
                        <td key={j} className="p-3 align-top leading-relaxed">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>
              {isEn ? "2. Notes and clarifications" : "2. Napomene i pojašnjenja"}
            </h2>

            <h3 className="text-base font-semibold mt-4 mb-2">
              {isEn ? "Important note on financial documentation" : "Važna napomena o financijskoj dokumentaciji"}
            </h3>
            <p className="text-base leading-relaxed mb-3">
              {isEn
                ? "Pursuant to Art. 10 of the Croatian Accounting Act, business books, invoices and all financial documentation must be retained for at least 11 years. The processing and retention of this data is necessary for the controller to comply with a legal obligation, in accordance with Art. 6(1)(c) GDPR."
                : "Prema čl. 10. Zakona o računovodstvu, poslovne knjige, računi i sva financijska dokumentacija moraju se čuvati najmanje 11 godina. Obrada i čuvanje tih podataka nužni su radi ispunjenja zakonske obveze voditelja obrade sukladno čl. 6. st. 1. t. c) GDPR-a."}
            </p>

            <h3 className="text-base font-semibold mt-4 mb-2">
              {isEn ? "WhatsApp - specific notes for registration and payment" : "WhatsApp - specifične napomene za registraciju i plaćanje"}
            </h3>
            <ul className="list-disc list-inside space-y-1 text-base leading-relaxed">
              {WHATSAPP_BULLETS.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>

            <h3 className="text-base font-semibold mt-4 mb-2">
              {isEn ? "Payments" : "Plaćanja"}
            </h3>
            <p className="text-base leading-relaxed mb-3">
              {isEn
                ? "The platform does not request credit or debit card details, bank account numbers or other sensitive financial data from attendees via WhatsApp chat. Payment is carried out exclusively via a secure link that opens the protected interface of a certified payment processor compliant with the PCI DSS standard."
                : "Platforma ne traži od sudionika podatke o kreditnim ili debitnim karticama, bankovnim računima ni druge osjetljive financijske podatke putem WhatsApp chata. Plaćanje se provodi isključivo putem sigurne poveznice koja otvara zaštićeno sučelje certificiranog platnog procesora sukladnog PCI DSS standardu."}
            </p>

            <h3 className="text-base font-semibold mt-4 mb-2">
              {isEn ? "Permanent retention - conditions and recommendations" : "Trajno čuvanje - uvjeti i preporuke"}
            </h3>
            <p className="text-base leading-relaxed">
              {isEn
                ? "Event data, such as the name, date, location and programme, may be retained permanently as a historical record, provided it does not contain attendees' personal data. Photographs in which identifiable individuals appear require consent or another valid legal basis, as well as a right to erasure upon request. It is recommended that attendee lists be anonymised after 5 years, retaining only aggregate statistics on a permanent basis."
                : "Podaci o događajima, poput naziva, datuma, lokacije i programa, mogu se čuvati trajno kao povijesna evidencija, uz uvjet da ne sadrže osobne podatke sudionika. Fotografije na kojima su prepoznatljive osobe zahtijevaju privolu ili drugi valjani pravni temelj, te pravo na brisanje na zahtjev. Preporučuje se anonimizirati popise sudionika nakon 5 godina te trajno čuvati samo agregatne statistike."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>
              {isEn ? "3. Deletion and review procedure" : "3. Procedura brisanja i revizije"}
            </h2>
            <ul className="list-disc list-inside space-y-1 text-base leading-relaxed">
              {PROC_BULLETS.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>
              {isEn ? "4. International data transfers" : "4. Međunarodni prijenos podataka"}
            </h2>
            <p className="text-base leading-relaxed">
              {isEn
                ? "For service providers located outside the European Economic Area (e.g. Retell AI in the USA), the controller applies appropriate safeguards in accordance with Art. 46 GDPR, including Standard Contractual Clauses (SCCs) and a Transfer Impact Assessment (TIA), where applicable."
                : "Za pružatelje usluga izvan Europskog gospodarskog prostora (npr. Retell AI u SAD-u), voditelj obrade primjenjuje odgovarajuće zaštitne mjere sukladno čl. 46 GDPR-a, uključujući Standard Contractual Clauses (SCC) i procjenu učinka prijenosa podataka (Transfer Impact Assessment, TIA), kada je primjenjivo."}
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t text-center text-sm text-muted-foreground space-y-1">
          <p>{isEn ? "Data controller representative: Nikica Žunić" : "Odgovorna osoba: Nikica Žunić"}</p>
          <p>© Conwayo {new Date().getFullYear()}</p>
        </div>
      </main>
    </div>
  );
}
