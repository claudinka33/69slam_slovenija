/* Privzeti opisi po kroju (prve 3 črke šifre). Podatki: 69slam.com (sestava, mere, detajli).
 * Opis v CMS pri posameznem artiklu ima vedno prednost. */

const MICRO = { sl: "92 % poliester, 8 % elastan", hr: "92 % poliester, 8 % elastan", en: "92% polyester, 8% elastane" };
const STRETCH = { sl: "88 % poliester, 12 % elastan", hr: "88 % poliester, 12 % elastan", en: "88% polyester, 12% elastane" };
const POLY = { sl: "100 % poliestrska mikrofibra", hr: "100 % poliesterska mikrofibra", en: "100% polyester microfibre" };
const BAMBOO = { sl: "68 % bambus, 27 % bombaž, 5 % elastan", hr: "68 % bambus, 27 % pamuk, 5 % elastan", en: "68% bamboo, 27% cotton, 5% elastane" };

const L = { sl: ["Sestava", "Kroj", "Dolžina", "Velikosti"], hr: ["Sastav", "Kroj", "Duljina", "Veličine"], en: ["Fabric", "Fit", "Length", "Sizes"] };
const facts = (lang, f) => f.filter(([, v]) => v).map(([k, v]) => `${L[lang][k]}: ${v}`).join(" · ");

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
    sl: ["Enako dobre za poležavanje na plaži kot za vodne športe. Raztegljiv 4-way stretch material se giblje s tabo in se hitro suši. Elastičen pas z vrvico, stranski in zadnji žep, notranja mrežica.", [[0, STRETCH.sl], [1, "boardshort"], [2, "~38 cm"], [3, "XS–XXL"]]],
    hr: ["Jednako dobre za izležavanje na plaži kao i za sportove na vodi. Rastezljivi 4-way stretch materijal kreće se s tobom i brzo se suši. Elastični pojas s vezicom, bočni i stražnji džep, unutarnja mrežica.", [[0, STRETCH.hr], [1, "boardshort"], [2, "~38 cm"], [3, "XS–XXL"]]],
    en: ["Equally good for lounging on the beach and for water sports. Stretchy 4-way fabric moves with you and dries fast. Elastic waist with drawstring, side and back pocket, inner mesh.", [[0, STRETCH.en], [1, "boardshort"], [2, "~38 cm"], [3, "XS–XXL"]]],
  },
  SSB: {
    sl: ["Elastičen pas za maksimalno udobje — obuješ in greš. Raztegljiv 4-way stretch material se giblje s tabo in se hitro suši. Ležerne kopalke za cel dan na plaži, z zadnjim in stranskim žepom ter notranjo mrežico.", [[0, STRETCH.sl], [1, "elastic waist · 4-way stretch"], [2, "~38 cm"], [3, "XS–XXL"]]],
    hr: ["Elastični pojas za maksimalnu udobnost — obuješ i ideš. Rastezljivi 4-way stretch materijal kreće se s tobom i brzo se suši. Ležerne kupaće za cijeli dan na plaži, sa stražnjim i bočnim džepom te unutarnjom mrežicom.", [[0, STRETCH.hr], [1, "elastic waist · 4-way stretch"], [2, "~38 cm"], [3, "XS–XXL"]]],
    en: ["An elastic waist for maximum comfort — pull on and go. Stretchy 4-way fabric moves with you and dries fast. Easy beach shorts for the whole day, with back and side pocket and inner mesh.", [[0, STRETCH.en], [1, "elastic waist · 4-way stretch"], [2, "~38 cm"], [3, "XS–XXL"]]],
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

const MEN_BAMBOO = new Set(["MPB", "MBW", "MBV", "MHB"]);

/** Opis po kroju ali null (potem se uporabi splošni opis skupine). */
export function cutDescription(p, lang = "sl") {
  const pre = String(p?.code || "").slice(0, 3).toUpperCase();
  const key = D[pre] ? pre : MEN_BAMBOO.has(pre) ? "BAMBUS" : null;
  if (!key) return null;
  const e = D[key][lang] || D[key].sl;
  return `${e[0]}\n\n${facts(lang in L ? lang : "sl", e[1])}`;
}
