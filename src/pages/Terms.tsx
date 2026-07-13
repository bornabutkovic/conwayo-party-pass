import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { ConvwayoHeader } from "@/components/ConvwayoHeader";

const LAST_UPDATED = "Zadnja izmjena: 29. Svibanj 2026.";

const EN_NOTICE =
  "This legal document is currently published in Croatian only. An English version will be added soon.";

const INTRO =
  'Conwayo je platforma u vlasništvu društva Penta turistička agencija d.o.o., Izidora Kršnjavoga 25, 10000 Zagreb, OIB: 31375495391 (dalje: „Conwayo", „Platforma", „mi"), koja, među ostalim, pruža usluge informacijskog društva.';

type Section = {
  h: string;
  p?: string;
  items?: string[];
  render?: "definitions" | "section15" | "section16";
};

const DEFINITIONS: { term: string; def: string }[] = [
  { term: "Organizator", def: "Pravna ili fizička osoba koja putem Platforme objavljuje i promovira događaj i prodaje kotizacije/ulaznice koje predstavljaju pravo sudjelovanja na tom događaju." },
  { term: "Kupac", def: "Je svaki posjetitelj koji je došao na Platformu sa namjerom da se informira i/ili kupi ulaznicu ponuđenu na Platformi. Kupac može i ne mora biti „potrošač\". Svojstvo potrošača može imati samo fizička osoba. Osoba mlađa od 16 godina ne može biti kupac u sustavu Conwayo. Conwayo će Kupcu u tijeku realizacije transakcije omogućiti da odabere djeluje li kao potrošač (plaćanje putem privatnog računa) ili djeluje iz svoje profesionalne djelatnosti, odnosno u zastupanju određenog Društva ili tržišnog subjekta (plaćanje putem R1 računa). Kada kupac prilikom kupovine ulaznice/kotizacije za neko događanje vrši transakcije za neku pravnu osobu ili tržišni subjekt te stoga traži izdavanje R1 računa, on se ne može smatrati potrošačem i na njega neće biti primjenjivi propisi o pravima potrošača." },
  { term: "Sudionik", def: "Sudionik je svaka fizička osoba koja je stekla pravo pristupa određenom događaju putem prijave Kupca." },
  { term: "Korisnik", def: "Svaka osoba koja koristi Platformu, uključujući Organizatore i Kupce." },
  { term: "Događaj", def: "Konferencija, edukacija, seminar, radionica, webinar, networking događaj ili drugo događanje objavljeno na Platformi." },
  { term: "Kotizacija/Ulaznica", def: "Pravo na pristup određenom događaju kojim se na dan događanja kupac legitimira Organizatoru." },
  { term: "Platforma Conwayo", def: "Conwayo nije organizator događaja, osim ako je izričito navedeno drugačije na stranici događaja. Conwayo omogućava sklapanje ugovora između Kupca i Organizatora, omogućava tehničku infrastrukturu, posreduje u naplati kotizacija, omogućava izdavanje računa i potvrda. Conwayo ne odgovara za: sadržaj događaja, kvalitetu programa, promjene termina, otkazivanje događaja, postupanja Organizatora, ispunjenje obveza Organizatora prema Kupcima. Conwayo odgovara za svoje obveze prema potrošačima koji koriste Platformu u domeni svojih obveza kao pružatelja usluge Platforme." },
];

