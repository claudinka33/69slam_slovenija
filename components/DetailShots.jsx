// Detajlne fotografije kvalitete (pas, razteg, mikrofibra).
// Slike: public/img/detail/  ·  Uporaba: <DetailShots lang={lang} tone="dark|light" />
const MICRO = [
  {
    src: "/img/detail/pas.jpg",
    sl: { t: "Mehak elastičen pas", p: "Širok pas z logotipom 69SLAM se prilagodi telesu in drži boksarice na mestu." },
    hr: { t: "Mekani elastični pojas", p: "Široki pojas s logotipom 69SLAM prilagođava se tijelu i drži bokserice na mjestu." },
    en: { t: "Soft elastic waistband", p: "The wide 69SLAM waistband moves with your body and keeps your boxers in place." },
  },
  {
    src: "/img/detail/razteg.jpg",
    sl: { t: "Elastične do roba", p: "Rob hlačnice se raztegne in vrne v obliko — zato ne leze navzgor in ostane na mestu ves dan." },
    hr: { t: "Elastične do ruba", p: "Rub nogavice se rastegne i vrati u oblik — zato se ne podiže i ostaje na mjestu cijeli dan." },
    en: { t: "Stretch to the hem", p: "The leg hem stretches and snaps back into shape — so it stays put and never rides up." },
  },
  {
    src: "/img/detail/mikrofibra.jpg",
    sl: { t: "Gladka mikrofibra", p: "Mehka, gladka tkanina in čisti, ravni šivi. Prijetna na koži ves dan." },
    hr: { t: "Glatka mikrofibra", p: "Mekana, glatka tkanina i čisti, ravni šavovi. Ugodna na koži cijeli dan." },
    en: { t: "Smooth microfibre", p: "Soft, smooth fabric with clean, flat seams. Comfortable on your skin all day." },
  },
];

const S = (src, sl, hr, en) => ({ src: `/img/detail/${src}.jpg`, sl: { t: sl[0], p: sl[1] }, hr: { t: hr[0], p: hr[1] }, en: { t: en[0], p: en[1] } });

// Prave fotografije 69SLAM (izrezi iz uradnih slik v OneDrivu), za vsak kroj posebej.
const BAMBUS = [
  S("bambus-pas", ["Mehak širok pas", "Elastičen pas z logotipom 69SLAM se prilagodi telesu, ne reže in drži spodnjice na mestu."], ["Mekani široki pojas", "Elastični pojas s logotipom 69SLAM prilagođava se tijelu, ne steže i drži bokserice na mjestu."], ["Soft wide waistband", "The elastic 69SLAM waistband moves with your body, doesn't dig in and keeps everything in place."]),
  S("bambus-rob", ["Raztegljiv rob hlačnice", "Hlačnica se raztegne in vrne v obliko — lepo naleže na stegno in ne leze navzgor."], ["Rastezljiv rub nogavice", "Nogavica se rastegne i vrati u oblik — lijepo naliježe na bedro i ne podiže se."], ["Stretchy leg hem", "The leg hem stretches and snaps back — it sits smoothly on the thigh and doesn't ride up."]),
  S("bambus-material", ["Bambus in bombaž", "68 % bambus, 27 % bombaž, 5 % elastan — mehko, zračno in prijazno do kože, s ploskimi šivi."], ["Bambus i pamuk", "68 % bambus, 27 % pamuk, 5 % elastan — mekano, prozračno i nježno prema koži, s ravnim šavovima."], ["Bamboo and cotton", "68% bamboo, 27% cotton, 5% elastane — soft, breathable and gentle on skin, with flat seams."]),
];

