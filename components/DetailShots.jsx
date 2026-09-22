// Detajlne fotografije kvalitete (pas, razteg, mikrofibra).
// Slike: public/img/detail/  ·  Uporaba: <DetailShots lang={lang} tone="dark|light" />
const SHOTS = [
  {
    src: "/img/detail/pas.jpg",
    sl: { t: "Mehak elastičen pas", p: "Širok pas z logotipom 69SLAM se prilagodi telesu in drži boksarice na mestu." },
    hr: { t: "Mekani elastični pojas", p: "Široki pojas s logotipom 69SLAM prilagođava se tijelu i drži bokserice na mjestu." },
    en: { t: "Soft elastic waistband", p: "The wide 69SLAM waistband moves with your body and keeps your boxers in place." },
  },
  {
    src: "/img/detail/razteg.jpg",
    sl: { t: "Elastične do roba", p: "Rob hlačnice se raztegne in vrne v obliko — zato ostane na mestu in se ne rola." },
    hr: { t: "Elastične do ruba", p: "Rub nogavice se rastegne i vrati u oblik — zato ostaje na mjestu i ne rola se." },
    en: { t: "Stretch to the hem", p: "The leg hem stretches and snaps back into shape — so it stays put and never rides up." },
  },
  {
    src: "/img/detail/mikrofibra.jpg",
    sl: { t: "Gladka mikrofibra", p: "Mehka, gladka tkanina in čisti, ravni šivi. Prijetna na koži ves dan." },
    hr: { t: "Glatka mikrofibra", p: "Mekana, glatka tkanina i čisti, ravni šavovi. Ugodna na koži cijeli dan." },
    en: { t: "Smooth microfibre", p: "Soft, smooth fabric with clean, flat seams. Comfortable on your skin all day." },
  },
];

const HEAD = {
  sl: { over: "Kvaliteta od blizu", title: "Poglej jih od blizu" },
  hr: { over: "Kvaliteta izbliza", title: "Pogledaj ih izbliza" },
  en: { over: "Quality up close", title: "See them up close" },
};

export default function DetailShots({ lang = "sl", tone = "light", showTitle = true }) {
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