const SECTIONS: Section[] = [
  {
    h: "1. Opis usluge",
    p: "Platforma Conwayo omogućuje Organizatorima: objavu događaja, prodaju ulaznica/kotizacija, digitalnu distribuciju ulaznica, kotizacija ili potvrda prijave, kontinuiran uvid u status korisničkih prijava i povijest izvršenih transakcija.\n\nPlatforma Conwayo omogućuje Kupcu: pregled događaja, prijava na događaje, kupnja kotizacija/ulaznica, pristup digitalnim ulaznicama ili akreditacijama (samo registriranim kupcima).\n\nConwayo djeluje kao tehnički operator i posrednik između Organizatora i Kupca, osim kada je izričito naznačeno drugačije.",
  },
  { h: "2. Definicije", render: "definitions" },
  {
    h: "3. Registracija i korisnički račun",
    p: "Za kupnju ulaznica/kotizacija registracija korisničkog računa nije nužna. Ako kupac pristupa platformi i obavlja kupnju kao Gost, potvrdu o kupnji, račun i ulaznicu dobit će na email adresu koju je upisao prilikom kupnje, no neće imati pristup na Platformu za naknadno preuzimanje ulaznice. Kupac koji na Platformi izradi svoj korisnički račun, osim primitka potvrde o kupnji, računa i ulaznice na svoju email adresu, imat će pristup povijesti svojih kupovina.\n\nKorisnik je odgovoran za: točnost podataka, sigurnost pristupnih podataka, sve aktivnosti izvršene putem njegova računa.\n\nZabranjeno je: korištenje tuđih podataka, dijeljenje korisničkog računa, zlouporaba Platforme.\n\nOsobe mlađe od 16 godina ne smiju koristiti Platformu.\n\nRegistracijom odnosno otvaranjem korisničkog računa, kupnjom ili preuzimanjem ulaznica na platformi Conwayo smatra se da je korisnik u cijelosti pročitao, razumio i prihvatio ove Uvjete prodaje i Opće uvjete korištenja Platforme.",
  },
  {
    h: "4. Promjene Uvjeta i sadržaja",
    p: "Conwayo zadržava pravo da u bilo kojem trenutku, i bez prethodne obavijesti, ukoliko to smatra potrebnim, ukine ili izmijeni ovdje navedene Uvjete prodaje. Stoga, savjetujemo Korisnike da s vremena na vrijeme ponovno pročitaju informacije sadržane u Uvjetima prodaje kako bi ostali informirani o takvim promjenama. Napominjemo da ukoliko dođe do promjena u Uvjetima prodaje te Korisnik nastavi koristiti sustav Conwayo podrazumijeva se da je nove Uvjete u cijelosti pročitao, razumio i prihvatio.\n\nConwayo može ukloniti ili ograničiti pristup sadržaju platforme, uključivo korisnički račun kupca, ako isti krši primjenjive propise, ove Opće uvjete, prava trećih osoba ili sigurnosne standarde platforme. Odluke o uklanjanju sadržaja mogu se donositi automatiziranim putem, uz pravo korisnika na prigovor putem dostupnog kanala na conwayo@conwayo.ai.",
  },
  {
    h: "5. Kupnja ulaznica/kotizacija",
    p: "Kupac može kupiti jednu ili više ulaznica/kotizacija pri čemu za svaku ulaznicu/kotizaciju unosi Ime i Prezime i email adresu osobe koja ostvaruje pravo sudjelovanja na događaju pod uvjetima koje određuje Organizator.\n\nPrije potvrde kupnje Kupcu će biti jasno prikazano: naziv, datum, vrijeme i lokacija događaja, cijena ulaznice/kotizacije, eventualne dodatne naknade, način plaćanja, uvjeti otkaza i sudjelovanja.\n\nKupnja se smatra dovršenom nakon uspješne autorizacije plaćanja (kartično plaćanje), ili primitkom uplate po ponudi, na transakcijski račun Platforme.\n\nNakon primitka uplate Kupac će primiti na svoju email adresu potvrdu o kupnji, račun, i ulaznicu za sudjelovanje na događaju.\n\nConwayo zadržava pravo odbiti ili poništiti transakciju u slučaju: sumnje na zlouporabu, tehničke greške, pogrešno prikazane cijene, kršenja ovih Uvjeta.",
  },
  {
    h: "6. Cijene i naknade",
    p: "Cijenu kotizacije određuje Organizator.\n\nConwayo može naplaćivati: naknadu za obradu transakcije, naknadu za korištenje Platforme, dodatne usluge.\n\nSve cijene prikazane su u eurima (EUR) i uključuju PDV kada je primjenjivo.\n\nUkupan iznos za plaćanje bit će prikazan prije završetka kupnje.",
  },
  {
    h: "7. Plaćanje",
    p: "Plaćanje se vrši putem ovlaštenih pružatelja platnih usluga (npr. Stripe).\n\nConwayo ne pohranjuje podatke o platnim karticama.\n\nOvisno o događaju, dostupni načini plaćanja mogu uključivati: kreditne i debitne kartice, bankovnu uplatu, druge digitalne metode plaćanja.\n\nKod plaćanja bankovnom uplatom: prijava vrijedi tek po evidentiranju uplate, sve rezervacije za koje nismo primili uplatu bit će otkazane.",
  },
  {
    h: "8. Dostava ulaznica/kotizacija i potvrda",
    p: "Nakon uspješne kupnje Kupac i svi Sudionici će: primiti potvrdu kupnje e-mailom, dobiti pristup digitalnoj ulaznici, QR kodu ili potvrdi prijave.\n\nOrganizator može odrediti: posebne uvjete pristupa, dodatnu identifikaciju, kasniju dostavu akreditacija.\n\nKupac i Sudionici su odgovorni za: čuvanje ulaznice, zaštitu QR koda, točnost kontakt podataka.",
  },
  {
    h: "9. Korištenje ulaznica/kotizacija",
    p: "Kupac je dužan čuvati kupljene Conwayo ulaznice/kotizacije, njihove barkodove te ih ne smije davati trećim osobama. Niti Conwayo niti Organizator nisu odgovorni za ukradene, izgubljene, uništene ili kopirane ulaznice. Kupac je svjestan da ukoliko mu netko ukrade cijelu ulaznicu/kotizaciju ili QR kod, Organizator u određenim slučajevima ne može znati da je ta Ulaznica ukradena i smatrat će se da prva osoba koja uđe na događaj sa tom Ulaznicom, njezinim QR kodom ima važeću Ulaznicu.\n\nPrilikom registracije na događaj, Organizator može provjeriti valjanost ulaznica/kotizacija Kupca na jedan od slijedećih načina: provjerom osobnog dokumenta Kupca, vizualnom provjerom isprintane ulaznice, provjerom ulaznice na mobitelu Kupca, provjerom koda ulaznice (QR kod i sl.) putem posebnog čitača. Kontrola ulaza je isključivo u nadležnosti Organizatora i Conwayo nije odgovoran za taj proces.\n\nReprodukcija, prodaja ili trgovanje Ulaznicama je strogo zabranjena, osim ako nije izričito navedeno drugačije.\n\nBilo koji pokušaj upotrebe Ulaznice koji nije u skladu s ovim uvjetima i pravilima će rezultirati prestankom važenja te Ulaznice.",
  },
  {
    h: "10. Otkazivanje događaja i povrat sredstava",
    p: "Conwayo nije organizator događaja te ne odlučuje o: otkazivanju, promjeni termina, izmjenama programa.\n\nOdluke o povratu sredstava donosi Organizator koji definira uvjete i rokove za otkazivanje kupnje i povrat sredstava za svaki svoj događaj.\n\nPovrat kotizacije moguć je samo: ako je događaj otkazan, ako je termin značajno promijenjen, ako je tako definirano u Uvjetima otkaza konkretnog događaja i u drugim slučajevima kada Organizator to odobri.\n\nPovrat nije moguć zbog: osobnih razloga Sudionika, bolesti, nemogućnosti dolaska, promjene mišljenja, poslovnih obveza.\n\nSukladno Zakonu o zaštiti potrošača, Sudionik nema pravo na jednostrani raskid ugovora za usluge vezane uz slobodno vrijeme koje se pružaju u točno određenom terminu.",
  },
  {
    h: "11. Naknade Platforme",
    p: "Naknade koje Conwayo naplaćuje za: obradu prijave, korištenje Platforme, obradu transakcije, izdavanje digitalne ulaznice ili akreditacije, smatraju se izvršenom uslugom nakon dovršetka kupnje te su nepovratne, osim ako je drugačije propisano obveznim zakonom.",
  },
  {
    h: "12. Ponašanje korisnika",
    p: "Korisnicima je zabranjeno: zloupotrebljavati Platformu, pokušavati neovlašten pristup sustavu, distribuirati zlonamjerni sadržaj, koristiti automatizirane alate za masovne prijave ili kupnje, kršiti prava drugih korisnika ili Organizatora.\n\nConwayo može: suspendirati korisnički račun, odbiti pristup Platformi, poništiti transakcije, ako utvrdi kršenje ovih Uvjeta ili sigurnosni rizik.",
  },
  {
    h: "13. Ograničenje odgovornosti",
    p: "Conwayo odgovara isključivo za pravilno funkcioniranje Platforme u razumnoj mjeri.\n\nConwayo ne odgovara za: postupke Organizatora, kvalitetu događaja, eventualnu štetu nastalu sudjelovanjem na događaju, gubitak podataka uzrokovan višom silom, tehničke prekide izvan svoje kontrole, rad trećih servisa (Stripe, Meta, Google i dr.).\n\nU najvećoj mjeri dopuštenoj zakonom, odgovornost Conwaya ograničena je na iznos naknada koje je Sudionik platio Conwayu za konkretnu transakciju.\n\nNištа u ovim Uvjetima ne isključuje prava potrošača zajamčena prisilnim propisima.",
  },
  {
    h: "14. Viša sila",
    p: "Conwayo ne odgovara za kašnjenja ili nemogućnost izvršenja obveza uzrokovanih: prirodnim nepogodama, ratom, epidemijama, kibernetičkim napadima, prekidima komunikacijskih mreža, odlukama tijela vlasti, tehničkim kvarovima izvan razumne kontrole.",
  },
  { h: "15. Zaštita osobnih podataka", render: "section15" },
  { h: "16. Prigovori i korisnička podrška", render: "section16" },
  {
    h: "17. Mjerodavno pravo i nadležnost",
    p: "Na ove Uvjete primjenjuje se pravo Republike Hrvatske.\n\nZa sve sporove nadležan je stvarno nadležni sud u Zagrebu, osim kada prisilni propisi zaštite potrošača određuju drugačije.",
  },
];

