// Pravna besedila trgovine 69SLAM.si (slovenščina + informativni hrvaški prevod DOCS_HR). Zadnja posodobitev spodaj.
export const LEGAL_UPDATED = "20. 9. 2026";

export const COMPANY = {
  name: "Freestyle Freak, spletna prodaja in storitve, d.o.o.",
  short: "Freestyle Freak d.o.o.",
  address: "Obrtniška ulica 14, 3240 Šmarje pri Jelšah, Slovenija",
  reg: "8724628000",
  vat: "SI19435134",
  court: "Okrožno sodišče v Celju",
  capital: "7.500,00 EUR",
  email: "69slamslovenia@gmail.com",
  phone: "040 993 317",
  returns: "Freestyle Freak d.o.o., Ulica na Livado 6, 3240 Šmarje pri Jelšah",
  iban: "SI56 0700 0000 3570 757",
  bank: "Gorenjska banka d.d.",
  bic: "GORESI2X",
  street: "Obrtniška ulica 14",
  city: "3240 Šmarje pri Jelšah",
};

const C = COMPANY;

export const DOC_ORDER = ["splosni-pogoji", "dostava-in-placilo", "vracila-in-odstop", "reklamacije", "zasebnost", "piskotki"];

export const DOCS = {
  "splosni-pogoji": {
    title: "Splošni pogoji poslovanja",
    desc: "Splošni pogoji poslovanja spletne trgovine 69SLAM.si.",
    body: [
      ["p", "Splošni pogoji poslovanja spletne trgovine 69SLAM.si (v nadaljevanju: trgovina) so sestavljeni v skladu z Zakonom o varstvu potrošnikov (ZVPot-1), Zakonom o elektronskem poslovanju na trgu (ZEPT), Splošno uredbo o varstvu podatkov (GDPR) in Zakonom o varstvu osebnih podatkov (ZVOP-2). Z oddajo naročila kupec potrjuje, da je s pogoji seznanjen in da se z njimi strinja."],
      ["h2", "1. Podatki o ponudniku"],
      ["ul", [
        `Firma: ${C.name}`,
        `Sedež: ${C.address}`,
        `Matična številka: ${C.reg}`,
        `ID za DDV: ${C.vat} (zavezanec za DDV)`,
        `Vpis v sodni register: ${C.court}`,
        `Osnovni kapital: ${C.capital}`,
        `E-pošta: ${C.email}`,
        `Telefon: ${C.phone}`,
      ]],
      ["h2", "2. Ponudba in cene"],
      ["p", "Vse cene so v evrih (EUR) in vključujejo 22 % DDV. Cene veljajo v trenutku oddaje naročila in nimajo vnaprej določene veljavnosti. Stroški dostave niso vključeni v ceno izdelka in so jasno prikazani v košarici in na blagajni pred oddajo naročila."],
      ["p", "Pri vsakem znižanju cene je kot prejšnja cena prikazana najnižja cena, po kateri je bil izdelek naprodaj v zadnjih 30 dneh pred znižanjem."],
      ["p", "Odprodaja −50 %: kadar je posamezen print na zalogi samo še v eni velikosti, se mu cena samodejno zniža za 50 %. Paket 3: ob nakupu treh kosov iz redne ponudbe v paketu se prizna 15 % popusta na paket. Izdelki v odprodaji niso del Paketa 3. Popusti in kode za popust se med seboj ne seštevajo, razen če je pri posamezni akciji izrecno navedeno drugače."],
      ["p", "Kljub skrbnemu preverjanju se lahko zgodi, da je podatek o ceni ali zalogi napačen. V tem primeru bomo kupca takoj obvestili in mu omogočili odstop od naročila ali potrditev naročila po pravilni ceni."],
      ["h2", "3. Postopek nakupa in sklenitev pogodbe"],
      ["ul", [
        "Kupec izbere izdelek in velikost ter ga doda v košarico.",
        "V košarici lahko pred oddajo naročila spreminja količine, odstrani izdelke ali sestavi Paket 3.",
        "Na blagajni vnese podatke za dostavo, izbere način plačila in pregleda povzetek naročila s končno ceno (izdelki, dostava, morebitni stroški odkupnine).",
        "Naročilo odda s klikom na gumb »Naročilo z obveznostjo plačila«. Do tega klika lahko napake pri vnosu kadarkoli popravi.",
        "Po oddaji prejme na svoj e-naslov potrdilo o prejemu naročila. Kupoprodajna pogodba je sklenjena, ko ponudnik naročilo potrdi po e-pošti.",
      ]],
      ["p", "Pogodba (naročilo) je v elektronski obliki shranjena pri ponudniku. Kupec lahko kopijo kadarkoli zahteva po e-pošti. Pogodba se sklepa v slovenskem jeziku. Nakup je mogoč brez registracije."],
      ["h2", "4. Načini plačila"],
      ["ul", [
        "Plačilna kartica (Visa, Mastercard, Apple Pay, Google Pay) prek ponudnika plačilnih storitev Stripe. Podatkov o kartici ponudnik ne vidi in ne hrani.",
        "Predračun (UPN): kupec prejme predračun s podatki za plačilo in QR-kodo. Rok plačila je 5 dni; blago odpremimo po prejemu plačila. Neplačana naročila po izteku roka štejemo za preklicana.",
        "Po povzetju (samo za dostavo v Slovenijo in na Hrvaško): plačilo ob prevzemu pošiljke. Zaračunamo strošek odkupnine 1,50 €.",
      ]],
      ["p", "Ponudnik je zavezanec za DDV. Račun kupec prejme v elektronski obliki (PDF) na e-naslov, naveden ob naročilu. Vsa plačila so negotovinska."],
      ["h2", "5. Dostava"],
      ["p", "Dostavljamo na naslove v Sloveniji in drugih državah Evropske unije (razen Cipra in Malte) prek Pošte Slovenije. Podrobnosti o stroških in rokih so na strani Dostava in plačilo."],
      ["h2", "6. Pravica do odstopa od pogodbe"],
      ["p", "Potrošnik ima pravico, da v 14 dneh od prevzema blaga brez navedbe razloga odstopi od pogodbe. Pogoji, postopek in obrazec so na strani Vračila in odstop od pogodbe."],
      ["h2", "7. Jamčevanje za skladnost blaga (stvarne napake)"],
      ["p", "Ponudnik odgovarja za vsako neskladnost blaga, ki obstaja ob dobavi in se pokaže v dveh letih od dobave. Podrobnosti in postopek so na strani Reklamacije in jamčevanje."],
      ["h2", "8. Varstvo osebnih podatkov"],
      ["p", "Ponudnik osebne podatke obdeluje skladno z GDPR in ZVOP-2. Podrobnosti so v Politiki zasebnosti."],
      ["h2", "9. Komunikacija in oglasna sporočila"],
      ["p", "Ponudnik bo s kupcem stopil v stik prek sredstev komunikacije na daljavo le v zvezi z naročilom, razen če se je kupec izrecno prijavil na e-novice. Vsako oglasno sporočilo je jasno označeno kot oglasno, pošiljatelj je razviden, vsebuje pa tudi preprosto možnost odjave."],
      ["h2", "10. Mladoletne osebe"],
      ["p", "Nakup v trgovini lahko opravijo polnoletne osebe. Mladoletne osebe lahko nakup opravijo le s soglasjem staršev ali skrbnikov."],
      ["h2", "11. Intelektualna lastnina"],
      ["p", "69SLAM je registrirana blagovna znamka njenega imetnika. Fotografije, besedila in grafične rešitve na tej strani so avtorsko zaščiteni in jih brez pisnega dovoljenja ni dovoljeno kopirati ali uporabljati v komercialne namene."],
      ["h2", "12. Pritožbe in reševanje sporov"],
      ["p", `Ponudnik ima vzpostavljen sistem obravnave pritožb. Pritožbo kupec pošlje na ${C.email}. Prejem potrdimo v petih delovnih dneh in sporočimo, kako dolgo bo obravnava predvidoma trajala. Prizadevamo si, da morebitne spore rešimo sporazumno.`],
      ["p", "Skladno z Zakonom o izvensodnem reševanju potrošniških sporov (ZIsRPS) obveščamo, da ponudnik ne priznava nobenega izvajalca izvensodnega reševanja potrošniških sporov kot pristojnega za reševanje potrošniškega spora, ki bi ga potrošnik lahko sprožil v skladu s tem zakonom. Za reševanje sporov je pristojno stvarno pristojno sodišče v Republiki Sloveniji; uporablja se slovensko pravo. Nadzor nad izvajanjem predpisov o varstvu potrošnikov opravlja Tržni inšpektorat Republike Slovenije."],
      ["h2", "13. Spremembe pogojev"],
      ["p", "Ponudnik lahko pogoje spremeni. Za posamezno naročilo veljajo pogoji, objavljeni v trenutku oddaje naročila."],
    ],
  },

  "dostava-in-placilo": {
    title: "Dostava in plačilo",
    desc: "Stroški in roki dostave ter načini plačila v spletni trgovini 69SLAM.si.",
    body: [
      ["h2", "Dostava"],
      ["ul", [
        "Dostavna služba: Pošta Slovenije.",
        "Območje dostave: Slovenija in države Evropske unije (razen Cipra in Malte).",
        "Slovenija: 5,00 € na naročilo, brezplačno pri naročilih 50,00 € ali več (po odbitih popustih).",
        "Hrvaška: 8,00 € na naročilo, brezplačno pri naročilih 80,00 € ali več.",
        "Druge države EU: po ceniku Pošte Slovenije za mednarodni paket (npr. Avstrija 17,26 €, Nemčija 18,30 €, Italija 24,27 €), brezplačno pri naročilih 80,00 € ali več. Točen znesek je prikazan na blagajni, ko izberete državo.",
        "Odprema: praviloma v 2 delovnih dneh po potrditvi naročila; pri plačilu po predračunu v 2 delovnih dneh po prejemu plačila.",
        "Dostava po odpremi: v Slovenijo in na Hrvaško praviloma 1–2 delovna dneva, v druge države EU praviloma 2–7 delovnih dni.",
      ]],
      ["p", "O odpremi kupca obvestimo po e-pošti. Če pošiljke ob dostavi ni mogoče vročiti, Pošta Slovenije pusti obvestilo o prispeli pošiljki; pošiljka kupca čaka na pošti v roku, navedenem na obvestilu."],
      ["p", "Če je pošiljka ob prevzemu vidno poškodovana ali ji manjka vsebina, priporočamo, da kupec to takoj uveljavlja pri dostavljavcu oziroma na pošti (zapisnik o poškodbi) in nas o tem obvesti."],
      ["h2", "Plačilo"],
      ["ul", [
        "Plačilna kartica (Visa, Mastercard, Apple Pay, Google Pay) – varno plačilo prek Stripe, brez doplačila.",
        "Predračun (UPN s QR-kodo) – brez doplačila; blago odpremimo po prejemu plačila. Rok plačila je 5 dni.",
        `Podatki za plačilo po predračunu: ${C.short}, ${C.address}; IBAN ${C.iban} (${C.bank}, BIC ${C.bic}); sklic SI00 + številka naročila.`,
        "Po povzetju – samo za dostavo v Slovenijo in na Hrvaško; plačilo ob prevzemu, doplačilo za odkupnino 1,50 €.",
      ]],
      ["p", "Vse cene vključujejo DDV. Račun prejme kupec po e-pošti v obliki PDF."],
    ],
  },

  "vracila-in-odstop": {
    title: "Vračila in odstop od pogodbe",
    desc: "Pravica do odstopa od pogodbe v 14 dneh, postopek vračila in obrazec za odstop.",
    body: [
      ["h2", "Pravica do odstopa v 14 dneh"],
      ["p", "Potrošnik ima pravico, da v 14 dneh brez navedbe razloga odstopi od pogodbe. Rok začne teči z dnem, ko potrošnik (ali oseba, ki jo je določil in ni prevoznik) pridobi dejansko posest nad blagom. Če je bilo z enim naročilom dobavljenih več kosov ločeno, rok teče od prevzema zadnjega kosa."],
      ["h2", "Kako odstopim od pogodbe"],
      ["p", `Odstop sporočite z nedvoumno izjavo, poslano v roku 14 dni na ${C.email} ali po pošti na naslov ${C.returns}. Uporabite lahko spodnji obrazec, ni pa obvezen. Prejem izjave vam nemudoma potrdimo po e-pošti. Šteje se, da je izjava pravočasna, če je poslana pred iztekom roka.`],
      ["h2", "Vračilo blaga"],
      ["ul", [
        "Blago vrnite najpozneje v 14 dneh po tem, ko ste nam sporočili odstop.",
        `Naslov za vračila: ${C.returns}.`,
        "Neposredne stroške vračila blaga (poštnino) nosi kupec. Pošiljk z odkupnino ne sprejemamo.",
        "Priložite kopijo računa ali številko naročila.",
      ]],
      ["h2", "V kakšnem stanju mora biti blago"],
      ["p", "Ker gre za spodnje perilo, izdelke iz higienskih razlogov pomerite čez svoje spodnje perilo. Sprejmemo tudi izdelke, ki ste jih vzeli iz embalaže in pomerili, če so nenošeni, neoprani, nepoškodovani, z originalnimi etiketami in v originalni embalaži. Potrošnik odgovarja za zmanjšanje vrednosti blaga, če je to posledica ravnanja, ki ni nujno potrebno za ugotovitev narave, lastnosti in delovanja blaga. Nošenih ali opranih izdelkov zato ne moremo sprejeti oziroma se kupnina ustrezno zniža."],
      ["h2", "Vračilo kupnine"],
      ["p", "Vsa prejeta plačila, vključno s stroški standardne dostave, vrnemo nemudoma, najpozneje pa v 14 dneh od prejema izjave o odstopu. Vračilo plačil lahko zadržimo do prevzema vrnjenega blaga ali dokler ne predložite dokazila, da ste blago poslali nazaj. Plačilo vrnemo z enakim plačilnim sredstvom, kot ste ga uporabili pri nakupu; pri plačilu po povzetju ali predračunu na vaš transakcijski račun."],
      ["p", "Če vrnete samo del Paketa 3, vam vrnemo znesek, ki ste ga za vrnjeni kos dejansko plačali (cena s paketnim popustom)."],
      ["h2", "Zamenjava velikosti"],
      ["p", `Če želite drugo velikost, nam pišite na ${C.email}. Če je želena velikost na zalogi, vam jo po prejemu vrnjenega izdelka pošljemo; strošek ponovne dostave krijemo mi.`],
      ["h2", "Obrazec za odstop od pogodbe"],
      ["p", "Obrazec izpolnite in pošljite le, če želite odstopiti od pogodbe:"],
      ["pre", `Prejemnik: ${C.short}, Ulica na Livado 6, 3240 Šmarje pri Jelšah, e-pošta: ${C.email}

Obveščam vas, da odstopam od pogodbe za prodajo naslednjega blaga:
____________________________________________

Številka naročila / računa: ________________
Naročeno dne: ____________  Prejeto dne: ____________

Ime in priimek potrošnika: ________________________
Naslov potrošnika: ________________________________
IBAN za vračilo kupnine (če ni bilo plačano s kartico): SI56 ______________________

Datum: ____________
Podpis potrošnika (samo, če se obrazec pošlje v papirni obliki): ____________`],
    ],
  },

  "reklamacije": {
    title: "Reklamacije in jamčevanje",
    desc: "Odgovornost za skladnost blaga (stvarne napake) in postopek reklamacije.",
    body: [
      ["h2", "Kdaj blago ni skladno s pogodbo"],
      ["p", "Blago je neskladno, če nima lastnosti, ki so opisane ob prodaji ali so običajne za istovrstno blago, če ne ustreza opisu, vrsti, količini ali kakovosti, če ni primerno za običajno uporabo ali če ne ustreza vzorcu oziroma fotografiji izdelka. Primeri: napaka v šivu, tiskarska napaka, napačen izdelek ali velikost v pošiljki."],
      ["h2", "Roki"],
      ["ul", [
        "Ponudnik odgovarja za neskladnost, ki obstaja ob dobavi blaga in se pokaže v dveh letih od dobave.",
        "Domneva se, da je neskladnost obstajala že ob dobavi, če se pokaže v enem letu od dobave.",
        "Potrošnik mora ponudnika o neskladnosti obvestiti v dveh mesecih od dneva, ko jo je odkril.",
      ]],
      ["h2", "Kako uveljavljam reklamacijo"],
      ["p", `Pišite na ${C.email}, navedite številko naročila, opišite napako in priložite fotografije. Omogočiti nam morate pregled blaga; izdelek pošljete na naslov ${C.returns}. Pri upravičeni reklamaciji vam stroške pošiljanja povrnemo.`],
      ["h2", "Pravice potrošnika"],
      ["p", "Potrošnik lahko najprej zahteva brezplačno vzpostavitev skladnosti (zamenjavo ali popravilo). Če to ni mogoče ali ni opravljeno v razumnem roku (največ 30 dni), lahko zahteva sorazmerno znižanje kupnine ali odstopi od pogodbe in zahteva vračilo plačanega zneska. Če se neskladnost pokaže v manj kot 30 dneh od dobave, lahko potrošnik takoj odstopi od pogodbe. V vsakem primeru ima potrošnik pravico do povračila škode po splošnih pravilih o odškodninski odgovornosti."],
      ["p", "Če obstoj neskladnosti ni sporen, zahtevi ugodimo čim prej, najpozneje pa v osmih dneh. Če je neskladnost sporna, na zahtevo pisno odgovorimo v osmih dneh od prejema."],
      ["h2", "Garancija"],
      ["p", "Za tekstilne izdelke se obvezna garancija ne izdaja. Pravice iz jamčevanja za skladnost blaga, opisane zgoraj, veljajo ne glede na to."],
    ],
  },

  "zasebnost": {
    title: "Politika zasebnosti",
    desc: "Kako 69SLAM.si obdeluje in varuje osebne podatke (GDPR, ZVOP-2).",
    body: [
      ["h2", "Upravljavec podatkov"],
      ["p", `${C.name}, ${C.address}, matična številka ${C.reg}, e-pošta: ${C.email}, telefon: ${C.phone}.`],
      ["h2", "Katere podatke obdelujemo, zakaj in na kateri podlagi"],
      ["ul", [
        "Izvedba naročila (ime in priimek, naslov, e-pošta, telefon, vsebina naročila, način plačila): pravna podlaga je pogodba (člen 6(1)(b) GDPR). Brez teh podatkov naročila ne moremo izvesti.",
        "Računi in knjigovodske listine: pravna podlaga je zakonska obveznost (člen 6(1)(c) GDPR – davčni in računovodski predpisi).",
        "E-novice in kupon za prvi nakup (e-naslov): pravna podlaga je vaša privolitev (člen 6(1)(a) GDPR), ki jo lahko kadarkoli prekličete s klikom na odjavo v vsakem sporočilu ali po e-pošti.",
        "Novice in ponudbe za podobne izdelke obstoječim kupcem (e-naslov, naveden ob nakupu): pravna podlaga je naš zakoniti interes (člen 6(1)(f) GDPR) in izjema za obstoječe stranke po zakonu o elektronskih komunikacijah. O tem vas obvestimo ob nakupu, odjavite pa se lahko v vsakem sporočilu.",
        "Opomnik za nedokončan nakup (e-naslov in vsebina košarice, vpisana v blagajni) ter prošnja za oceno kupljenih izdelkov po nakupu: pravna podlaga je naš zakoniti interes (člen 6(1)(f) GDPR). Tem sporočilom lahko kadarkoli ugovarjate s klikom na odjavo v sporočilu.",
        "Reševanje reklamacij, odstopov in vprašanj: pogodba in naš zakoniti interes, da vam odgovorimo (člen 6(1)(f) GDPR).",
      ]],
      ["p", "Ne izvajamo avtomatiziranega sprejemanja odločitev ali profiliranja s pravnimi učinki."],
      ["h2", "Kako dolgo hranimo podatke"],
      ["ul", [
        "Podatki o naročilih in računi: 10 let po koncu leta, na katero se nanašajo (davčni predpisi).",
        "Podatki za e-novice: do preklica privolitve.",
        "Shranjene nedokončane košarice: največ 90 dni.",
        "Komunikacija (vprašanja, reklamacije): do 3 leta po zaključku zadeve.",
      ]],
      ["h2", "Komu podatke posredujemo"],
      ["p", "Podatke posredujemo samo pogodbenim obdelovalcem, ki jih potrebujemo za delovanje trgovine, in le v nujnem obsegu:"],
      ["ul", [
        "Pošta Slovenije d.o.o. – dostava pošiljk,",
        "Stripe Payments Europe Ltd. – obdelava kartičnih plačil,",
        "Vercel Inc. – gostovanje spletne strani in baze podatkov,",
        "Resend (Plus Five Five, Inc.) – pošiljanje potrditvenih e-sporočil in e-novic,",
        "Google Ireland Ltd. (Google Analytics) in Meta Platforms Ireland Ltd. (Meta Pixel, Conversions API) – samo če ste za to dali soglasje v obvestilu o piškotkih (člen 6(1)(a) GDPR),",
        "računovodski servis – vodenje poslovnih knjig.",
      ]],
      ["p", "Nekateri obdelovalci imajo sedež v ZDA. Prenos podatkov poteka na podlagi sklepa o ustreznosti (EU–US Data Privacy Framework) oziroma standardnih pogodbenih klavzul. Podatkov ne prodajamo in jih ne posredujemo tretjim osebam za njihove lastne namene."],
      ["h2", "Vaše pravice"],
      ["p", `Imate pravico do dostopa do svojih podatkov, popravka, izbrisa (»pozaba«), omejitve obdelave, prenosljivosti podatkov in ugovora obdelavi ter pravico, da kadarkoli prekličete privolitev. Zahtevo pošljite na ${C.email}; odgovorimo v enem mesecu.`],
      ["p", "Če menite, da vaše podatke obdelujemo nezakonito, lahko vložite pritožbo pri Informacijskem pooblaščencu Republike Slovenije, Dunajska cesta 22, 1000 Ljubljana, www.ip-rs.si."],
      ["h2", "Varnost"],
      ["p", "Spletna stran uporablja šifrirano povezavo (HTTPS). Podatkov o plačilnih karticah ne vidimo in ne hranimo – obdeluje jih izključno ponudnik plačilnih storitev."],
    ],
  },

  "piskotki": {
    title: "Politika piškotkov",
    desc: "Kateri piškotki in podobne tehnologije se uporabljajo na 69SLAM.si.",
    body: [
      ["p", "Piškotki in podobne tehnologije (npr. lokalna shramba brskalnika) so majhne datoteke, ki jih spletna stran shrani v vašo napravo."],
      ["h2", "Nujni – brez soglasja"],
      ["p", "Za delovanje trgovine uporabljamo tehnologije, ki so nujne: vsebina košarice, izbrani jezik in vaša izbira glede piškotkov (ključ »consent69«) se shranijo v lokalno shrambo vašega brskalnika. Ti podatki ne služijo sledenju. Zanje po Zakonu o elektronskih komunikacijah (ZEKom-2) soglasje ni potrebno."],
      ["h2", "Analitični in oglaševalski – samo z vašim soglasjem"],
      ["p", "Spodnja orodja se naložijo šele, ko jih potrdite v obvestilu o piškotkih. Soglasje lahko kadarkoli spremenite ali prekličete prek povezave »Nastavitve piškotkov« v nogi strani."],
      ["ul", [
        "Google Analytics 4 (Google Ireland Ltd.) – analitični: statistika obiska in nakupov. Piškotka _ga in _ga_* (do 2 leti).",
        "Meta Pixel in Conversions API (Meta Platforms Ireland Ltd.) – oglaševalski: merjenje uspešnosti oglasov na Facebooku in Instagramu ter prikaz relevantnih oglasov. Piškotka _fbp in _fbc (do 90 dni). Če ste dali soglasje za oglaševalske piškotke, ob nakupu Meti posredujemo tudi zakodirane (zgoščene) kontaktne podatke iz naročila, da lahko izmeri učinek oglasov.",
      ]],
      ["p", "Če soglasja ne date, se ta orodja ne naložijo in trgovina deluje enako."],
      ["h2", "Upravljanje v brskalniku"],
      ["p", "Piškotke in lokalno shrambo lahko kadarkoli izbrišete ali blokirate v nastavitvah svojega brskalnika. Če to storite, se košarica izprazni."],
    ],
  },
};

