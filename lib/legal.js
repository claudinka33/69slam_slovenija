// Pravna besedila trgovine 69SLAM.si (samo slovenščina). Zadnja posodobitev spodaj.
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
        "Po povzetju: plačilo ob prevzemu pošiljke. Zaračunamo strošek odkupnine 1,50 €.",
      ]],
      ["p", "Ponudnik je zavezanec za DDV. Račun kupec prejme v elektronski obliki (PDF) na e-naslov, naveden ob naročilu. Vsa plačila so negotovinska."],
      ["h2", "5. Dostava"],
      ["p", "Dostavljamo na naslove v Republiki Sloveniji prek Pošte Slovenije. Podrobnosti o stroških in rokih so na strani Dostava in plačilo."],
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
        "Območje dostave: Republika Slovenija.",
        "Strošek dostave: 5,00 € na naročilo.",
        "Brezplačna dostava: pri naročilih v vrednosti 50,00 € ali več (po odbitih popustih).",
        "Odprema: praviloma v 2 delovnih dneh po potrditvi naročila; pri plačilu po predračunu v 2 delovnih dneh po prejemu plačila.",
        "Dostava po odpremi: praviloma 1–2 delovna dneva.",
      ]],
      ["p", "O odpremi kupca obvestimo po e-pošti. Če pošiljke ob dostavi ni mogoče vročiti, Pošta Slovenije pusti obvestilo o prispeli pošiljki; pošiljka kupca čaka na pošti v roku, navedenem na obvestilu."],
      ["p", "Če je pošiljka ob prevzemu vidno poškodovana ali ji manjka vsebina, priporočamo, da kupec to takoj uveljavlja pri dostavljavcu oziroma na pošti (zapisnik o poškodbi) in nas o tem obvesti."],
      ["h2", "Plačilo"],
      ["ul", [
        "Plačilna kartica (Visa, Mastercard, Apple Pay, Google Pay) – varno plačilo prek Stripe, brez doplačila.",
        "Predračun (UPN s QR-kodo) – brez doplačila; blago odpremimo po prejemu plačila. Rok plačila je 5 dni.",
        "Po povzetju – plačilo ob prevzemu, doplačilo za odkupnino 1,50 €.",
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
        "Reševanje reklamacij, odstopov in vprašanj: pogodba in naš zakoniti interes, da vam odgovorimo (člen 6(1)(f) GDPR).",
      ]],
      ["p", "Ne izvajamo avtomatiziranega sprejemanja odločitev ali profiliranja s pravnimi učinki."],
      ["h2", "Kako dolgo hranimo podatke"],
      ["ul", [
        "Podatki o naročilih in računi: 10 let po koncu leta, na katero se nanašajo (davčni predpisi).",
        "Podatki za e-novice: do preklica privolitve.",
        "Komunikacija (vprašanja, reklamacije): do 3 leta po zaključku zadeve.",
      ]],
      ["h2", "Komu podatke posredujemo"],
      ["p", "Podatke posredujemo samo pogodbenim obdelovalcem, ki jih potrebujemo za delovanje trgovine, in le v nujnem obsegu:"],
      ["ul", [
        "Pošta Slovenije d.o.o. – dostava pošiljk,",
        "Stripe Payments Europe Ltd. – obdelava kartičnih plačil,",
        "Vercel Inc. – gostovanje spletne strani in baze podatkov,",
        "Resend (Plus Five Five, Inc.) – pošiljanje potrditvenih e-sporočil in e-novic,",
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
      ["p", "Stran trenutno uporablja samo tehnologije, ki so nujne za delovanje trgovine: vsebina košarice in izbrani jezik se shranita v lokalno shrambo vašega brskalnika. Ti podatki ne zapustijo vaše naprave, dokler ne oddate naročila, in ne služijo sledenju. Zanje po Zakonu o elektronskih komunikacijah (ZEKom-2) soglasje ni potrebno."],
      ["h2", "Analitični in oglaševalski – samo z vašim soglasjem"],
      ["p", "Analitičnih ali oglaševalskih piškotkov (npr. Google Analytics, Meta Pixel, TikTok Pixel) stran ne nalaga brez vašega soglasja. Ko bodo ta orodja vključena, se bodo naložila šele po tem, ko jih boste potrdili v obvestilu o piškotkih; soglasje boste lahko kadarkoli spremenili ali preklicali prek povezave »Nastavitve piškotkov« v nogi strani."],
      ["h2", "Upravljanje v brskalniku"],
      ["p", "Piškotke in lokalno shrambo lahko kadarkoli izbrišete ali blokirate v nastavitvah svojega brskalnika. Če to storite, se košarica izprazni."],
    ],
  },
};
