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
  S("bambus-rob", ["Bambus in bombaž", "68 % bambus, 27 % bombaž, 5 % elastan — mehko, zračno in prijazno do kože. Hlačnica lepo naleže na stegno."], ["Bambus i pamuk", "68 % bambus, 27 % pamuk, 5 % elastan — mekano, prozračno i nježno prema koži. Nogavica lijepo naliježe na bedro."], ["Bamboo and cotton", "68% bamboo, 27% cotton, 5% elastane — soft, breathable and gentle on skin. The leg sits smoothly on the thigh."]),
  S("bambus-zadaj", ["Lep kroj zadaj", "Zaobljeni šivi zadaj lepo oblikujejo, kroj se tesno prilega, a ne stiska."], ["Lijep kroj straga", "Zaobljeni šavovi straga lijepo oblikuju, kroj prianja bez stezanja."], ["Shaped at the back", "Rounded back seams give a nice shape; the fit is snug without squeezing."]),
];

const LACE = (n) => S(`${n}-pas`, ["Pas z vezalko", "Vezalka skozi luknjice na pasu — kopalke ostanejo na mestu tudi v valovih."], ["Pojas s vezicom", "Vezica kroz rupice na pojasu — kupaće ostaju na mjestu i u valovima."], ["Lace-up waist", "A lace-up through eyelets on the waistband keeps them in place, even in the waves."]);
const ELASTIC = (n) => S(`${n}-pas`, ["Elastičen pas z vrvico", "Oblečeš in greš — elastičen pas, vrvico pa zategneš po svoje."], ["Elastični pojas s vezicom", "Obučeš i ideš — elastični pojas, a vezicu zategneš po svom."], ["Elastic waist with drawstring", "Pull on and go — an elastic waist with a drawstring to tighten as you like."]);
const LEN = (n, sl, hr, en) => S(`${n}-kroj`, sl, hr, en);

const SWIM_SETS = {
  SSC: [LACE("ssc"),
    S("ssc-logo", ["Napis 69 SLAM", "Pas z velikim napisom 69 SLAM — prepoznaven tudi od zadaj."], ["Natpis 69 SLAM", "Pojas s velikim natpisom 69 SLAM — prepoznatljiv i straga."], ["69 SLAM lettering", "A waistband with bold 69 SLAM lettering — recognisable from behind too."]),
    LEN("ssc", ["Klasična dolžina", "Kratke klasične kopalke (~36 cm) iz lahke poliestrske mikrofibre, ki se hitro posuši."], ["Klasična duljina", "Kratke klasične kupaće (~36 cm) od lagane poliesterske mikrofibre koja se brzo suši."], ["Classic length", "Short classic swim shorts (~36 cm) in light, quick-drying polyester microfibre."])],
  SSL: [LACE("ssl"),
    S("ssl-logo", ["Vezen logotip", "Na pasu je vezen napis 69SLAM — detajl, ki ga opaziš od blizu."], ["Vezeni logotip", "Na pojasu je izvezen natpis 69SLAM — detalj koji primijetiš izbliza."], ["Embroidered logo", "An embroidered 69SLAM logo on the waistband — a detail you notice up close."]),
    LEN("ssl", ["Srednja dolžina", "Srednje dolge kopalke (~46 cm) z zaobljenim robom — več pokritosti, še vedno sproščen videz."], ["Srednja duljina", "Srednje duge kupaće (~46 cm) sa zaobljenim rubom — više pokrivenosti, i dalje opušten izgled."], ["Medium length", "Medium-length shorts (~46 cm) with a curved hem — more coverage, still a relaxed look."])],
  SLL: [LACE("sll"),
    S("sll-zep", ["Stranski žep s preklopom", "Žep na nogavici s preklopom — za ključe ali kartico, ko greš v vodo."], ["Bočni džep s preklopom", "Džep na nogavici s preklopom — za ključeve ili karticu kad ideš u vodu."], ["Side flap pocket", "A flap pocket on the leg — for keys or a card when you head into the water."]),
    LEN("sll", ["Daljši kroj", "Dolge kopalke (~52 cm) za tiste, ki imate radi več pokritosti."], ["Duži kroj", "Duge kupaće (~52 cm) za one koji vole više pokrivenosti."], ["Longer cut", "Long boardshorts (~52 cm) for those who like more coverage."])],
  SSM: [ELASTIC("ssm"),
    S("ssm-zep", ["Stranski žepi", "Roka gre naravnost v žep — praktično na plaži in v mestu."], ["Bočni džepovi", "Ruka ide ravno u džep — praktično na plaži i u gradu."], ["Side pockets", "Hands straight in the pockets — handy at the beach and in town."]),
    LEN("ssm", ["Kratke in raztegljive", "Volley kroj (~28 cm) iz 4-way stretch materiala, ki se razteza v vse smeri."], ["Kratke i rastezljive", "Volley kroj (~28 cm) od 4-way stretch materijala koji se rasteže u svim smjerovima."], ["Short and stretchy", "Volley cut (~28 cm) in 4-way stretch fabric that moves in every direction."])],
  SSB: [ELASTIC("ssb"),
    S("ssb-logo", ["Našitek 69SLAM", "Zadaj na pasu je našitek 69SLAM — originalne kopalke z Balija."], ["Našivak 69SLAM", "Straga na pojasu je našivak 69SLAM — originalne kupaće s Balija."], ["69SLAM patch", "A 69SLAM patch on the back of the waistband — original swimwear from Bali."]),
    LEN("ssb", ["4-way stretch", "Dolžina nad kolenom (~38 cm), material se razteza v vse smeri in se hitro posuši."], ["4-way stretch", "Duljina iznad koljena (~38 cm), materijal se rasteže u svim smjerovima i brzo se suši."], ["4-way stretch", "Above-the-knee length (~38 cm); the fabric stretches in every direction and dries fast."])],
  SSN: [ELASTIC("ssn"),
    S("ssn-material", ["Raztegljiv material", "4-way stretch tkanina se giblje s tabo in se hitro posuši — za vodne športe."], ["Rastezljivi materijal", "4-way stretch tkanina kreće se s tobom i brzo se suši — za sportove na vodi."], ["Stretch fabric", "4-way stretch fabric moves with you and dries fast — made for water sports."]),
    LEN("ssn", ["Boardshort kroj", "Dolžina nad kolenom (~38 cm) — dovolj dolge za surf, dovolj kratke za tek po plaži."], ["Boardshort kroj", "Duljina iznad koljena (~38 cm) — dovoljno duge za surf, dovoljno kratke za trčanje po plaži."], ["Boardshort cut", "Above-the-knee length (~38 cm) — long enough to surf, short enough to run on the beach."])],
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
