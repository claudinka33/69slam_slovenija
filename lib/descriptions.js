/* Privzeti opisi po kroju (prve 3 črke šifre). Podatki: 69slam.com (sestava, mere, detajli).
 * Opis v CMS pri posameznem artiklu ima vedno prednost. */

const MICRO = { sl: "92 % poliester, 8 % elastan", hr: "92 % poliester, 8 % elastan", en: "92% polyester, 8% elastane" };
const STRETCH = { sl: "88 % poliester, 12 % elastan", hr: "88 % poliester, 12 % elastan", en: "88% polyester, 12% elastane" };
const POLY = { sl: "100 % poliestrska mikrofibra", hr: "100 % poliesterska mikrofibra", en: "100% polyester microfibre" };
const BAMBOO = { sl: "68 % bambus, 27 % bombaž, 5 % elastan", hr: "68 % bambus, 27 % pamuk, 5 % elastan", en: "68% bamboo, 27% cotton, 5% elastane" };

const L = { sl: ["Sestava", "Kroj", "Dolžina", "Velikosti"], hr: ["Sastav", "Kroj", "Duljina", "Veličine"], en: ["Fabric", "Fit", "Length", "Sizes"] };
const yrs = { sl: "let", hr: "god.", en: "yrs" };
const facts = (lang, f) => f.filter(([, v]) => v).map(([k, v]) => `${L[lang][k]}: ${String(v).replace(" let", " " + yrs[lang])}`).join(" · ");

