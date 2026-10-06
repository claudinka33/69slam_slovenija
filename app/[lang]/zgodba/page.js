import Link from "next/link";
import Image from "next/image";
import { getProducts, primeCatalog } from "../../../lib/catalog";
import { LANGS } from "../../../lib/i18n";
import { IMG } from "../../../lib/media";
import { MAP_W, MAP_H, LAND, HIGHLIGHT, POINTS } from "../../../lib/worldMap";

const STORY = {
  sl: {
    meta_title: "Zgodba 69SLAM — rojeno na Baliju | 69SLAM.si",
    meta_desc: "Januar 2004, Bali, deževna nedelja in eno vprašanje: zakaj je moško spodnje perilo tako dolgočasno? Zgodba znamke 69SLAM in gibanja PLAY LOUD.",
    kicker: "Zgodba 69SLAM",
    h1a: "Rojeno na Baliju.",
    h1b: "Narejeno, da se te vidi.",
    blocks: [
      { h: "Vse se je začelo z enim vprašanjem", p: [
        "Januar 2004, deževno nedeljsko jutro. Iz enega preprostega vprašanja se je rodila glasna ideja: zakaj je moško spodnje perilo vedno tako sivo, varno in dolgočasno?",
        "Spodnjice so prva stvar, ki jo zjutraj oblečeš. Če se dan začne z dolgčasom, kako naj se nadaljuje drugače?",
        "Iz tega vprašanja je nastal 69SLAM – znamka, zgrajena na barvah, samozavesti in tem, da si upaš biti to, kar si. Življenje je že dovolj resno. Tisto, kar nosiš, naj te spravi v dobro voljo.",
      ] },
      { h: "PLAY LOUD", p: [
        "Ni slogan, je način razmišljanja. Skoči noter. Gibaj se svobodno. Smej se glasneje. Ne utišaj se samo zato, ker se drugi.",
        "69SLAM ne sledi trendom. Dela izjave.",
      ] },
      { h: "Print je naš jezik", p: [
        "Drzen, barvit, nepričakovan – in prepoznaven na prvi pogled. Balijske maske, pop-art lobanje, cestni znaki, flamingi in palme – vsak print ima svojo zgodbo. Nekateri nastanejo v sodelovanju z balijskimi umetniki, kot je Gennetik, ki je za kolekcijo FW26 narisal print Artgasm.",
        "Zato nobene 69SLAM spodnjice niso »samo ene spodnjice«. So majhen opomnik, vsako jutro, da dan lahko začneš po svoje.",
      ] },
      { h: "Ekipa z otoka", p: [
        "Za znamko stoji pisana druščina kreativcev, surferjev, skejterjev in sanjačev z vsega sveta, ki živijo in ustvarjajo na Baliju. Različne kulture, različne zgodbe – in prav ta mešanica je razlog, da 69SLAM izgleda tako, kot ne izgleda nič drugega.",
      ] },
      { h: "Ne pakiraj dolgčasa", p: [
        "Večina moških gre na teden dopusta s tremi pari boksaric. Mi pravimo: nadgradi rotacijo. V Braziliji za novo leto oblečejo čisto nove spodnjice za srečo – mi mislimo, da si vsak dan zasluži tak začetek.",
      ] },
    ],
    end_h: "Pri nas v Sloveniji",
    end_p: [
      "Več kot 20 let pozneje se 69SLAM nosi po vsem svetu. V Sloveniji ga dobiš pri nas – 100 % original, neposredno od znamke.",
      "Pri nas smo se osredotočili na tisto, kar 69SLAM dela najbolje: spodnjice iz mikrofibre. Ne lezejo navzgor, ostanejo na mestu ves dan in se hitro sušijo. Izgledajo glasno, nosijo se tiho.",
    ],
    cta: "Izberi svoj print →",
    quote: "Življenje je že dovolj resno.",
    map_kick: "69SLAM po svetu",
    map_h: "Od Balija do tvojega predala",
    map_p: "Trgovine 69SLAM najdeš na Baliju in Lomboku, na Tajskem, v Vietnamu, na Japonskem, v Rusiji, Španiji, Franciji, na Mavriciju in Reunionu – v Sloveniji pa na 69slam.si.",
    map_note: "Vir: uradni seznam trgovin na 69slam.com",
    countries: [
      ["Indonezija", "Bali (14 trgovin) · Lombok in Gili (4)"],
      ["Tajska", "Phuket · Pattaya · Koh Samui · Koh Phangan"],
      ["Vietnam", "Nha Trang"],
      ["Japonska", "Okinava"],
      ["Rusija", "Moskva · Soči · Jejsk · Tver"],
      ["Španija", "Valencia"],
      ["Francija", "Antibes"],
      ["Mavricij", "Grand Baie"],
      ["Reunion", "Saint-Gilles-les-Bains"],
      ["Slovenija", "69slam.si – spletna trgovina"],
    ],
  },
  en: {
    meta_title: "The 69SLAM story — born in Bali | 69SLAM.si",
    meta_desc: "January 2004, Bali, a rainy Sunday and one question: why is men's underwear so boring? The story of 69SLAM and the PLAY LOUD movement.",
    kicker: "The 69SLAM story",
    h1a: "Born in Bali.",
    h1b: "Made to be seen.",
    blocks: [
      { h: "It all started with one question", p: [
        "January 2004, a slow rainy Sunday morning. One simple question sparked a loud idea: why is men's underwear always so muted, safe and boring?",
        "Underwear is the first thing you put on in the morning. If the day starts dull, how is it supposed to get any better?",
        "That question became 69SLAM – a brand built on colour, confidence and the nerve to be exactly who you are. Life is serious enough. What you wear should put you in a good mood.",
      ] },
      { h: "PLAY LOUD", p: [
        "More than a tagline – a mindset. Jump in. Move freely. Laugh louder. Never tone yourself down just because everyone else does.",
        "We don't follow trends. We create statements.",
      ] },
      { h: "Print is our language", p: [
        "Bold, colourful, unexpected – and recognisable at first glance. Balinese masks, pop-art skulls, road signs, flamingos and palms – every print has its own story. Some are made together with Balinese artists, like Gennetik, who drew the Artgasm print for FW26.",
        "That's why no pair of 69SLAM is \"just a pair of boxers\". It's a small reminder, every morning, that you can start the day your way.",
      ] },
      { h: "The island crew", p: [
        "Behind the brand is a colourful crew of creatives, surfers, skaters and dreamers from all over the world, living and creating in Bali. Different cultures, different stories – and that mix is exactly why 69SLAM looks like nothing else.",
      ] },
      { h: "Don't pack boring", p: [
        "Most guys pack three pairs of boxers for a week away. We say: upgrade the rotation. In Brazil they wear brand-new underwear on New Year's Eve for luck – we think every day deserves a start like that.",
      ] },
    ],
    end_h: "Here in Slovenia",
    end_p: [
      "More than 20 years later, 69SLAM is worn all over the world. In Slovenia you get it from us – 100% original, straight from the brand.",
      "We focus on what 69SLAM does best: microfibre underwear. No ride-up, quick to dry, fresh all day. They look loud and wear quiet.",
    ],
    cta: "Pick your print →",
    quote: "Life is serious enough.",
    map_kick: "69SLAM around the world",
    map_h: "From Bali to your drawer",
    map_p: "You'll find 69SLAM stores in Bali and Lombok, Thailand, Vietnam, Japan, Russia, Spain, France, Mauritius and Réunion – and in Slovenia at 69slam.si.",
    map_note: "Source: official store list on 69slam.com",
    countries: [
      ["Indonesia", "Bali (14 stores) · Lombok & Gili (4)"],
      ["Thailand", "Phuket · Pattaya · Koh Samui · Koh Phangan"],
      ["Vietnam", "Nha Trang"],
      ["Japan", "Okinawa"],
      ["Russia", "Moscow · Sochi · Yeysk · Tver"],
      ["Spain", "Valencia"],
      ["France", "Antibes"],
      ["Mauritius", "Grand Baie"],
      ["Réunion", "Saint-Gilles-les-Bains"],
      ["Slovenia", "69slam.si – online store"],
    ],
  },
};

