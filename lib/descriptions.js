/* Privzeti opisi po kroju (prve 3 črke šifre). Podatki: 69slam.com (sestava, mere, detajli).
 * Opis v CMS pri posameznem artiklu ima vedno prednost. */

const MICRO = { sl: "92 % poliester, 8 % elastan", hr: "92 % poliester, 8 % elastan", en: "92% polyester, 8% elastane" };
const STRETCH = { sl: "88 % poliester, 12 % elastan", hr: "88 % poliester, 12 % elastan", en: "88% polyester, 12% elastane" };
const POLY = { sl: "100 % poliestrska mikrofibra", hr: "100 % poliesterska mikrofibra", en: "100% polyester microfibre" };
const BAMBOO = { sl: "68 % bambus, 27 % bombaž, 5 % elastan", hr: "68 % bambus, 27 % pamuk, 5 % elastan", en: "68% bamboo, 27% cotton, 5% elastane" };

const L = { sl: ["Sestava", "Kroj", "Dolžina", "Velikosti", "Lastnosti", "UV zaščita"], hr: ["Sastav", "Kroj", "Duljina", "Veličine", "Značajke", "UV zaštita"], en: ["Fabric", "Fit", "Length", "Sizes", "Features", "UV protection"] };
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
    hr: ["Najmekše bokserice u našoj ponudi. Mješavina bambusa i pamuka prozračna je, nježna prema koži i od održivo dobivenih vlakana. Zaobljeni šavovi straga lijepo oblikuju, a kroj prianja bez stezanja.", [[0, BAMBOO.hr], [3, "XS–XXL"]]],
    en: ["The softest underwear we make. The bamboo-cotton blend is breathable, gentle on skin and made from sustainably sourced fibres. Rounded back seams shape nicely; the fit is snug without squeezing.", [[0, BAMBOO.en], [3, "XS–XXL"]]],
  },
  SSM: {
    sl: ["Kratke in zelo raztegljive — za maksimalno gibanje. 4-way stretch material se razteza v vse smeri in se hitro suši: odbojka na mivki, skok s pomola, tek po plaži. Elastičen pas z vrvico, dva stranska žepa in notranja mrežica.", [[0, STRETCH.sl], [1, "volley short"], [2, "~28 cm"], [3, "XS–XXL"]]],
    hr: ["Kratke i jako rastezljive — za maksimalno kretanje. 4-way stretch materijal rasteže se u svim smjerovima i brzo se suši: odbojka na pijesku, skok s mola, trčanje po plaži. Elastični pojas s vezicom, dva bočna džepa i unutarnja mrežica.", [[0, STRETCH.hr], [1, "volley short"], [2, "~28 cm"], [3, "XS–XXL"]]],
    en: ["Short and super stretchy — built for maximum movement. 4-way stretch fabric moves in every direction and dries fast: beach volleyball, pier jumps, running on the sand. Elastic waist with drawstring, two side pockets and inner mesh.", [[0, STRETCH.en], [1, "volley short"], [2, "~28 cm"], [3, "XS–XXL"]]],
  },
  SSN: {
    sl: ["Narejene za vodne športe in aktivne dni na plaži. Raztegljiv 4-way stretch material se giblje s tabo in se hitro suši. Elastičen pas z vrvico in stranski žep. Brez notranje mrežice.", [[0, STRETCH.sl], [1, "boardshort"], [2, "~38 cm"], [3, "XS–XXL"]]],
    hr: ["Napravljene za sportove na vodi i aktivne dane na plaži. Rastezljivi 4-way stretch materijal kreće se s tobom i brzo se suši. Elastični pojas s vezicom i bočni džep. Bez unutarnje mrežice.", [[0, STRETCH.hr], [1, "boardshort"], [2, "~38 cm"], [3, "XS–XXL"]]],
    en: ["Made for water sports and active beach days. Stretchy 4-way fabric moves with you and dries fast. Elastic waist with drawstring and a side pocket. No inner mesh.", [[0, STRETCH.en], [1, "boardshort"], [2, "~38 cm"], [3, "XS–XXL"]]],
  },
  SSB: {
    sl: ["Elastičen pas za maksimalno udobje — oblečeš in greš. Raztegljiv 4-way stretch material se giblje s tabo in se hitro suši. Za aktivne dni na plaži in v vodi, z dvema stranskima žepoma in notranjo mrežico.", [[0, STRETCH.sl], [1, "elastic waist · 4-way stretch"], [2, "~38 cm"], [3, "XS–XXL"]]],
    hr: ["Elastični pojas za maksimalnu udobnost — obučeš i ideš. Rastezljivi 4-way stretch materijal kreće se s tobom i brzo se suši. Za aktivne dane na plaži i u vodi, s dva bočna džepa i unutarnjom mrežicom.", [[0, STRETCH.hr], [1, "elastic waist · 4-way stretch"], [2, "~38 cm"], [3, "XS–XXL"]]],
    en: ["An elastic waist for maximum comfort — pull on and go. Stretchy 4-way fabric moves with you and dries fast. For active days at the beach and in the water, with two side pockets and inner mesh.", [[0, STRETCH.en], [1, "elastic waist · 4-way stretch"], [2, "~38 cm"], [3, "XS–XXL"]]],
  },
  SEB: {
    sl: ["Elastičen pas za maksimalno udobje — oblečeš in greš. Ležerne kopalke za cel dan na plaži, z dvema stranskima žepoma in notranjo mrežico.", [[0, POLY.sl], [1, "elastic waist"], [2, "~38 cm"], [3, "XS–XXL"]]],
    hr: ["Elastični pojas za maksimalnu udobnost — obučeš i ideš. Ležerne kupaće hlače za cijeli dan na plaži, s dva bočna džepa i unutarnjom mrežicom.", [[0, POLY.hr], [1, "elastic waist"], [2, "~38 cm"], [3, "XS–XXL"]]],
    en: ["An elastic waist for maximum comfort — pull on and go. Easy beach shorts for the whole day, with two side pockets and inner mesh.", [[0, POLY.en], [1, "elastic waist"], [2, "~38 cm"], [3, "XS–XXL"]]],
  },
  SSC: {
    sl: ["Klasične kopalne hlače za vsak dan na plaži — živahni printi, ki ne ostanejo neopaženi. Pas z vrvico in ježkom, zadnji žep s preklopom, luknjice za odtekanje vode. Brez notranje mrežice.", [[0, POLY.sl], [1, "classic"], [2, "~36 cm"]]],
    hr: ["Klasične kupaće hlače za svaki dan na plaži — živahni printovi koji ne prolaze nezapaženo. Pojas s vezicom i čičkom, stražnji džep s preklopom, rupice za otjecanje vode. Bez unutarnje mrežice.", [[0, POLY.hr], [1, "classic"], [2, "~36 cm"]]],
    en: ["Classic swim shorts for every beach day — bold prints that don't go unnoticed. Drawstring waist with velcro, back flap pocket, eyelets for drainage. No inner mesh.", [[0, POLY.en], [1, "classic"], [2, "~36 cm"]]],
  },
  SSL: {
    sl: ["Srednja dolžina do kolena — več pokritosti, še vedno sproščen poletni videz. V-razporka, vezalka z ježkom in zadnji žep z zadrgo za ključe. Brez notranje mrežice.", [[0, POLY.sl], [1, "medium length"], [2, "~46 cm"], [3, "30–42 (obseg pasu v colah)"]]],
    hr: ["Srednja duljina do koljena — više pokrivenosti, i dalje opušten ljetni izgled. V-razrez, vezica s čičkom i stražnji džep s patentom za ključeve. Bez unutarnje mrežice.", [[0, POLY.hr], [1, "medium length"], [2, "~46 cm"], [3, "30–42 (opseg struka u inčima)"]]],
    en: ["Knee-length medium cut — more coverage with a relaxed summer look. V-fly, lace-up waist with velcro and a zip back pocket for your keys. No inner mesh.", [[0, POLY.en], [1, "medium length"], [2, "~46 cm"], [3, "30–42 (waist in inches)"]]],
  },
  SLL: {
    sl: ["Za tiste, ki imate radi daljše kopalke. V-razporka, pas z vezalko in luknjicami, stranski žep na ježek. Brez notranje mrežice.", [[0, POLY.sl], [1, "long length"], [2, "~52 cm"]]],
    hr: ["Za one koji vole duže kupaće. V-razrez, pojas s vezicom i rupicama, bočni džep s čičkom. Bez unutarnje mrežice.", [[0, POLY.hr], [1, "long length"], [2, "~52 cm"]]],
    en: ["For those who like their boardies longer. V-fly, lace-up waist with eyelets, a velcro side pocket. No inner mesh.", [[0, POLY.en], [1, "long length"], [2, "~52 cm"]]],
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

/* ---------- moške majice, oblačila, dodatki (vir: 69slam.com, okt. 2026) ---------- */
const t3 = (sl, hr, en) => ({ sl, hr, en });
const F = (pairs) => (l) => pairs.map(([k, v]) => [k, typeof v === "string" ? v : v[l]]);
const NY82 = t3("82 % najlon, 18 % elastan", "82 % najlon, 18 % elastan", "82% nylon, 18% elastane");
const COTTON = t3("100 % bombaž", "100 % pamuk", "100% cotton");
const VISC = t3("100 % viskoza", "100 % viskoza", "100% viscose");
const RUBBER = t3("100 % guma", "100 % guma", "100% rubber");

Object.assign(D, {
  MRL: W("Brez skrbi pred opeklinami – kopalna majica z dolgimi rokavi te ščiti pred soncem v vodi in na kopnem. Oprijet kroj ne drsi pri plavanju ali surfanju, rokavi brez šiva na ramenu omogočajo popolno gibljivost, kontrastni šivi pa poskrbijo za športni videz.",
    "Bez brige od opeklina – kupaća majica s dugim rukavima štiti te od sunca u vodi i na kopnu. Pripijeni kroj ne klizi pri plivanju ili surfanju, rukavi bez šava na ramenu omogućuju potpunu pokretljivost, a kontrastni šavovi daju sportski izgled.",
    "No more sunburn worries – this long-sleeve rash vest protects you from the sun in and out of the water. The snug fit stays put while swimming or surfing, sleeves with no shoulder seam give full freedom of movement, and contrast stitching adds a sporty look.",
    F([[0, NY82], [1, t3("oprijet, dolgi rokav", "pripijen, dugi rukav", "snug fit, long sleeve")], [5, "UPF 30"], [3, "S–XXL"]])),
  MTV: W("Za tiste, ki imajo raje sprostljivo majico kot oprijeto kopalno majico. Gladek, lahek material se hitro suši in ščiti pred UV žarki – nosiš jo v vodi in na plaži. Izvirni 69SLAM dizajn na prsih.",
    "Za one koji više vole opuštenu majicu od pripijene kupaće majice. Glatki, lagani materijal brzo se suši i štiti od UV zraka – nosiš je u vodi i na plaži. Originalni 69SLAM dizajn na prsima.",
    "For those who prefer a relaxed tee to a tight-fitting rash vest. The smooth, lightweight fabric dries fast and protects from UV rays – wear it in the water and on the beach. Original 69SLAM design on the chest.",
    F([[0, MICRO], [1, t3("rahlo oprijet (regular slim), okrogel ovratnik, dolgi rokav", "lagano pripijen (regular slim), okrugli ovratnik, dugi rukav", "regular slim, crew neck, long sleeve")], [5, "UPF 50+"]])),
  MTZ: W("Kopalna majica s kratkimi rokavi, ki izgleda kot navadna majica. Hitro se suši in te ščiti pred soncem v vodi in na kopnem. Lahek, gladek material in izvirni 69SLAM dizajn na prsih.",
    "Kupaća majica kratkih rukava koja izgleda kao obična majica. Brzo se suši i štiti te od sunca u vodi i na kopnu. Lagani, glatki materijal i originalni 69SLAM dizajn na prsima.",
    "A short-sleeve rash tee that looks like a regular T-shirt. It dries fast and protects you from the sun in and out of the water. Lightweight, smooth fabric and an original 69SLAM design on the chest.",
    F([[0, MICRO], [1, t3("rahlo oprijet, okrogel ovratnik, kratki rokav", "lagano pripijen, okrugli ovratnik, kratki rukav", "regular slim, crew neck, short sleeve")], [5, "UPF 30+"]])),
  MTX: W("Majica, ki jo lahko nosiš v vodi in izven nje. Mešanica poliestra in bombaža s celovitim 69SLAM printom – mehka na koži in hitro sušeča. Za plažo, mesto in vse vmes.",
    "Majica koju možeš nositi u vodi i izvan nje. Mješavina poliestera i pamuka s 69SLAM printom preko cijele majice – mekana na koži i brzo se suši. Za plažu, grad i sve između.",
    "A tee you can wear in the water and out. A polyester-cotton blend with an all-over 69SLAM print – soft on the skin and quick-drying. For the beach, the city and everything in between.",
    F([[0, t3("65 % poliester, 35 % bombaž", "65 % poliester, 35 % pamuk", "65% polyester, 35% cotton")], [1, t3("raven, kratki rokav", "ravni, kratki rukav", "straight, short sleeve")]])),
  MTS: W("Lahka majica iz čistega bombaža z okroglim ovratnikom in kratkimi rokavi. Prilegajoč kroj in zabaven 69SLAM print – za vsak dan.",
    "Lagana majica od čistog pamuka s okruglim ovratnikom i kratkim rukavima. Pripijeni kroj i zabavan 69SLAM print – za svaki dan.",
    "A lightweight pure-cotton tee with a crew neck and short sleeves. Slim fit and a fun 69SLAM print – for every day.",
    F([[0, COTTON], [1, t3("prilegajoč (slim), okrogel ovratnik, kratki rokav", "pripijen (slim), okrugli ovratnik, kratki rukav", "slim fit, crew neck, short sleeve")]])),
  MSN: W("Lahka bombažna majica brez rokavov z globljim okroglim izrezom. Zračna za vroče dni, trening ali plažo – z drznim 69SLAM printom.",
    "Lagana pamučna majica bez rukava s dubljim okruglim izrezom. Prozračna za vruće dane, trening ili plažu – s upečatljivim 69SLAM printom.",
    "A lightweight cotton tank with a deeper scoop neck. Breezy for hot days, training or the beach – with a bold 69SLAM print.",
    F([[0, COTTON], [1, t3("ohlapen (loose fit), brez rokavov", "opušten (loose fit), bez rukava", "loose fit, sleeveless")]])),
  MTI: W("Brezrokavna majica s kapuco iz lahke viskoze – zračna in prijetna na koži. Za jutranji trening, plažo ali poletni večer.",
    "Majica bez rukava s kapuljačom od lagane viskoze – prozračna i ugodna na koži. Za jutarnji trening, plažu ili ljetnu večer.",
    "A sleeveless hooded tee in light viscose – breezy and soft on the skin. For morning workouts, the beach or a summer evening.",
    F([[0, t3("100 % viskoza (rayon)", "100 % viskoza (rayon)", "100% viscose (rayon)")], [1, t3("brez rokavov, s kapuco", "bez rukava, s kapuljačom", "sleeveless, hooded")]])),
  MTJ: W("Kot bi tvoj najljubši pulover s kapuco in majica z dolgimi rokavi dobila otroka. Lahka, tekoča viskoza je bolj zračna od bombaža – tako udobna, da je ne boš hotel sleči.",
    "Kao da su tvoja omiljena majica s kapuljačom i majica dugih rukava dobile dijete. Lagana, tekuća viskoza prozračnija je od pamuka – toliko udobna da je nećeš htjeti skinuti.",
    "Like your favourite hoodie and a long-sleeve tee had a baby. Light, flowy viscose breathes better than cotton – so comfy you won't want to take it off.",
    F([[0, t3("100 % viskoza (rayon slub)", "100 % viskoza (rayon slub)", "100% viscose (rayon slub)")], [1, t3("ohlapen, unisex", "opušten, unisex", "relaxed, unisex")]])),
  MFH: W("Srajca iz zračnega bombaža, ki vpija vlago in te ohranja suhega tudi v največjih vročinah. Prilegajoč kroj in drzni tropski printi.",
    "Košulja od prozračnog pamuka koji upija vlagu i održava te suhim i po najvećim vrućinama. Pripijeni kroj i upečatljivi tropski printovi.",
    "A shirt in breathable cotton that absorbs moisture and keeps you dry even on the hottest days. Fitted cut and bold tropical prints.",
    F([[0, COTTON], [1, t3("prilegajoč, kratki rokav", "pripijen, kratki rukav", "fitted, short sleeve")]])),
  MPL: W("Polo majica z ovratnikom in gumbi pod vratom – bolj urejena izbira za poletje, s 69SLAM printom.",
    "Polo majica s ovratnikom i gumbima ispod vrata – urednija ljetna opcija, s 69SLAM printom.",
    "A polo shirt with a collar and button placket – a smarter summer choice, with a 69SLAM print.", () => []),
  MHW: W("Vetrovka za vse vremenske spremembe: ne prepušča vetra in vode, pa vseeno diha. Dva stranska žepa in drzen 69SLAM print.",
    "Vjetrovka za sve vremenske promjene: ne propušta vjetar i vodu, a ipak diše. Dva bočna džepa i upečatljiv 69SLAM print.",
    "A windbreaker for every change in the weather: wind- and waterproof, yet breathable. Two side pockets and a bold 69SLAM print.",
    F([[0, POLY], [4, t3("nepremočljiva, ne prepušča vetra, zračna · 2 stranska žepa", "nepromočiva, ne propušta vjetar, prozračna · 2 bočna džepa", "waterproof, windproof, breathable · 2 side pockets")]])),
  MKY: W("Mehak pulover s kapuco za hladnejše dni in večere ob morju.", "Mekana majica s kapuljačom za hladnije dane i večeri uz more.", "A soft hoodie for cooler days and evenings by the sea.", () => []),
  MKU: W("Udobna jopica, ki jo vržeš čez majico, ko se ohladi.", "Udobna jakna koju prebaciš preko majice kad zahladi.", "A comfy jacket to throw over your tee when it cools down.", () => []),
  MWC: W("Od plaže do mesta: lahke, zračne kratke hlače, v katerih ti ostane hladno tudi, ko sonce najbolj pripeka.",
    "Od plaže do grada: lagane, prozračne kratke hlače u kojima ti ostaje svježe i kad sunce najjače prži.",
    "From beach to town: light, breezy shorts that keep you cool even when the sun is at its strongest.",
    F([[0, t3("50 % poliester, 50 % bombaž", "50 % poliester, 50 % pamuk", "50% polyester, 50% cotton")]])),
  SEL: W("Lahke športne hlače iz raztegljivega 4-way stretch materiala z vgrajenimi boksaricami – odlična opora in popolna svoboda gibanja. Za tek, fitnes, plažo.",
    "Lagane sportske hlače od rastezljivog 4-way stretch materijala s ugrađenim boksericama – odlična potpora i potpuna sloboda kretanja. Za trčanje, fitness, plažu.",
    "Light sports shorts in stretchy 4-way fabric with built-in boxers – great support and total freedom of movement. For running, the gym, the beach.",
    F([[0, POLY], [4, t3("4-way stretch · notranje boksarice", "4-way stretch · unutarnje bokserice", "4-way stretch · built-in boxers")]])),
  MHD: W("Kratke, oprijete kopalke za sprostljivo plavanje ali sončenje. Izjemno raztegljive, zato se gibljejo s tabo.",
    "Kratke, pripijene kupaće za opušteno plivanje ili sunčanje. Iznimno rastezljive pa se kreću s tobom.",
    "Short, snug trunks for easy swimming or sunbathing. Super stretchy, so they move with you.",
    F([[0, NY82], [1, t3("kratke, oprijete (trunks)", "kratke, pripijene (trunks)", "short, snug (trunks)")]])),
  ASN: W("Večni poletni favorit – udobne in vzdržljive japonke za plažo, bazen in mesto. Z 69SLAM printom.",
    "Vječni ljetni favorit – udobne i izdržljive japanke za plažu, bazen i grad. S 69SLAM printom.",
    "A summer classic – comfy, durable flip-flops for the beach, the pool and the city. With a 69SLAM print.", F([[0, RUBBER]])),
  APP: W("Udobni natikači – obuješ in greš. Za plažo, bazen in po hiši.", "Udobne natikače – obuješ i ideš. Za plažu, bazen i po kući.", "Comfy slides – slip on and go. For the beach, the pool and around the house.", () => []),
  CAB: W("Kapa s širšim, rahlo ukrivljenim šiltom in nastavljivim zapenjanjem zadaj (snapback) – ena velikost za vse.",
    "Kapa sa širim, blago zakrivljenim šiltom i podesivim kopčanjem straga (snapback) – jedna veličina za sve.",
    "A cap with a wider, slightly curved brim and an adjustable snapback – one size fits all.",
    F([[0, POLY], [3, t3("nastavljiva (ena velikost)", "podesiva (jedna veličina)", "adjustable (one size)")]])),
  CAP: W("Kapa z ravnim šiltom in nastavljivim zapenjanjem zadaj – ena velikost za vse.", "Kapa s ravnim šiltom i podesivim kopčanjem straga – jedna veličina za sve.", "A flat-brim cap with an adjustable back strap – one size fits all.",
    F([[3, t3("nastavljiva (ena velikost)", "podesiva (jedna veličina)", "adjustable (one size)")]])),
  SCK: W("Dodaj nekaj barve med svoje nogavice! Mehke, prijetne za vsak dan, s 69SLAM printi in elastičnim robom, ki ne zdrsne.",
    "Dodaj malo boje među svoje čarape! Mekane, ugodne za svaki dan, s 69SLAM printovima i elastičnim rubom koji ne klizi.",
    "Add some colour to your sock drawer! Soft and comfy for every day, with 69SLAM prints and an elastic cuff that stays up.",
    F([[0, t3("82 % poliester, 13 % elastan, 5 % elastika", "82 % poliester, 13 % elastan, 5 % elastika", "82% polyester, 13% elastane, 5% elastic")], [1, "unisex"]])),
  AKY: W("69SLAM obesek za ključe – majhno darilo ali dodatek k naročilu.", "69SLAM privjesak za ključeve – mali poklon ili dodatak narudžbi.", "A 69SLAM keychain – a small gift or an add-on to your order.", () => []),
  BEA: W("Topla zimska kapa za hladne dni.", "Topla zimska kapa za hladne dane.", "A warm beanie for cold days.", () => []),
  ASU: W("Sončna očala za plažo in poletje, univerzalna velikost.", "Sunčane naočale za plažu i ljeto, univerzalna veličina.", "Sunglasses for the beach and summer, one size.", () => []),
  OFB: W("Športni top za trening, jogo ali vsak dan – lepo se prilega, nudi dobro oporo in ostane na mestu tudi pri gibanju. Raztegljiv material in živahen 69SLAM print – odlično se ujema s pajkicami v istem printu.",
    "Sportski top za trening, jogu ili svaki dan – lijepo prianja, pruža dobru potporu i ostaje na mjestu i pri kretanju. Rastezljiv materijal i živahan 69SLAM print – odlično se slaže s tajicama u istom printu.",
    "A sports top for training, yoga or everyday wear – fits nicely, gives good support and stays in place as you move. Stretchy fabric and a vivid 69SLAM print – pairs perfectly with leggings in the same print.",
    () => []),
  GRT: W("Lahka poletna kiklica v živahnem 69SLAM printu – za plažo, mesto ali poletni večer.",
    "Lagana ljetna suknjica u živahnom 69SLAM printu – za plažu, grad ili ljetnu večer.",
    "A light summer skirt in a vivid 69SLAM print – for the beach, the city or a summer evening.", () => []),
  GYD: W("Udobna poletna oblekica z zabavnim 69SLAM printom – oblečeš in greš, od plaže do mesta.",
    "Udobna ljetna haljinica sa zabavnim 69SLAM printom – obučeš i ideš, od plaže do grada.",
    "A comfy summer dress with a fun 69SLAM print – throw it on and go, from the beach to the city.", () => []),
  OLM: W("Pajkice z visokim pasom, ki oblikujejo in dvignejo – izjemno raztegljive in udobne ves dan, za trening ali vsak dan.",
    "Tajice visokog struka koje oblikuju i podižu – iznimno rastezljive i udobne cijeli dan, za trening ili svaki dan.",
    "High-waisted leggings that shape and lift – super stretchy and comfy all day, for training or everyday wear.",
    F([[0, NY82], [1, t3("visok pas", "visoki struk", "high waist")]])),
  GRH: W("Jopica s kapuco iz materiala z UV zaščito – zabaven videz in največja zaščita pred soncem.",
    "Jakna s kapuljačom od materijala s UV zaštitom – zabavan izgled i maksimalna zaštita od sunca.",
    "A hooded jacket in UV-protective fabric – a fun look with top sun protection.",
    F([[0, MICRO], [5, "UPF 30"]])),
  GRK: W("Lahek poletni kimono, ki ga vržeš čez kopalke ali obleko – popoln za plažo in bazen.", "Lagani ljetni kimono koji prebaciš preko kupaćeg ili haljine – savršen za plažu i bazen.", "A light summer kimono to throw over your swimwear or dress – perfect for the beach and pool.", F([[0, VISC]])),
  GRO: W("Mehka, tekoča obleka na preklop z V-izrezom in gumbom, da se izrez ne odpira – v tropskih printih za poletje.",
    "Mekana, tekuća haljina na preklop s V-izrezom i gumbom da se izrez ne otvara – u tropskim printovima za ljeto.",
    "A soft, flowy wrap dress with a V-neck and a button so it stays closed – in tropical prints for summer.",
    F([[0, VISC], [1, t3("A kroj", "A kroj", "A-line")]])),
  GYS: W("Ne pretesna, ne preohlapna – ravno prav. S stranskimi razporki za udobno gibanje.", "Ni preuska, ni preširoka – taman. S bočnim prorezima za udobno kretanje.", "Not too tight, not too loose – just right. With side slits for easy movement.", F([[0, MICRO]])),
  GRS: W("Lahke, zračne kratke hlače iz mehke viskoze – za vroče dni.", "Lagane, prozračne kratke hlače od meke viskoze – za vruće dane.", "Light, breezy shorts in soft viscose – for hot days.", F([[0, VISC]])),
  SGW: W("Lahke kratke hlače za plažo in poletje, z 69SLAM printom.", "Lagane kratke hlače za plažu i ljeto, s 69SLAM printom.", "Light shorts for the beach and summer, with a 69SLAM print.", () => []),
  GTN: W("Mehka ženska majica z zabavnim 69SLAM printom – za vsak dan.", "Mekana ženska majica sa zabavnim 69SLAM printom – za svaki dan.", "A soft women's tee with a fun 69SLAM print – for every day.", () => []),
  AGS: W("Udobne in vzdržljive japonke za plažo in bazen.", "Udobne i izdržljive japanke za plažu i bazen.", "Comfy, durable flip-flops for the beach and pool.", F([[0, RUBBER]])),
});

/* kopalke: mrežica in žepi (po navodilih lastnice) */
const SWIM_FEAT = {
  SSC: [false, "back"], SSL: [false, "back"], SSX: [false, "back"],
  SLL: [false, "zip"], SLX: [false, "zip"], SSN: [false, "zip"], SSW: [false, "zip"], SSZ: [false, "zip"], SDW: [false, "zip"], SPP: [false, "zip"],
  SSM: [true, "side2"], SSB: [true, "side2"], SEB: [true, "side2"],
};
const FEAT_TXT = {
  mesh: { sl: ["Z notranjo mrežico", "Brez notranje mrežice"], hr: ["S unutarnjom mrežicom", "Bez unutarnje mrežice"], en: ["With inner mesh", "No inner mesh"] },
  back: { sl: "Zadnji žep", hr: "Stražnji džep", en: "Back pocket" },
  side2: { sl: "2 stranska žepa", hr: "2 bočna džepa", en: "2 side pockets" },
  zip: { sl: "Stranski žep", hr: "Bočni džep", en: "Side pocket" },
};
/** Kratke oznake za kopalke (mrežica, žepi) ali null. */
export function swimFeatures(code, lang = "sl") {
  const f = SWIM_FEAT[String(code || "").slice(0, 3).toUpperCase()];
  if (!f) return null;
  const l = FEAT_TXT.back[lang] ? lang : "sl";
  return { mesh: f[0], meshLabel: FEAT_TXT.mesh[l][f[0] ? 0 : 1], pocketLabel: FEAT_TXT[f[1]][l] };
}

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
  SSX: "SSL", SSW: "SSN", SSZ: "SSN", SDW: "SSN", SLX: "SLL",
  GRL: "RASH_W", GSS: "ULUWATU", SGL: "BOARD_W", SGT: "BOARD_W",
  MTM: "MTS", MTP: "MTS", MSR: "MSN", SPP: "SSN",
  ARS: "ASN", AMS: "ASN", ALS: "ASN", SKS: "SCK", GRB: "AKY",
  OLK: "OLM", GWX: "SGW", GSM: "SGW", GSN: "GTN", GYC: "OFB", GTL: "GTN", MOD: "MKY", AGT: "ASN", OXB: "OFB", OXG: "OFB", GTK: "GTN",
};

const MEN_BAMBOO = new Set(["MPB", "MBW", "MBV", "MHB"]);

/** Opis po kroju ali null (potem se uporabi splošni opis skupine). */
export function cutDescription(p, lang = "sl") {
  const pre = String(p?.code || "").slice(0, 3).toUpperCase();
  const key = D[pre] ? pre : ALIAS[pre] || (MEN_BAMBOO.has(pre) ? "BAMBUS" : null);
  if (!key) return null;
  const e = D[key][lang] || D[key].sl;
  const f = facts(lang in L ? lang : "sl", e[1]);
  return f ? `${e[0]}\n\n${f}` : e[0];
}