const D = {
  MBY: {
    sl: ["Boksarice, ki so začele vse. Kroj do sredine stegna je mehak in hkrati daje oporo — ne leze navzgor in ostane na mestu ves dan. Raztegljiva mikrofibra se hitro suši in obdrži obliko tudi po mnogih pranjih. Za službo, trening in vse vmes.", [[0, MICRO.sl], [1, "box (do sredine stegna)"], [3, "XS–XXL"]]],
    hr: ["Bokserice s kojima je sve počelo. Kroj do sredine bedra mekan je i daje potporu — ne podiže se i ostaje na mjestu cijeli dan. Rastezljiva mikrofibra brzo se suši i zadržava oblik i nakon mnogo pranja. Za posao, trening i sve između.", [[0, MICRO.hr], [1, "box (do sredine bedra)"], [3, "XS–XXL"]]],
    en: ["The boxers that started it all. The mid-thigh fit is soft yet supportive — it doesn't ride up and stays in place all day. Stretchy microfibre dries fast and keeps its shape wash after wash. For work, training and everything in between.", [[0, MICRO.en], [1, "box (mid-thigh)"], [3, "XS–XXL"]]],
  },
  MCY: {
    sl: ["Isti kroj kot naše najbolj prodajane boksarice — z redkim printom. Vsak Limited Edition dizajn je izdelan v samo 500 kosih na svetu. Ko jih zmanjka, jih ni več.", [[0, MICRO.sl], [1, "box · omejena serija 500 kosov"], [3, "XS–XXL"]]],
    hr: ["Isti kroj kao naše najprodavanije bokserice — s rijetkim printom. Svaki Limited Edition dizajn izrađen je u samo 500 komada u svijetu. Kad nestanu, nema ih više.", [[0, MICRO.hr], [1, "box · ograničena serija 500 komada"], [3, "XS–XXL"]]],
    en: ["The same fit as our best-selling boxers — with a rare print. Every Limited Edition design is made in just 500 pieces worldwide. Once they're gone, they're gone.", [[0, MICRO.en], [1, "box · limited run of 500 pieces"], [3, "XS–XXL"]]],
  },
  MSY: {
    sl: ["Krajši kroj za tiste, ki ne marate dolgih hlačnic. HIP ima kratko hlačnico (notranji šiv ~6 cm), zato je neopazen pod ozkimi in kratkimi hlačami. Pas z vezenim napisom 69SLAM.", [[0, MICRO.sl], [1, "hip (krajša hlačnica)"], [3, "XS–XXL"]]],
    hr: ["Kraći kroj za one koji ne vole duge nogavice. HIP ima kratku nogavicu (unutarnji šav ~6 cm) pa se ne vidi ispod uskih i kratkih hlača. Pojas s izvezenim natpisom 69SLAM.", [[0, MICRO.hr], [1, "hip (kraća nogavica)"], [3, "XS–XXL"]]],
    en: ["A shorter cut for those who don't like long legs. The HIP has a short leg (inseam ~6 cm), so it stays invisible under slim trousers and shorts. Waistband with embroidered 69SLAM logo.", [[0, MICRO.en], [1, "hip (shorter leg)"], [3, "XS–XXL"]]],
  },
  BAMBUS: {
    sl: ["Najmehkejše spodnjice v naši ponudbi. Mešanica bambusa in bombaža je zračna, prijazna do kože in iz trajnostno pridobljenih vlaken. Zaobljeni šivi zadaj lepo oblikujejo, kroj se tesno prilega, a ne stiska.", [[0, BAMBOO.sl], [3, "XS–XXL"]]],
    hr: ["Najmekše gaće u našoj ponudi. Mješavina bambusa i pamuka prozračna je, nježna prema koži i od održivo dobivenih vlakana. Zaobljeni šavovi straga lijepo oblikuju, a kroj prianja bez stezanja.", [[0, BAMBOO.hr], [3, "XS–XXL"]]],
    en: ["The softest underwear we make. The bamboo-cotton blend is breathable, gentle on skin and made from sustainably sourced fibres. Rounded back seams shape nicely; the fit is snug without squeezing.", [[0, BAMBOO.en], [3, "XS–XXL"]]],
  },
  SSM: {
    sl: ["Kratke in zelo raztegljive — za maksimalno gibanje. 4-way stretch material se razteza v vse smeri in se hitro suši: odbojka na mivki, skok s pomola, tek po plaži. Elastičen pas z vrvico, stranski žep in zadnji žep s preklopom, notranja mrežica.", [[0, STRETCH.sl], [1, "volley short"], [2, "~28 cm"], [3, "XS–XXL"]]],
    hr: ["Kratke i jako rastezljive — za maksimalno kretanje. 4-way stretch materijal rasteže se u svim smjerovima i brzo se suši: odbojka na pijesku, skok s mola, trčanje po plaži. Elastični pojas s vezicom, bočni džep i stražnji džep s preklopom, unutarnja mrežica.", [[0, STRETCH.hr], [1, "volley short"], [2, "~28 cm"], [3, "XS–XXL"]]],
    en: ["Short and super stretchy — built for maximum movement. 4-way stretch fabric moves in every direction and dries fast: beach volleyball, pier jumps, running on the sand. Elastic waist with drawstring, side pocket and back flap pocket, inner mesh.", [[0, STRETCH.en], [1, "volley short"], [2, "~28 cm"], [3, "XS–XXL"]]],
  },
  SSN: {
    sl: ["Narejene za vodne športe in aktivne dni na plaži. Raztegljiv 4-way stretch material se giblje s tabo in se hitro suši. Elastičen pas z vrvico, stranski in zadnji žep, notranja mrežica.", [[0, STRETCH.sl], [1, "boardshort"], [2, "~38 cm"], [3, "XS–XXL"]]],
    hr: ["Napravljene za sportove na vodi i aktivne dane na plaži. Rastezljivi 4-way stretch materijal kreće se s tobom i brzo se suši. Elastični pojas s vezicom, bočni i stražnji džep, unutarnja mrežica.", [[0, STRETCH.hr], [1, "boardshort"], [2, "~38 cm"], [3, "XS–XXL"]]],
    en: ["Made for water sports and active beach days. Stretchy 4-way fabric moves with you and dries fast. Elastic waist with drawstring, side and back pocket, inner mesh.", [[0, STRETCH.en], [1, "boardshort"], [2, "~38 cm"], [3, "XS–XXL"]]],
  },
  SSB: {
    sl: ["Elastičen pas za maksimalno udobje — obuješ in greš. Raztegljiv 4-way stretch material se giblje s tabo in se hitro suši. Za aktivne dni na plaži in v vodi, z zadnjim in stranskim žepom ter notranjo mrežico.", [[0, STRETCH.sl], [1, "elastic waist · 4-way stretch"], [2, "~38 cm"], [3, "XS–XXL"]]],
    hr: ["Elastični pojas za maksimalnu udobnost — obuješ i ideš. Rastezljivi 4-way stretch materijal kreće se s tobom i brzo se suši. Za aktivne dane na plaži i u vodi, sa stražnjim i bočnim džepom te unutarnjom mrežicom.", [[0, STRETCH.hr], [1, "elastic waist · 4-way stretch"], [2, "~38 cm"], [3, "XS–XXL"]]],
    en: ["An elastic waist for maximum comfort — pull on and go. Stretchy 4-way fabric moves with you and dries fast. For active days at the beach and in the water, with back and side pocket and inner mesh.", [[0, STRETCH.en], [1, "elastic waist · 4-way stretch"], [2, "~38 cm"], [3, "XS–XXL"]]],
  },
  SEB: {
    sl: ["Elastičen pas za maksimalno udobje — obuješ in greš. Ležerne kopalke za cel dan na plaži, z zadnjim in stranskim žepom ter notranjo mrežico.", [[0, POLY.sl], [1, "elastic waist"], [2, "~38 cm"], [3, "XS–XXL"]]],
    hr: ["Elastični pojas za maksimalnu udobnost — obuješ i ideš. Ležerne kupaće za cijeli dan na plaži, sa stražnjim i bočnim džepom te unutarnjom mrežicom.", [[0, POLY.hr], [1, "elastic waist"], [2, "~38 cm"], [3, "XS–XXL"]]],
    en: ["An elastic waist for maximum comfort — pull on and go. Easy beach shorts for the whole day, with back and side pocket and inner mesh.", [[0, POLY.en], [1, "elastic waist"], [2, "~38 cm"], [3, "XS–XXL"]]],
  },
  SSC: {
    sl: ["Klasične kopalne hlače za vsak dan na plaži — živahni printi, ki ne ostanejo neopaženi. Pas z vrvico in ježkom, zadnji žep s preklopom, luknjice za odtekanje vode.", [[0, POLY.sl], [1, "classic"], [2, "~36 cm"]]],
    hr: ["Klasične kupaće hlače za svaki dan na plaži — živahni printovi koji ne prolaze nezapaženo. Pojas s vezicom i čičkom, stražnji džep s preklopom, rupice za otjecanje vode.", [[0, POLY.hr], [1, "classic"], [2, "~36 cm"]]],
    en: ["Classic swim shorts for every beach day — bold prints that don't go unnoticed. Drawstring waist with velcro, back flap pocket, eyelets for drainage.", [[0, POLY.en], [1, "classic"], [2, "~36 cm"]]],
  },
  SSL: {
    sl: ["Srednja dolžina do kolena — več pokritosti, še vedno sproščen poletni videz. V-razporka, vezalka z ježkom in zadnji žep z zadrgo za ključe.", [[0, POLY.sl], [1, "medium length"], [2, "~46 cm"], [3, "30–42 (obseg pasu v colah)"]]],
    hr: ["Srednja duljina do koljena — više pokrivenosti, i dalje opušten ljetni izgled. V-razrez, vezica s čičkom i stražnji džep s patentom za ključeve.", [[0, POLY.hr], [1, "medium length"], [2, "~46 cm"], [3, "30–42 (opseg struka u inčima)"]]],
    en: ["Knee-length medium cut — more coverage with a relaxed summer look. V-fly, lace-up waist with velcro and a zip back pocket for your keys.", [[0, POLY.en], [1, "medium length"], [2, "~46 cm"], [3, "30–42 (waist in inches)"]]],
  },
  SLL: {
    sl: ["Za tiste, ki imate radi daljše kopalke. V-razporka, pas z vezalko in luknjicami, zadnji in stranski žep s preklopom.", [[0, POLY.sl], [1, "long length"], [2, "~52 cm"]]],
    hr: ["Za one koji vole duže kupaće. V-razrez, pojas s vezicom i rupicama, stražnji i bočni džep s preklopom.", [[0, POLY.hr], [1, "long length"], [2, "~52 cm"]]],
    en: ["For those who like their boardies longer. V-fly, lace-up waist with eyelets, back and side flap pockets.", [[0, POLY.en], [1, "long length"], [2, "~52 cm"]]],
  },
};