const CSS = `
.s2-hero{position:relative;min-height:min(78vh,760px);display:flex;align-items:flex-end;color:#fff;background:#0a0a0a;overflow:hidden;}
.s2-hero img{object-fit:cover;}
.s2-hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.15) 0%,rgba(0,0,0,.72) 100%);}
.s2-hero .in{position:relative;z-index:2;padding:0 clamp(16px,5vw,80px) clamp(36px,6vw,80px);max-width:1100px;}
.s2-kick{color:var(--accent);font-weight:800;font-size:.8rem;letter-spacing:.18em;text-transform:uppercase;}
main .s2-hero h1{font-size:clamp(2.4rem,7vw,5.4rem);line-height:.98;font-weight:900;text-transform:uppercase;letter-spacing:-.02em;font-style:normal;margin-top:14px;}
main .s2-hero h1 em{display:block;color:var(--accent);font-style:normal;}
.s2-intro{display:grid;grid-template-columns:1.2fr .8fr;gap:clamp(24px,5vw,80px);padding:clamp(48px,7vw,110px) clamp(16px,5vw,80px);max-width:1400px;margin:0 auto;align-items:center;}
.s2-h{font-size:clamp(1.5rem,3.2vw,2.5rem);font-weight:900;text-transform:uppercase;letter-spacing:-.02em;line-height:1.05;margin-bottom:18px;font-style:normal;color:#0a0a0a;}
.s2-p{font-size:clamp(1.02rem,1.3vw,1.18rem);line-height:1.75;color:#222;margin-bottom:14px;}
.s2-quote{font-size:clamp(1.8rem,4.2vw,3.4rem);font-weight:900;text-transform:uppercase;line-height:1.02;letter-spacing:-.02em;color:var(--accent);border-left:6px solid var(--accent);padding-left:clamp(16px,2vw,28px);}
.s2-loud{background:#0a0a0a;color:#fff;text-align:center;padding:clamp(56px,8vw,130px) clamp(16px,5vw,80px);}
.s2-loud .big{font-size:clamp(3rem,12vw,10rem);font-weight:900;letter-spacing:-.03em;line-height:.9;text-transform:uppercase;}
.s2-loud .big span{color:var(--accent);}
.s2-loud p{max-width:760px;margin:22px auto 0;font-size:clamp(1.05rem,1.5vw,1.3rem);line-height:1.7;color:#d0d0d0;}
.s2-loud p.strong{color:#fff;font-weight:800;text-transform:uppercase;letter-spacing:.04em;margin-top:26px;}
.s2-split{display:grid;grid-template-columns:1fr 1fr;align-items:stretch;}
.s2-split .pic{position:relative;min-height:clamp(320px,46vw,680px);background:#f5f5f7;}
.s2-split .pic img{object-fit:cover;}
.s2-split .txt{display:flex;flex-direction:column;justify-content:center;padding:clamp(36px,6vw,100px);}
.s2-split.rev .pic{order:2;}
.s2-crew{position:relative;min-height:clamp(360px,52vw,760px);background:#0a0a0a;}
.s2-crew img{object-fit:cover;}
.s2-card{position:relative;z-index:2;max-width:760px;margin:-90px auto 0;background:#fff;border-radius:20px;padding:clamp(24px,4vw,48px);box-shadow:0 20px 60px rgba(0,0,0,.12);}
.s2-cardwrap{padding:0 16px clamp(48px,7vw,100px);}
.s2-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(8px,1.2vw,18px);padding:0 clamp(16px,5vw,80px) clamp(48px,7vw,100px);}
.s2-strip a{display:block;aspect-ratio:1/1.12;background-size:cover;background-position:center;border-radius:8px;background-color:#f5f5f7;transition:opacity .15s;}
.s2-strip a:hover{opacity:.88;}
.s2-end{background:#0a0a0a;color:#fff;text-align:center;padding:clamp(56px,8vw,120px) clamp(16px,5vw,80px);}
.s2-end h2{font-size:clamp(1.8rem,4.4vw,3.4rem);font-weight:900;text-transform:uppercase;letter-spacing:-.02em;color:#fff;font-style:normal;margin-bottom:18px;}
.s2-end p{max-width:720px;margin:0 auto 14px;font-size:clamp(1.02rem,1.3vw,1.18rem);line-height:1.75;color:#d0d0d0;}
.s2-end .cta{margin-top:22px;}
.s2-map{padding:clamp(56px,8vw,120px) clamp(16px,5vw,80px);max-width:1400px;margin:0 auto;}
.s2-map .head{max-width:760px;margin-bottom:clamp(20px,3vw,36px);}
.s2-map .head .s2-kick{display:block;margin-bottom:10px;}
.s2-map .mapbox{background:#f5f5f7;border-radius:16px;padding:clamp(8px,2vw,24px);}
.s2-map svg{display:block;width:100%;height:auto;}
.s2-map .countries{list-style:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;margin:clamp(18px,2.5vw,28px) 0 0;padding:0;}
.s2-map .countries li{border:1px solid #e0e0e0;border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:3px;}
.s2-map .countries b{font-weight:800;text-transform:uppercase;letter-spacing:.04em;font-size:.86rem;color:#0a0a0a;}
.s2-map .countries span{font-size:.92rem;color:#555;line-height:1.45;}
.s2-map .countries li:last-child{border-color:var(--accent);background:#fff5f5;}
.s2-map .note{font-size:.78rem;color:#888;margin-top:14px;}
@media(max-width:860px){
  .s2-intro{grid-template-columns:1fr;}
  .s2-split{grid-template-columns:1fr;}
  .s2-split.rev .pic{order:0;}
  .s2-card{margin-top:-50px;}
  .s2-strip{grid-template-columns:repeat(2,1fr);}
  .s2-map .countries{grid-template-columns:1fr 1fr;}
}
`;

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const s = STORY[lang] || STORY.sl;
  const slug = "zgodba";
  return {
    title: s.meta_title,
    description: s.meta_desc,
    alternates: {
      canonical: `https://69slam.si/${lang}/${slug}`,
      languages: Object.fromEntries(LANGS.map((l) => [l, `https://69slam.si/${l}/${slug}`])),
    },
    openGraph: { images: ["/img/zgodba/ekipa.jpg"] },
  };
}