export default function Terms() {
  const { lang } = useLanguage();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ConvwayoHeader showBackToEvents />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: "Poppins, sans-serif" }}>
            Uvjeti kupnje
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
          {SECTIONS.map((s) => (
            <section key={s.h}>
              <h2 className="text-xl font-semibold mb-3" style={{ fontFamily: "Poppins, sans-serif" }}>
                {s.h}
              </h2>
              {s.p && <p className="text-base leading-relaxed mb-3 whitespace-pre-line">{s.p}</p>}
              {s.render === "definitions" && (
                <ul className="space-y-3 text-base leading-relaxed">
                  {DEFINITIONS.map((d) => (
                    <li key={d.term}>
                      <span className="font-semibold">{d.term}</span> — {d.def}
                    </li>
                  ))}
                </ul>
              )}
              {s.render === "section15" && (
                <>
                  <p className="text-base leading-relaxed mb-3 whitespace-pre-line">
                    {"Obrada osobnih podataka uređena je Politikom privatnosti dostupnom na Platformi.\n\nOrganizator i Conwayo mogu djelovati kao zasebni voditelji obrade, ovisno o prirodi obrade podataka."}
                  </p>
                  <p className="text-base leading-relaxed">
                    <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground transition-colors">
                      Pravila privatnosti
                    </Link>
                    {" · "}
                    <Link to="/data-retention" className="underline underline-offset-2 hover:text-foreground transition-colors">
                      Pravila o čuvanju osobnih podataka
                    </Link>
                  </p>
                </>
              )}
              {s.render === "section16" && (
                <p className="text-base leading-relaxed mb-3 whitespace-pre-line">
                  {"Pisani prigovor korisnik može poslati e-mailom na: "}
                  <a href="mailto:conwayo@conwayo.ai" className="underline underline-offset-2">
                    conwayo@conwayo.ai
                  </a>
                  {"\n\nOdgovor na prigovor bit će dostavljen najkasnije u roku od 15 dana od zaprimanja."}
                </p>
              )}
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