/* ---------- ženske in otroci ---------- */
const NYLON = { sl: "najlon z elastanom (80–82 % / 18–20 %)", hr: "najlon s elastanom (80–82 % / 18–20 %)", en: "nylon with elastane (80–82% / 18–20%)" };
const W = (sl, hr, en, f) => ({ sl: [sl, f("sl")], hr: [hr, f("hr")], en: [en, f("en")] });
const swim = (cut) => (l) => [[0, NYLON[l]], [1, cut[l] || cut.sl]];
const cutOnly = (cut) => (l) => [[1, cut[l] || cut.sl]];
const SWIM_W = { sl: "Hitro sušeč, raztegljiv material, ki lepo objame telo in ohrani obliko.", hr: "Brzo sušeći, rastezljiv materijal koji lijepo prianja uz tijelo i zadržava oblik.", en: "Quick-drying, stretchy fabric that hugs the body and keeps its shape." };

Object.assign(D, {
  GYX: W("Spodnjice za vsak dan — izjemno udobne in lahke, da jih skoraj ne čutiš. Mehka, raztegljiva tkanina se prilagodi telesu. V istem printu je tudi spodnja majica.",
    "Gaćice za svaki dan — iznimno udobne i lagane, gotovo ih ne osjetiš. Meka, rastezljiva tkanina prilagođava se tijelu. U istom printu postoji i potkošulja.",
    "Everyday underwear — super comfy and so light you'll barely feel it. Soft, stretchy fabric moves with your body. A matching top is available in the same print.",
    (l) => [[0, MICRO[l]], [3, "XS–XL"]]),
  GYL: W("Lahka in udobna spodnja majica za vsak dan, pod oblačila ali za doma. Mehka, raztegljiva tkanina — v istem printu so tudi spodnjice.",
    "Lagana i udobna potkošulja za svaki dan, ispod odjeće ili za doma. Meka, rastezljiva tkanina — u istom printu postoje i gaćice.",
    "A light, comfy everyday top — under clothes or for lounging. Soft, stretchy fabric, with matching underwear in the same print.",
    (l) => [[0, MICRO[l]], [3, "XS–XL"]]),
  GWB: W("Neverjetno mehke in zračne spodnjice iz bambusa in bombaža. Odvajajo vlago, so prijazne do kože in narejene iz trajnostno pridobljenih vlaken.",
    "Nevjerojatno mekane i prozračne gaćice od bambusa i pamuka. Odvode vlagu, nježne su prema koži i izrađene od održivo dobivenih vlakana.",
    "Incredibly soft, breathable bamboo-cotton underwear. Moisture-wicking, gentle on skin and made from sustainably sourced fibres.",
    (l) => [[0, BAMBOO[l]], [3, "XS–XXL"]]),
  GPB: W("Mehka bambusova spodnja majica brez žic — zračna, prijazna do kože in udobna ves dan.",
    "Mekana bambusova potkošulja bez žica — prozračna, nježna prema koži i udobna cijeli dan.",
    "A soft, wire-free bamboo top — breathable, gentle on skin and comfortable all day.",
    (l) => [[0, BAMBOO[l]], [3, "XS–XXL"]]),
  BANDEAU: W(`Zgornji del brez naramnic z ravno linijo čez prsi — brez sledi naramnic od sonca. ${SWIM_W.sl}`, `Gornji dio bez naramenica s ravnom linijom preko grudi — bez tragova naramenica od sunca. ${SWIM_W.hr}`, `A strapless top with a straight neckline — no strap tan lines. ${SWIM_W.en}`, swim({ sl: "bandeau", hr: "bandeau", en: "bandeau" })),
  BUNNY: W("Zgornji del z nastavljivimi naramnicami na zavezovanje (»bunny«) — prilagodiš ga točno sebi. Lepo oblikuje in laska postavi.", "Gornji dio s podesivim naramenicama na vezanje (»bunny«) — prilagodiš ga točno sebi. Lijepo oblikuje i laska figuri.", "A top with adjustable bunny-tie straps — tie it exactly how you like. Sleek and flattering.",
    (l) => [[0, { sl: "82 % najlon, 18 % elastan", hr: "82 % najlon, 18 % elastan", en: "82% nylon, 18% elastane" }[l]], [1, "bunny"], [3, "XS–XL"]]),
  TWIST: W(`Zgornji del s prepletenim sprednjim delom, ki lepo oblikuje dekolte. ${SWIM_W.sl}`, `Gornji dio s prepletenim prednjim dijelom koji lijepo oblikuje dekolte. ${SWIM_W.hr}`, `A top with a twisted front that shapes the neckline beautifully. ${SWIM_W.en}`, swim({ sl: "twisted", hr: "twisted", en: "twisted" })),
  MOULD: W("Zgornji del z oblikovanimi košaricami in zavezovanjem za vratom — dobra opora in lepa oblika.", "Gornji dio s oblikovanim košaricama i vezanjem oko vrata — dobra potpora i lijep oblik.", "A top with moulded cups and a halter tie — good support and a beautiful shape.",
    (l) => [[0, { sl: "80 % najlon, 20 % elastan", hr: "80 % najlon, 20 % elastan", en: "80% nylon, 20% elastane" }[l]], [1, "mould cup"]]),
  BIKINI_TOP: W(`Klasičen bikini zgornji del na zavezovanje. ${SWIM_W.sl}`, `Klasičan bikini gornji dio na vezanje. ${SWIM_W.hr}`, `A classic tie bikini top. ${SWIM_W.en}`, swim({ sl: "bikini", hr: "bikini", en: "bikini" })),
  SURF: W("Zgornji del, narejen za surfanje in aktivne dni na vodi — višji izrez in prekrižan hrbet, da ostane na mestu tudi v valovih.", "Gornji dio stvoren za surfanje i aktivne dane na vodi — viši izrez i prekrižena leđa da ostane na mjestu i u valovima.", "A top made for surfing and active days in the water — higher neckline and crisscross back so it stays put in the waves.", swim({ sl: "surf", hr: "surf", en: "surf" })),
  TOP: W(`Zgornji del kopalk v printu 69SLAM — kombiniraj ga s spodnjim delom po svojem okusu. ${SWIM_W.sl}`, `Gornji dio kupaćeg u 69SLAM printu — kombiniraj ga s donjim dijelom po svom ukusu. ${SWIM_W.hr}`, `A 69SLAM print bikini top — mix and match with any bottom you like. ${SWIM_W.en}`, swim({ sl: "zgornji del", hr: "gornji dio", en: "top" })),
  CHEEKY: W(`Spodnji del cheeky kroja — spredaj pokrije, zadaj nekoliko bolj odkrije. ${SWIM_W.sl}`, `Donji dio cheeky kroja — sprijeda pokriva, straga malo više otkriva. ${SWIM_W.hr}`, `A cheeky-cut bottom — covered in front, a little more revealing at the back. ${SWIM_W.en}`, swim({ sl: "cheeky", hr: "cheeky", en: "cheeky" })),
  CHEEKY_W: W(`Spodnji del cheeky kroja s širšimi stranicami — udoben in stabilen. ${SWIM_W.sl}`, `Donji dio cheeky kroja sa širim stranicama — udoban i stabilan. ${SWIM_W.hr}`, `A cheeky-cut bottom with wider sides — comfortable and secure. ${SWIM_W.en}`, swim({ sl: "cheeky · široke stranice", hr: "cheeky · široke stranice", en: "cheeky · wide sides" })),
  REVERSIBLE: W(`Obojestranske — dva dizajna v enih kopalkah. Obrneš in imaš nov videz. ${SWIM_W.sl}`, `Dvostrane — dva dizajna u jednom kupaćem. Okreneš i imaš novi izgled. ${SWIM_W.hr}`, `Reversible — two designs in one. Flip it for a whole new look. ${SWIM_W.en}`, swim({ sl: "obojestranski spodnji del", hr: "dvostrani donji dio", en: "reversible bottom" })),
  BIKINI_BOTTOM: W(`Klasičen bikini spodnji del srednje pokritosti. ${SWIM_W.sl}`, `Klasičan bikini donji dio srednje pokrivenosti. ${SWIM_W.hr}`, `A classic bikini bottom with medium coverage. ${SWIM_W.en}`, swim({ sl: "bikini", hr: "bikini", en: "bikini" })),
  BRAZIL: W(`Spodnji del brazil kroja — manj pokrit zadaj, za manj sledi od sonca. ${SWIM_W.sl}`, `Donji dio brazil kroja — manje pokriven straga, za manje tragova od sunca. ${SWIM_W.hr}`, `A Brazilian-cut bottom — less coverage at the back for fewer tan lines. ${SWIM_W.en}`, swim({ sl: "brazil", hr: "brazil", en: "Brazilian" })),
  TANGA: W(`Spodnji del tanga kroja — najmanj pokrit, za čim manj sledi od sonca. ${SWIM_W.sl}`, `Donji dio tanga kroja — najmanje pokriven, za što manje tragova od sunca. ${SWIM_W.hr}`, `A tanga bottom — minimal coverage for minimal tan lines. ${SWIM_W.en}`, swim({ sl: "tanga", hr: "tanga", en: "tanga" })),
  HIPSTER: W(`Spodnji del hipster kroja — nekoliko višji pas in več pokritosti. ${SWIM_W.sl}`, `Donji dio hipster kroja — nešto viši struk i više pokrivenosti. ${SWIM_W.hr}`, `A hipster bottom — slightly higher waist and more coverage. ${SWIM_W.en}`, swim({ sl: "hipster", hr: "hipster", en: "hipster" })),
  MINISHORT: W(`Spodnji del v obliki mini hlačk — največ pokritosti in udobje za aktivne dni. ${SWIM_W.sl}`, `Donji dio u obliku mini hlačica — najviše pokrivenosti i udobnost za aktivne dane. ${SWIM_W.hr}`, `A mini-short bottom — the most coverage and comfort for active days. ${SWIM_W.en}`, swim({ sl: "mini short", hr: "mini short", en: "mini short" })),
  BOTTOM: W(`Spodnji del kopalk v printu 69SLAM — kombiniraj ga z zgornjim delom po svojem okusu. ${SWIM_W.sl}`, `Donji dio kupaćeg u 69SLAM printu — kombiniraj ga s gornjim dijelom po svom ukusu. ${SWIM_W.hr}`, `A 69SLAM print bikini bottom — mix and match with any top you like. ${SWIM_W.en}`, swim({ sl: "spodnji del", hr: "donji dio", en: "bottom" })),
  ONEPIECE: W(`Enodelne kopalke, ki lepo oblikujejo postavo in nudijo dobro oporo. ${SWIM_W.sl}`, `Jednodijelni kupaći koji lijepo oblikuje figuru i pruža dobru potporu. ${SWIM_W.hr}`, `A one-piece that flatters your shape and gives great support. ${SWIM_W.en}`, swim({ sl: "enodelne", hr: "jednodijelni", en: "one-piece" })),
  ONEPIECE_LS: W(`Enodelne kopalke z dolgimi rokavi — več zaščite pred soncem za surfanje, potapljanje in dolge dni na vodi. ${SWIM_W.sl}`, `Jednodijelni kupaći s dugim rukavima — više zaštite od sunca za surfanje, ronjenje i duge dane na vodi. ${SWIM_W.hr}`, `A long-sleeve one-piece — more sun protection for surfing, snorkelling and long days on the water. ${SWIM_W.en}`, swim({ sl: "enodelne · dolgi rokav", hr: "jednodijelni · dugi rukav", en: "one-piece · long sleeve" })),
  RASH_W: W("Kopalna majica z dolgimi rokavi iz tkanine z zaščito UPF 30+ — mehka, obstojna in se hitro posuši.", "Kupaća majica s dugim rukavima od tkanine sa zaštitom UPF 30+ — mekana, izdržljiva i brzo se suši.", "A long-sleeve rash vest in UPF 30+ fabric — soft, durable and quick-drying.",
    (l) => [[0, { sl: "82 % najlon, 18 % elastan · UPF 30+", hr: "82 % najlon, 18 % elastan · UPF 30+", en: "82% nylon, 18% elastane · UPF 30+" }[l]]]),
  ULUWATU: W("Oprijete kopalne hlačke z zaobljeno linijo nogavice in nastavljivim pasom — več pokritosti, a še vedno ženstven videz.", "Pripijene kupaće hlačice sa zaobljenom linijom nogavice i podesivim pojasom — više pokrivenosti, a i dalje ženstven izgled.", "Fitted swim shorts with a curved leg opening and adjustable waist — more coverage with a feminine look.",
    (l) => [[0, { sl: "82 % najlon, 18 % elastan", hr: "82 % najlon, 18 % elastan", en: "82% nylon, 18% elastane" }[l]], [3, "XS–XL"]]),
  BOARD_W: W("Ženske kopalne hlače za plažo in vodo — elastičen pas z vrvico, lahke in hitro sušeče.", "Ženske kupaće hlače za plažu i vodu — elastični pojas s vezicom, lagane i brzo se suše.", "Women's boardshorts for the beach and the water — elastic waist with drawstring, light and quick-drying.", cutOnly({ sl: "boardshort", hr: "boardshort", en: "boardshort" })),
  KBZ: W("Otroške boksarice iz mehke, raztegljive tkanine, ki odvaja vlago — za igro, šolo in šport.", "Dječje bokserice od meke, rastezljive tkanine koja odvodi vlagu — za igru, školu i sport.", "Kids' boxers in soft, stretchy, moisture-wicking fabric — for play, school and sport.",
    (l) => [[0, MICRO[l]], [3, "4–12 let"]]),
  KBD: W("Mehke otroške spodnjice iz bambusove mešanice — zračne in prijazne do občutljive otroške kože.", "Mekane dječje gaće od bambusove mješavine — prozračne i nježne prema osjetljivoj dječjoj koži.", "Soft kids' underwear in a bamboo blend — breathable and gentle on sensitive skin.", cutOnly({ sl: "otroške spodnjice", hr: "dječje gaće", en: "kids' underwear" })),
  KSB: W("Otroške kopalne hlače iz raztegljivega 4-way stretch materiala — elastičen pas, nad kolenom, notranja mrežica. Za skakanje v vodo brez omejitev.", "Dječje kupaće hlače od rastezljivog 4-way stretch materijala — elastični pojas, iznad koljena, unutarnja mrežica. Za skakanje u vodu bez ograničenja.", "Kids' 4-way stretch boardshorts — elastic waist, above the knee, inner mesh. Made for jumping in without limits.",
    (l) => [[0, STRETCH[l]], [1, "boardshort · 4-way stretch"]]),
  KVB: W("Otroške kopalne hlače z elastičnim pasom, stranskimi žepi in notranjo mrežico — lahke in hitro sušeče.", "Dječje kupaće hlače s elastičnim pojasom, bočnim džepovima i unutarnjom mrežicom — lagane i brzo se suše.", "Kids' boardshorts with elastic waist, side pockets and inner mesh — light and quick-drying.",
    (l) => [[0, POLY[l]], [1, "elastic waist"]]),
  KRL: W("Otroška kopalna majica z dolgimi rokavi iz tkanine z zaščito UPF 30+ — za brezskrbne dni na soncu.", "Dječja kupaća majica s dugim rukavima od tkanine sa zaštitom UPF 30+ — za bezbrižne dane na suncu.", "A kids' long-sleeve rash vest in UPF 30+ fabric — for carefree days in the sun.",
    (l) => [[0, { sl: "82 % najlon, 18 % elastan · UPF 30+", hr: "82 % najlon, 18 % elastan · UPF 30+", en: "82% nylon, 18% elastane · UPF 30+" }[l]], [3, "4–12 let"]]),
});