/* ---------- Hrvatski prijevod (informativni; mjerodavna je slovenska verzija) ---------- */
export const DOCS_HR = {
  "splosni-pogoji": {
    title: "Opći uvjeti poslovanja",
    desc: "Opći uvjeti poslovanja web trgovine 69SLAM.si.",
    body: [
      ["p", "Opći uvjeti poslovanja web trgovine 69SLAM.si (u daljnjem tekstu: trgovina) sastavljeni su u skladu sa slovenskim Zakonom o zaštiti potrošača (ZVPot-1), Zakonom o elektroničkom poslovanju na tržištu (ZEPT), Općom uredbom o zaštiti podataka (GDPR) i Zakonom o zaštiti osobnih podataka (ZVOP-2). Slanjem narudžbe kupac potvrđuje da je upoznat s uvjetima i da se s njima slaže."],
      ["h2", "1. Podaci o pružatelju"],
      ["ul", [
        `Tvrtka: ${C.name}`,
        `Sjedište: ${C.address}`,
        `Matični broj: ${C.reg}`,
        `PDV ID broj: ${C.vat} (obveznik PDV-a)`,
        `Upis u sudski registar: ${C.court} (Okružni sud u Celju)`,
        `Temeljni kapital: ${C.capital}`,
        `E-pošta: ${C.email}`,
        `Telefon: ${C.phone}`,
      ]],
      ["h2", "2. Ponuda i cijene"],
      ["p", "Sve cijene iskazane su u eurima (EUR) i uključuju 22 % PDV-a. Cijene vrijede u trenutku slanja narudžbe i nemaju unaprijed određeno razdoblje važenja. Troškovi dostave nisu uključeni u cijenu proizvoda i jasno su prikazani u košarici i na blagajni prije slanja narudžbe."],
      ["p", "Kod svakog sniženja cijene kao prethodna cijena prikazuje se najniža cijena po kojoj je proizvod bio u prodaji u posljednjih 30 dana prije sniženja."],
      ["p", "Rasprodaja −50 %: kada je pojedini print na zalihi još samo u jednoj veličini, njegova se cijena automatski snižava za 50 %. Paket 3: pri kupnji tri komada iz redovne ponude u paketu odobrava se popust od 15 % na paket. Proizvodi na rasprodaji nisu dio Paketa 3. Popusti i kodovi za popust međusobno se ne zbrajaju, osim ako je kod pojedine akcije izričito navedeno drukčije."],
      ["p", "Unatoč pažljivoj provjeri može se dogoditi da je podatak o cijeni ili zalihi pogrešan. U tom ćemo slučaju kupca odmah obavijestiti i omogućiti mu odustajanje od narudžbe ili potvrdu narudžbe po ispravnoj cijeni."],
      ["h2", "3. Postupak kupnje i sklapanje ugovora"],
      ["ul", [
        "Kupac odabire proizvod i veličinu te ga dodaje u košaricu.",
        "U košarici prije slanja narudžbe može mijenjati količine, ukloniti proizvode ili složiti Paket 3.",
        "Na blagajni unosi podatke za dostavu, odabire način plaćanja i pregledava sažetak narudžbe s konačnom cijenom (proizvodi, dostava, eventualni trošak pouzeća).",
        "Narudžbu šalje klikom na gumb »Narudžba s obvezom plaćanja«. Do tog klika pogreške pri unosu može ispraviti u bilo kojem trenutku.",
        "Nakon slanja na svoju e-mail adresu prima potvrdu o primitku narudžbe. Kupoprodajni ugovor sklopljen je kada pružatelj narudžbu potvrdi e-poštom.",
      ]],
      ["p", "Ugovor (narudžba) pohranjen je kod pružatelja u elektroničkom obliku. Kupac kopiju može u bilo kojem trenutku zatražiti e-poštom. Ugovor se sklapa na slovenskom jeziku. Kupnja je moguća bez registracije."],
      ["h2", "4. Načini plaćanja"],
      ["ul", [
        "Platna kartica (Visa, Mastercard, Apple Pay, Google Pay) putem pružatelja platnih usluga Stripe. Pružatelj ne vidi i ne pohranjuje podatke o kartici.",
        "Predračun (UPN nalog): kupac prima predračun s podacima za plaćanje i QR kodom. Rok plaćanja je 5 dana; robu šaljemo nakon primitka uplate. Neplaćene narudžbe nakon isteka roka smatramo otkazanima.",
        "Pouzećem (samo za dostavu u Sloveniju i Hrvatsku): plaćanje pri preuzimanju pošiljke. Naplaćujemo trošak pouzeća od 1,50 €.",
      ]],
      ["p", "Pružatelj je obveznik PDV-a. Račun kupac prima u elektroničkom obliku (PDF) na e-mail adresu navedenu pri narudžbi. Sva su plaćanja bezgotovinska."],
      ["h2", "5. Dostava"],
      ["p", "Dostavljamo na adrese u Hrvatskoj, Sloveniji i ostalim državama Europske unije (osim Cipra i Malte) putem Pošte Slovenije. Pojedinosti o troškovima i rokovima nalaze se na stranici Dostava i plaćanje."],
      ["h2", "6. Pravo na jednostrani raskid ugovora"],
      ["p", "Potrošač ima pravo u roku od 14 dana od preuzimanja robe bez navođenja razloga jednostrano raskinuti ugovor. Uvjeti, postupak i obrazac nalaze se na stranici Povrat i jednostrani raskid ugovora."],
      ["h2", "7. Odgovornost za usklađenost robe (materijalni nedostaci)"],
      ["p", "Pružatelj odgovara za svaku neusklađenost robe koja postoji u trenutku isporuke i pokaže se u roku od dvije godine od isporuke. Pojedinosti i postupak nalaze se na stranici Reklamacije i jamstvo."],
      ["h2", "8. Zaštita osobnih podataka"],
      ["p", "Pružatelj obrađuje osobne podatke u skladu s GDPR-om i ZVOP-2. Pojedinosti se nalaze u Politici privatnosti."],
      ["h2", "9. Komunikacija i promotivne poruke"],
      ["p", "Pružatelj će s kupcem stupiti u kontakt sredstvima komunikacije na daljinu samo u vezi s narudžbom, osim ako se kupac izričito prijavio na e-novosti. Svaka promotivna poruka jasno je označena kao promotivna, pošiljatelj je vidljiv, a sadrži i jednostavnu mogućnost odjave."],
      ["h2", "10. Maloljetne osobe"],
      ["p", "Kupnju u trgovini mogu obaviti punoljetne osobe. Maloljetne osobe mogu obaviti kupnju samo uz suglasnost roditelja ili skrbnika."],
      ["h2", "11. Intelektualno vlasništvo"],
      ["p", "69SLAM je registrirani žig njegova nositelja. Fotografije, tekstovi i grafička rješenja na ovoj stranici zaštićeni su autorskim pravom i bez pisanog dopuštenja nije ih dopušteno kopirati ni koristiti u komercijalne svrhe."],
      ["h2", "12. Prigovori i rješavanje sporova"],
      ["p", `Pružatelj ima uspostavljen sustav rješavanja prigovora. Prigovor kupac šalje na ${C.email}. Primitak potvrđujemo u roku od pet radnih dana i javljamo koliko će rješavanje predvidivo trajati. Nastojimo eventualne sporove riješiti sporazumno.`],
      ["p", "U skladu sa slovenskim Zakonom o izvansudskom rješavanju potrošačkih sporova (ZIsRPS) obavještavamo da pružatelj ne priznaje nijednog izvođača izvansudskog rješavanja potrošačkih sporova kao nadležnog za rješavanje potrošačkog spora koji bi potrošač mogao pokrenuti u skladu s tim zakonom. Za rješavanje sporova nadležan je stvarno nadležni sud u Republici Sloveniji; primjenjuje se slovensko pravo. Nadzor nad provedbom propisa o zaštiti potrošača obavlja Tržni inšpektorat Republike Slovenije (Tržišni inspektorat Republike Slovenije)."],
      ["h2", "13. Izmjene uvjeta"],
      ["p", "Pružatelj može izmijeniti uvjete. Za pojedinu narudžbu vrijede uvjeti objavljeni u trenutku slanja narudžbe."],
    ],
  },

  "dostava-in-placilo": {
    title: "Dostava i plaćanje",
    desc: "Troškovi i rokovi dostave te načini plaćanja u web trgovini 69SLAM.si.",
    body: [
      ["h2", "Dostava"],
      ["ul", [
        "Dostavna služba: Pošta Slovenije.",
        "Područje dostave: Hrvatska, Slovenija i države Europske unije (osim Cipra i Malte).",
        "Hrvatska: 8,00 € po narudžbi, besplatno za narudžbe od 80,00 € ili više (nakon odbijenih popusta).",
        "Slovenija: 5,00 € po narudžbi, besplatno za narudžbe od 50,00 € ili više.",
        "Ostale države EU: prema cjeniku Pošte Slovenije za međunarodni paket (npr. Austrija 17,26 €, Njemačka 18,30 €, Italija 24,27 €), besplatno za narudžbe od 80,00 € ili više. Točan iznos prikazan je na blagajni nakon odabira države.",
        "Otprema: u pravilu u roku od 2 radna dana nakon potvrde narudžbe; pri plaćanju po predračunu u roku od 2 radna dana nakon primitka uplate.",
        "Dostava nakon otpreme: u Hrvatsku i Sloveniju u pravilu 1–2 radna dana, u ostale države EU u pravilu 2–7 radnih dana.",
      ]],
      ["p", "O otpremi kupca obavještavamo e-poštom. Ako pošiljku pri dostavi nije moguće uručiti, Pošta Slovenije ostavlja obavijest o pristigloj pošiljci; pošiljka čeka kupca u pošti u roku navedenom na obavijesti."],
      ["p", "Ako je pošiljka pri preuzimanju vidljivo oštećena ili joj nedostaje sadržaj, preporučujemo da kupac to odmah prijavi dostavljaču odnosno u pošti (zapisnik o oštećenju) i o tome nas obavijesti."],
      ["h2", "Plaćanje"],
      ["ul", [
        "Platna kartica (Visa, Mastercard, Apple Pay, Google Pay) – sigurno plaćanje putem Stripea, bez doplate.",
        "Predračun (UPN nalog s QR kodom) – bez doplate; robu šaljemo nakon primitka uplate. Rok plaćanja je 5 dana.",
        `Podaci za plaćanje po predračunu: ${C.short}, ${C.address}; IBAN ${C.iban} (${C.bank}, BIC ${C.bic}); poziv na broj SI00 + broj narudžbe.`,
        "Pouzećem – samo za dostavu u Hrvatsku i Sloveniju; plaćanje pri preuzimanju, doplata za pouzeće 1,50 €.",
      ]],
      ["p", "Sve cijene uključuju PDV. Račun kupac prima e-poštom u obliku PDF-a."],
    ],
  },

  "vracila-in-odstop": {
    title: "Povrat i jednostrani raskid ugovora",
    desc: "Pravo na jednostrani raskid ugovora u roku od 14 dana, postupak povrata i obrazac za raskid.",
    body: [
      ["h2", "Pravo na raskid u roku od 14 dana"],
      ["p", "Potrošač ima pravo u roku od 14 dana bez navođenja razloga jednostrano raskinuti ugovor. Rok počinje teći danom kada potrošač (ili osoba koju je odredio, a nije prijevoznik) stekne stvarni posjed nad robom. Ako je jednom narudžbom isporučeno više komada odvojeno, rok teče od preuzimanja posljednjeg komada."],
      ["h2", "Kako raskinuti ugovor"],
      ["p", `Raskid nam javite nedvosmislenom izjavom poslanom u roku od 14 dana na ${C.email} ili poštom na adresu ${C.returns}. Možete upotrijebiti obrazac u nastavku, ali nije obvezan. Primitak izjave odmah vam potvrđujemo e-poštom. Smatra se da je izjava pravodobna ako je poslana prije isteka roka.`],
      ["h2", "Povrat robe"],
      ["ul", [
        "Robu vratite najkasnije u roku od 14 dana nakon što ste nam javili raskid.",
        `Adresa za povrat: ${C.returns}.`,
        "Izravne troškove povrata robe (poštarinu) snosi kupac. Pošiljke s pouzećem ne primamo.",
        "Priložite kopiju računa ili broj narudžbe.",
      ]],
      ["h2", "U kakvom stanju roba mora biti"],
      ["p", "Budući da je riječ o donjem rublju, proizvode iz higijenskih razloga isprobajte preko svog donjeg rublja. Primamo i proizvode koje ste izvadili iz ambalaže i isprobali ako nisu nošeni, nisu prani, nisu oštećeni, imaju originalne etikete i nalaze se u originalnoj ambalaži. Potrošač odgovara za umanjenje vrijednosti robe ako je ono posljedica postupanja koje nije nužno za utvrđivanje prirode, svojstava i funkcioniranja robe. Nošene ili prane proizvode stoga ne možemo primiti odnosno kupovnina se razmjerno umanjuje."],
      ["h2", "Povrat kupovnine"],
      ["p", "Sva primljena plaćanja, uključujući troškove standardne dostave, vraćamo bez odgode, a najkasnije u roku od 14 dana od primitka izjave o raskidu. Povrat plaćanja možemo zadržati do primitka vraćene robe ili dok ne dostavite dokaz da ste robu poslali natrag. Plaćanje vraćamo istim sredstvom plaćanja koje ste upotrijebili pri kupnji; pri plaćanju pouzećem ili po predračunu na vaš transakcijski račun."],
      ["p", "Ako vratite samo dio Paketa 3, vraćamo vam iznos koji ste za vraćeni komad stvarno platili (cijena s paketnim popustom)."],
      ["h2", "Zamjena veličine"],
      ["p", `Ako želite drugu veličinu, pišite nam na ${C.email}. Ako je željena veličina na zalihi, poslat ćemo vam je nakon primitka vraćenog proizvoda; trošak ponovne dostave snosimo mi.`],
      ["h2", "Obrazac za jednostrani raskid ugovora"],
      ["p", "Obrazac ispunite i pošaljite samo ako želite raskinuti ugovor:"],
      ["pre", `Primatelj: ${C.short}, Ulica na Livado 6, 3240 Šmarje pri Jelšah, e-pošta: ${C.email}

Obavještavam vas da raskidam ugovor o prodaji sljedeće robe:
____________________________________________

Broj narudžbe / računa: ________________
Naručeno dana: ____________  Primljeno dana: ____________

Ime i prezime potrošača: ________________________
Adresa potrošača: ________________________________
IBAN za povrat kupovnine (ako nije plaćeno karticom): SI56 ______________________

Datum: ____________
Potpis potrošača (samo ako se obrazac šalje u papirnatom obliku): ____________`],
    ],
  },

  "reklamacije": {
    title: "Reklamacije i jamstvo",
    desc: "Odgovornost za usklađenost robe (materijalni nedostaci) i postupak reklamacije.",
    body: [
      ["h2", "Kada roba nije u skladu s ugovorom"],
      ["p", "Roba nije usklađena ako nema svojstva opisana pri prodaji ili uobičajena za istovrsnu robu, ako ne odgovara opisu, vrsti, količini ili kvaliteti, ako nije prikladna za uobičajenu uporabu ili ako ne odgovara uzorku odnosno fotografiji proizvoda. Primjeri: pogreška u šavu, pogreška u tisku, pogrešan proizvod ili veličina u pošiljci."],
      ["h2", "Rokovi"],
      ["ul", [
        "Pružatelj odgovara za neusklađenost koja postoji u trenutku isporuke robe i pokaže se u roku od dvije godine od isporuke.",
        "Pretpostavlja se da je neusklađenost postojala već pri isporuci ako se pokaže u roku od jedne godine od isporuke.",
        "Potrošač mora pružatelja obavijestiti o neusklađenosti u roku od dva mjeseca od dana kada ju je otkrio.",
      ]],
      ["h2", "Kako podnijeti reklamaciju"],
      ["p", `Pišite na ${C.email}, navedite broj narudžbe, opišite nedostatak i priložite fotografije. Morate nam omogućiti pregled robe; proizvod šaljete na adresu ${C.returns}. Kod opravdane reklamacije troškove slanja vam nadoknađujemo.`],
      ["h2", "Prava potrošača"],
      ["p", "Potrošač najprije može zahtijevati besplatno uspostavljanje usklađenosti (zamjenu ili popravak). Ako to nije moguće ili nije obavljeno u razumnom roku (najviše 30 dana), može zahtijevati razmjerno sniženje kupovnine ili raskinuti ugovor i zahtijevati povrat plaćenog iznosa. Ako se neusklađenost pokaže u roku kraćem od 30 dana od isporuke, potrošač može odmah raskinuti ugovor. U svakom slučaju potrošač ima pravo na naknadu štete prema općim pravilima o odgovornosti za štetu."],
      ["p", "Ako postojanje neusklađenosti nije sporno, zahtjevu udovoljavamo što prije, a najkasnije u roku od osam dana. Ako je neusklađenost sporna, na zahtjev pisano odgovaramo u roku od osam dana od primitka."],
      ["h2", "Jamstvo"],
      ["p", "Za tekstilne proizvode obvezno jamstvo se ne izdaje. Prava iz odgovornosti za usklađenost robe opisana gore vrijede bez obzira na to."],
    ],
  },

  "zasebnost": {
    title: "Politika privatnosti",
    desc: "Kako 69SLAM.si obrađuje i štiti osobne podatke (GDPR, ZVOP-2).",
    body: [
      ["h2", "Voditelj obrade podataka"],
      ["p", `${C.name}, ${C.address}, matični broj ${C.reg}, e-pošta: ${C.email}, telefon: ${C.phone}.`],
      ["h2", "Koje podatke obrađujemo, zašto i na kojoj osnovi"],
      ["ul", [
        "Izvršenje narudžbe (ime i prezime, adresa, e-pošta, telefon, sadržaj narudžbe, način plaćanja): pravna osnova je ugovor (članak 6. stavak 1. točka (b) GDPR-a). Bez tih podataka narudžbu ne možemo izvršiti.",
        "Računi i knjigovodstvene isprave: pravna osnova je zakonska obveza (članak 6. stavak 1. točka (c) GDPR-a – porezni i računovodstveni propisi).",
        "E-novosti i kupon za prvu kupnju (e-mail adresa): pravna osnova je vaša privola (članak 6. stavak 1. točka (a) GDPR-a), koju možete u bilo kojem trenutku povući klikom na odjavu u svakoj poruci ili e-poštom.",
        "Novosti i ponude za slične proizvode postojećim kupcima (e-mail adresa navedena pri kupnji): pravna osnova je naš legitimni interes (članak 6. stavak 1. točka (f) GDPR-a) i iznimka za postojeće kupce prema zakonu o elektroničkim komunikacijama. O tome vas obavještavamo pri kupnji, a odjaviti se možete u svakoj poruci.",
        "Podsjetnik za nedovršenu kupnju (e-mail adresa i sadržaj košarice upisani na blagajni) te molba za ocjenu kupljenih proizvoda nakon kupnje: pravna osnova je naš legitimni interes (članak 6. stavak 1. točka (f) GDPR-a). Tim porukama možete se u bilo kojem trenutku usprotiviti klikom na odjavu u poruci.",
        "Rješavanje reklamacija, raskida ugovora i pitanja: ugovor i naš legitimni interes da vam odgovorimo (članak 6. stavak 1. točka (f) GDPR-a).",
      ]],
      ["p", "Ne provodimo automatizirano donošenje odluka ni izradu profila s pravnim učincima."],
      ["h2", "Koliko dugo čuvamo podatke"],
      ["ul", [
        "Podaci o narudžbama i računi: 10 godina nakon isteka godine na koju se odnose (porezni propisi).",
        "Podaci za e-novosti: do povlačenja privole.",
        "Spremljene nedovršene košarice: najviše 90 dana.",
        "Komunikacija (pitanja, reklamacije): do 3 godine nakon zaključenja predmeta.",
      ]],
      ["h2", "Kome prosljeđujemo podatke"],
      ["p", "Podatke prosljeđujemo samo ugovornim izvršiteljima obrade koji su nam potrebni za rad trgovine, i to samo u nužnom opsegu:"],
      ["ul", [
        "Pošta Slovenije d.o.o. – dostava pošiljaka,",
        "Stripe Payments Europe Ltd. – obrada kartičnih plaćanja,",
        "Vercel Inc. – hosting web stranice i baze podataka,",
        "Resend (Plus Five Five, Inc.) – slanje e-poruka s potvrdama i e-novosti,",
        "Google Ireland Ltd. (Google Analytics) i Meta Platforms Ireland Ltd. (Meta Pixel, Conversions API) – samo ako ste za to dali privolu u obavijesti o kolačićima (članak 6. stavak 1. točka (a) GDPR-a),",
        "računovodstveni servis – vođenje poslovnih knjiga.",
      ]],
      ["p", "Neki izvršitelji obrade imaju sjedište u SAD-u. Prijenos podataka odvija se na temelju odluke o primjerenosti (EU–US Data Privacy Framework) odnosno standardnih ugovornih klauzula. Podatke ne prodajemo i ne prosljeđujemo trećim osobama za njihove vlastite svrhe."],
      ["h2", "Vaša prava"],
      ["p", `Imate pravo na pristup svojim podacima, ispravak, brisanje (»pravo na zaborav«), ograničenje obrade, prenosivost podataka i prigovor na obradu te pravo da u bilo kojem trenutku povučete privolu. Zahtjev pošaljite na ${C.email}; odgovaramo u roku od mjesec dana.`],
      ["p", "Ako smatrate da vaše podatke obrađujemo nezakonito, možete podnijeti pritužbu Informacijskom povjereniku Republike Slovenije (Informacijski pooblaščenec), Dunajska cesta 22, 1000 Ljubljana, www.ip-rs.si."],
      ["h2", "Sigurnost"],
      ["p", "Web stranica koristi šifriranu vezu (HTTPS). Podatke o platnim karticama ne vidimo i ne pohranjujemo – obrađuje ih isključivo pružatelj platnih usluga."],
    ],
  },

  "piskotki": {
    title: "Politika kolačića",
    desc: "Koji se kolačići i slične tehnologije koriste na 69SLAM.si.",
    body: [
      ["p", "Kolačići i slične tehnologije (npr. lokalna pohrana preglednika) male su datoteke koje web stranica sprema na vaš uređaj."],
      ["h2", "Nužni – bez privole"],
      ["p", "Za rad trgovine koristimo nužne tehnologije: sadržaj košarice, odabrani jezik i vaš odabir u vezi s kolačićima (ključ »consent69«) spremaju se u lokalnu pohranu vašeg preglednika. Ti podaci ne služe praćenju. Za njih prema slovenskom Zakonu o elektroničkim komunikacijama (ZEKom-2) privola nije potrebna."],
      ["h2", "Analitički i marketinški – samo uz vašu privolu"],
      ["p", "Alati u nastavku učitavaju se tek kada ih potvrdite u obavijesti o kolačićima. Privolu možete u bilo kojem trenutku promijeniti ili povući putem poveznice »Postavke kolačića« u podnožju stranice."],
      ["ul", [
        "Google Analytics 4 (Google Ireland Ltd.) – analitički: statistika posjeta i kupnji. Kolačići _ga i _ga_* (do 2 godine).",
        "Meta Pixel i Conversions API (Meta Platforms Ireland Ltd.) – marketinški: mjerenje uspješnosti oglasa na Facebooku i Instagramu te prikaz relevantnih oglasa. Kolačići _fbp i _fbc (do 90 dana). Ako ste dali privolu za marketinške kolačiće, pri kupnji Meti prosljeđujemo i kodirane (hashirane) kontaktne podatke iz narudžbe kako bi mogla izmjeriti učinak oglasa.",
      ]],
      ["p", "Ako ne date privolu, ti se alati ne učitavaju, a trgovina radi jednako."],
      ["h2", "Upravljanje u pregledniku"],
      ["p", "Kolačiće i lokalnu pohranu možete u bilo kojem trenutku izbrisati ili blokirati u postavkama svog preglednika. Ako to učinite, košarica se prazni."],
    ],
  },
};

/** Pravna besedila za jezik (hr = prevod, sicer slovenščina). */
export const getDocs = (lang) => (lang === "hr" ? DOCS_HR : DOCS);