const LACE = (n) => S(`${n}-pas`, ["Pas z vezalko", "Vezalka skozi luknjice na pasu — kopalke ostanejo na mestu tudi v valovih."], ["Pojas s vezicom", "Vezica kroz rupice na pojasu — kupaće hlače ostaju na mjestu i u valovima."], ["Lace-up waist", "A lace-up through eyelets on the waistband keeps them in place, even in the waves."]);
const ELASTIC = (n) => S(`${n}-pas`, ["Elastičen pas z vrvico", "Oblečeš in greš — elastičen pas, vrvico pa zategneš po svoje."], ["Elastični pojas s vezicom", "Obučeš i ideš — elastični pojas, a vezicu zategneš po svom."], ["Elastic waist with drawstring", "Pull on and go — an elastic waist with a drawstring to tighten as you like."]);
const DRY = (n) => S(`${n}-suho`, ["Hitro sušenje", "Voda se ne zadržuje v tkanini — iz morja naravnost na sprehod."], ["Brzo sušenje", "Voda se ne zadržava u tkanini — iz mora ravno u šetnju."], ["Quick-dry", "Water doesn't soak in — straight from the sea to a walk on the promenade."]);
const STR = (n) => S(`${n}-razteg`, ["4-way stretch", "Material se razteza v vse smeri in se vrne v obliko — popolna svoboda gibanja."], ["4-way stretch", "Materijal se rasteže u svim smjerovima i vraća u oblik — potpuna sloboda kretanja."], ["4-way stretch", "The fabric stretches in every direction and snaps back — total freedom of movement."]);
const MESH = (n) => S(`${n}-mrezica`, ["Notranja mrežica", "Mehka notranja mrežica — udobno nošenje brez spodnjic."], ["Unutarnja mrežica", "Mekana unutarnja mrežica — udobno nošenje bez donjeg rublja."], ["Inner mesh", "A soft inner mesh lining — comfortable to wear without underwear."]);
const SIDE2 = (n) => S(`${n}-zep`, ["Dva stranska žepa", "Roka gre naravnost v žep — praktično na plaži in v mestu."], ["Dva bočna džepa", "Ruka ide ravno u džep — praktično na plaži i u gradu."], ["Two side pockets", "Hands straight in the pockets — handy at the beach and in town."]);
const ZIP = (n) => S(`${n}-zep`, ["Žep na zadrgo ob strani", "Žep na zadrgo na sredini hlačnice — ključi ostanejo na varnem tudi v vodi."], ["Džep s patentom sa strane", "Džep s patentom na sredini nogavice — ključevi ostaju sigurni i u vodi."], ["Side zip pocket", "A zip pocket on the side of the leg — your keys stay safe even in the water."]);
const BACK = (n, zip) => S(`${n}-zep`, zip ? ["Zadnji žep na zadrgo", "Žep zadaj se zapre z zadrgo — za ključe in kartico."] : ["Zadnji žep", "Žep zadaj za ključe ali drobiž."], zip ? ["Stražnji džep s patentom", "Džep straga zatvara se patentom — za ključeve i karticu."] : ["Stražnji džep", "Džep straga za ključeve ili sitniš."], zip ? ["Zip back pocket", "The back pocket closes with a zip — for keys and a card."] : ["Back pocket", "A back pocket for keys or change."]);

const SWIM_SETS = {
  SSC: [LACE("ssc"), BACK("ssc"), DRY("ssc")],
  SSL: [LACE("ssl"), BACK("ssl", true), DRY("ssl")],
  SLL: [LACE("sll"), ZIP("sll"), DRY("sll")],
  SSN: [ELASTIC("ssn"), STR("ssn"), ZIP("ssn")],
  SSM: [STR("ssm"), SIDE2("ssm"), MESH("ssm")],
  SSB: [STR("ssb"), SIDE2("ssb"), MESH("ssb")],
  SEB: [SIDE2("ssb"), MESH("ssb")],
};
const SWIM_ALIAS = { SSX: "SSL", SLX: "SLL", SSW: "SSN", SSZ: "SSN", SDW: "SSN", SPP: "SSN" };

/** Komplet slik od blizu za kopalke po šifri (prve 3 črke) ali null. */
export function swimDetailKind(code) {
  const pre = String(code || "").slice(0, 3).toUpperCase();
  const k = SWIM_SETS[pre] ? pre : SWIM_ALIAS[pre];
  return k ? `swim-${k}` : null;
}

const SETS = { micro: MICRO, bambus: BAMBUS, ...Object.fromEntries(Object.entries(SWIM_SETS).map(([k, v]) => [`swim-${k}`, v])) };

const HEAD = {
  sl: { over: "Kvaliteta od blizu", title: "Poglej jih od blizu" },
  hr: { over: "Kvaliteta izbliza", title: "Pogledaj ih izbliza" },
  en: { over: "Quality up close", title: "See them up close" },
};

export default function DetailShots({ lang = "sl", tone = "light", showTitle = true, kind = "micro" }) {
  const SHOTS = SETS[kind] || MICRO;
  const h = HEAD[lang] || HEAD.sl;
  return (
    <section className={`detail detail-${tone}`}>
      {showTitle && (
        <div className="detail-head">
          <div className="over">{h.over}</div>
          <h2>{h.title}</h2>
        </div>
      )}
      <div className="detail-grid">
        {SHOTS.map((s) => {
          const c = s[lang] || s.sl;
          return (
            <figure className="detail-card" key={s.src}>
              <img src={s.src} alt={`69SLAM ${c.t}`} loading="lazy" width="900" height="900" />
              <figcaption>
                <h3>{c.t}</h3>
                <p>{c.p}</p>
              </figcaption>
            </figure>
          );
        })}
      </div>
    </section>
  );
}
