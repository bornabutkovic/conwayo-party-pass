import { useLanguage } from "@/hooks/useLanguage";
import { ConvwayoHeader } from "@/components/ConvwayoHeader";

const LAST_UPDATED = "Svibanj 2026. (v1.0)";

const EN_NOTICE =
  "This legal document is currently published in Croatian only. An English version will be added soon.";

const INTRO =
  "Ovaj dokument definira rokove čuvanja osobnih podataka koje obrađuje Conwayo - Penta turistička agencija d.o.o. sa sjedištem na adresi Izidora Kršnjavoga 25, 10000 Zagreb, OIB: 31375495391, te pravnu osnovu za svaki rok, u skladu s Uredbom (EU) 2016/679 (GDPR) i primjenjivim hrvatskim zakonodavstvom. Nakon isteka propisanog roka, podaci se brišu ili anonimiziraju.";

const ROWS: [string, string, string, string, string][] = [
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

const WHATSAPP_BULLETS = [
  "Različiti rokovi za različite vrste podataka: registracijski razgovor čuva se 2 godine, potvrda o plaćanju 11 godina, a privola 1 godinu nakon povlačenja. Svaka vrsta podataka mora biti pohranjena odvojeno s jasnom oznakom roka.",
  "WhatsApp Business API vs. privatni WhatsApp: preporučuje se korištenje WhatsApp Business API-ja, a ne privatnog broja. Poruke primljene putem API-ja mogu se arhivirati u interni sustav.",
  "Privola za WhatsApp komunikaciju mora biti dobivena prije slanja osobnih podataka. Registracijska i transakcijska komunikacija dopuštena je bez privole ako je korisnik sam inicirao kontakt. WhatsApp komunikacija ne koristi se za marketinške svrhe bez privole ispitanika.",
  "Sigurnost: platežne poveznice i osobni podaci ne smiju biti vidljivi u grupnim WhatsApp chatovima. Koristiti isključivo privatne razgovore za registracije i plaćanja.",
];

const PROC_BULLETS = [
  "Godišnja revizija: jednom godišnje odgovorna osoba provjerava baze podataka i briše ili anonimizira podatke kojima je istekao rok čuvanja.",
  "Zahtjevi ispitanika: na zahtjev za brisanje postupiti u roku od 30 dana, osim za podatke koje je obvezno čuvati po zakonu.",
  "WhatsApp: poruke vezane uz registracije arhivirati u interni sustav odmah po zaključenju registracije. Na uređajima tvrtke postaviti automatsko brisanje poruka starijih od 24 mjeseca.",
  "Potvrde o plaćanju: pohraniti ih u računovodstveni sustav, uz rok čuvanja od 11 godina.",
  "Fotografije s događaja: voditi evidenciju privola. Na zahtjev ispitanika ukloniti fotografije na kojima je osoba prepoznatljiva.",
  "Dokumentacija o brisanju: za svaki ciklus brisanja voditi kratki zapis o tome što je obrisano, kada i tko je proveo brisanje.",
];

export default function DataRetention() {
  const { lang } = useLanguage();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ConvwayoHeader showBackToEvents />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: "Poppins, sans-serif" }}>
            Pravila o čuvanju osobnih podataka
          </h1>
          <p className="text-sm text-muted-foreground">{LAST_UPDATED}</p>
        </div>

        {lang === "en" && (
          <div className="mb-8 p-4 rounded-md border border-border bg-muted/50 text-sm text-muted-foreground">
            {EN_NOTICE}
          </div>
        )}

        <p className="text-base mb-10 leading-relaxed">{INTRO}</p>

        <div className="space-y-10">
          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>
              1. Kategorije podataka i rokovi čuvanja
            </h2>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm border-collapse min-w-[900px]">
                <thead className="bg-muted/50">
                  <tr>
                    {["Kategorija podataka", "Vrsta podataka", "Rok čuvanja", "Pravna osnova", "Brisanje"].map((h) => (
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
              2. Napomene i pojašnjenja
            </h2>

            <h3 className="text-base font-semibold mt-4 mb-2">Važna napomena o financijskoj dokumentaciji</h3>
            <p className="text-base leading-relaxed mb-3">
              Prema čl. 10. Zakona o računovodstvu, poslovne knjige, računi i sva financijska dokumentacija moraju se čuvati najmanje 11 godina. Obrada i čuvanje tih podataka nužni su radi ispunjenja zakonske obveze voditelja obrade sukladno čl. 6. st. 1. t. c) GDPR-a.
            </p>

            <h3 className="text-base font-semibold mt-4 mb-2">WhatsApp - specifične napomene za registraciju i plaćanje</h3>
            <ul className="list-disc list-inside space-y-1 text-base leading-relaxed">
              {WHATSAPP_BULLETS.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>

            <h3 className="text-base font-semibold mt-4 mb-2">Plaćanja</h3>
            <p className="text-base leading-relaxed mb-3">
              Platforma ne traži od sudionika podatke o kreditnim ili debitnim karticama, bankovnim računima ni druge osjetljive financijske podatke putem WhatsApp chata. Plaćanje se provodi isključivo putem sigurne poveznice koja otvara zaštićeno sučelje certificiranog platnog procesora sukladnog PCI DSS standardu.
            </p>

            <h3 className="text-base font-semibold mt-4 mb-2">Trajno čuvanje - uvjeti i preporuke</h3>
            <p className="text-base leading-relaxed">
              Podaci o događajima, poput naziva, datuma, lokacije i programa, mogu se čuvati trajno kao povijesna evidencija, uz uvjet da ne sadrže osobne podatke sudionika. Fotografije na kojima su prepoznatljive osobe zahtijevaju privolu ili drugi valjani pravni temelj, te pravo na brisanje na zahtjev. Preporučuje se anonimizirati popise sudionika nakon 5 godina te trajno čuvati samo agregatne statistike.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>
              3. Procedura brisanja i revizije
            </h2>
            <ul className="list-disc list-inside space-y-1 text-base leading-relaxed">
              {PROC_BULLETS.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>
              4. Međunarodni prijenos podataka
            </h2>
            <p className="text-base leading-relaxed">
              Za pružatelje usluga izvan Europskog gospodarskog prostora (npr. Retell AI u SAD-u), voditelj obrade primjenjuje odgovarajuće zaštitne mjere sukladno čl. 46 GDPR-a, uključujući Standard Contractual Clauses (SCC) i procjenu učinka prijenosa podataka (Transfer Impact Assessment, TIA), kada je primjenjivo.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t text-center text-sm text-muted-foreground space-y-1">
          <p>Odgovorna osoba: Nikica Žunić</p>
          <p>© Conwayo {new Date().getFullYear()}</p>
        </div>
      </main>
    </div>
  );
}
