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

const BAMBUS = [
  {
    src: "/img/detail/bambus-pas.jpg",
    sl: { t: "Mehak širok pas", p: "Elastičen pas se prilagodi telesu, ne reže in drži spodnjice na mestu ves dan." },
    hr: { t: "Mekani široki pojas", p: "Elastični pojas prilagođava se tijelu, ne steže i drži gaće na mjestu cijeli dan." },
    en: { t: "Soft wide waistband", p: "The elastic waistband moves with your body, doesn't dig in and keeps everything in place all day." },
  },
  {
    src: "/img/detail/bambus-material.jpg",
    sl: { t: "Mehka bambusova viskoza", p: "Izjemno mehka, zračna tkanina, prijazna do kože. Naravno uravnava temperaturo." },
    hr: { t: "Mekana bambusova viskoza", p: "Iznimno mekana, prozračna tkanina, nježna prema koži. Prirodno regulira temperaturu." },
    en: { t: "Soft bamboo viscose", p: "Extremely soft, breathable fabric that's gentle on your skin and naturally regulates temperature." },
  },
  {
    src: "/img/detail/bambus-rob.jpg",
    sl: { t: "Čisti robovi in šivi", p: "Ravni šivi in mehak rob hlačnice, ki lepo naleže in ne drgne." },
    hr: { t: "Čisti rubovi i šavovi", p: "Ravni šavovi i mekani rub nogavice koji lijepo naliježe i ne žulja." },
    en: { t: "Clean hems and seams", p: "Flat seams and a soft leg hem that lies smoothly and doesn't chafe." },
  },
];

const SWIM = [
  {
    src: "/img/detail/kopalke-vrvica.jpg",
    sl: { t: "Vrvica za zavezat", p: "Pas z vrvico, da kopalke ostanejo na mestu — tudi v valovih." },
    hr: { t: "Vezica za vezanje", p: "Pojas s vezicom da kupaće ostanu na mjestu — i u valovima." },
    en: { t: "Tie drawstring", p: "A drawstring waist keeps your shorts in place — even in the waves." },
  },
  {
    src: "/img/detail/kopalke-stretch.jpg",
    sl: { t: "Hitro sušenje", p: "Lahek material se hitro posuši — iz vode naravnost na plažo. Modeli 4-way stretch se raztezajo v vse smeri." },
    hr: { t: "Brzo sušenje", p: "Lagani materijal brzo se suši — iz vode ravno na plažu. Modeli 4-way stretch rastežu se u svim smjerovima." },
    en: { t: "Quick-dry", p: "The light fabric dries fast — straight from the water to the beach. 4-way stretch models move in every direction." },
  },
  {
    src: "/img/detail/kopalke-zep.jpg",
    sl: { t: "Praktični žepi", p: "Stranski in zadnji žep — ključi in drobiž ostanejo na varnem." },
    hr: { t: "Praktični džepovi", p: "Bočni i stražnji džep — ključevi i sitniš ostaju na sigurnom." },
    en: { t: "Handy pockets", p: "Side and back pocket — keys and change stay safe." },
  },
];

const SETS = { micro: MICRO, bambus: BAMBUS, kopalke: SWIM };

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