function Block({ b }) {
  return (
    <>
      <h2 className="s2-h">{b.h}</h2>
      {b.p.map((t, i) => <p className="s2-p" key={i}>{t}</p>)}
    </>
  );
}

export default async function StoryPage({ params }) {
  await primeCatalog();
  const { lang } = await params;
  const s = STORY[lang] || STORY.sl;
  const [q, loud, print, crew, pack] = s.blocks;
  const pics = getProducts().filter((p) => p.group === "boksarice" && p.gender === "moski" && !p.sale && p.img).slice(0, 4);

  return (
    <main>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <section className="s2-hero">
        <Image src={IMG.rain} alt="Bali" fill priority sizes="100vw" />
        <div className="in">
          <span className="s2-kick">{s.kicker}</span>
          <h1>{s.h1a}<em>{s.h1b}</em></h1>
        </div>
      </section>

      <section className="s2-intro">
        <div><Block b={q} /></div>
        <div className="s2-quote">{s.quote}</div>
      </section>

      <section className="s2-loud">
        <div className="big">Play <span>Loud</span></div>
        <p>{loud.p[0]}</p>
        <p className="strong">{loud.p[1]}</p>
      </section>

      <section className="s2-split">
        <div className="pic"><Image src={IMG.studio} alt={print.h} fill sizes="(max-width:860px) 100vw, 50vw" /></div>
        <div className="txt"><Block b={print} /></div>
      </section>

      <section className="s2-crew">
        <Image src="/img/zgodba/ekipa.jpg" alt={crew.h} fill sizes="100vw" style={{ objectPosition: "center 40%" }} />
      </section>
      <div className="s2-cardwrap">
        <div className="s2-card"><Block b={crew} /></div>
      </div>

      <section className="s2-split rev">
        <div className="pic"><Image src="/img/zgodba/kovcek-v2.jpg" alt={pack.h} fill sizes="(max-width:860px) 100vw, 50vw" /></div>
        <div className="txt"><Block b={pack} /></div>
      </section>

      <div style={{ height: "clamp(48px,7vw,100px)" }} />
      <div className="s2-strip">
        {pics.map((p) => (
          <Link key={p.code} href={`/${lang}/p/${p.slug}`} aria-label={p.name} style={{ backgroundImage: `url('${p.img}')` }} />
        ))}
      </div>

      <section className="s2-map">
        <div className="head">
          <span className="s2-kick">{s.map_kick}</span>
          <h2 className="s2-h">{s.map_h}</h2>
          <p className="s2-p">{s.map_p}</p>
        </div>
        <div className="mapbox">
          <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="img" aria-label={s.map_kick}>
            <path d={LAND} fill="#e4e4e7" />
            <path d={HIGHLIGHT} fill="#0a0a0a" />
            {POINTS.map((p) => (
              <g key={p.n}>
                <circle cx={p.x} cy={p.y} r={p.c === "si" ? 22 : 16} fill="var(--accent)" opacity=".22" />
                <circle cx={p.x} cy={p.y} r={p.c === "si" ? 10 : 8} fill="var(--accent)" stroke="#fff" strokeWidth="2.5" />
              </g>
            ))}
          </svg>
        </div>
        <ul className="countries">
          {s.countries.map(([c, t]) => (
            <li key={c}><b>{c}</b><span>{t}</span></li>
          ))}
        </ul>
        <p className="note">{s.map_note}</p>
      </section>

      <section className="s2-end">
        <h2>{s.end_h}</h2>
        {s.end_p.map((t, i) => <p key={i}>{t}</p>)}
        <Link className="cta" href={`/${lang}#shop`}>{s.cta}</Link>
      </section>
    </main>
  );
}