/* šifre (prve 3 črke) → kroj */
const ALIAS = {
  XBA: "BANDEAU", XBC: "BANDEAU", XBD: "BANDEAU",
  XBL: "BUNNY", XBX: "BUNNY", XBY: "BUNNY", XLB: "BUNNY",
  XST: "TWIST", XTB: "MOULD", XTG: "BIKINI_TOP", XTT: "BIKINI_TOP", XSF: "SURF", XBT: "TOP", XTK: "TOP",
  YBB: "CHEEKY", YBA: "CHEEKY_W", YLB: "REVERSIBLE", YCD: "REVERSIBLE",
  YTB: "BIKINI_BOTTOM", YCZ: "BIKINI_BOTTOM", YSC: "BIKINI_BOTTOM",
  YLC: "BRAZIL", YCA: "TANGA", YFP: "HIPSTER", YST: "MINISHORT", YSH: "MINISHORT",
  YBI: "BOTTOM", YBM: "BOTTOM", YBZ: "BOTTOM",
  YOP: "ONEPIECE", YMS: "ONEPIECE", YHP: "ONEPIECE", YPS: "ONEPIECE_LS",
  SSX: "SSL", SSW: "SSN", SSZ: "SSN", SLX: "SLL",
  GRL: "RASH_W", GSS: "ULUWATU", SGL: "BOARD_W", SGT: "BOARD_W",
};

const MEN_BAMBOO = new Set(["MPB", "MBW", "MBV", "MHB"]);

/** Opis po kroju ali null (potem se uporabi splošni opis skupine). */
export function cutDescription(p, lang = "sl") {
  const pre = String(p?.code || "").slice(0, 3).toUpperCase();
  const key = D[pre] ? pre : ALIAS[pre] || (MEN_BAMBOO.has(pre) ? "BAMBUS" : null);
  if (!key) return null;
  const e = D[key][lang] || D[key].sl;
  return `${e[0]}\n\n${facts(lang in L ? lang : "sl", e[1])}`;
}
