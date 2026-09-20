import Link from "next/link";
import { getProducts } from "../../../lib/catalog";
import { LANGS } from "../../../lib/i18n";

const STORY = {
  sl: {
    meta_title: "Zgodba 69SLAM — rojeno na Baliju | 69SLAM.si",
    meta_desc: "Januar 2004, Bali, deževna nedelja in eno vprašanje: zakaj je moško spodnje perilo tako dolgočasno? Zgodba znamke 69SLAM in gibanja PLAY LOUD.",
    kicker: "Zgodba 69SLAM",
    h1a: "Rojeno na Baliju.",
    h1b: "Narejeno, da se te vidi.",
    blocks: [
      { h: "Vse se je začelo z enim vprašanjem", p: [
        "Januar 2004, Bali, deževna nedelja. Nekdo je pogledal v predal s spodnjim perilom in vprašal: zakaj je vse to tako sivo, varno in dolgočasno?",
        "Spodnjice so prva stvar, ki jo zjutraj oblečeš. Če se dan začne z dolgčasom, kako naj se nadaljuje drugače?",
        "Iz tega vprašanja je nastal 69SLAM – znamka, zgrajena na barvah, samozavesti in tem, da si upaš biti to, kar si. Življenje je že dovolj resno. Tisto, kar nosiš, naj te spravi v dobro voljo.",
      ] },
      { h: "PLAY LOUD", p: [
        "Ni slogan, je način razmišljanja. Skoči noter. Gibaj se svobodno. Smej se glasneje. Ne utišaj se samo zato, ker se drugi.",
        "69SLAM ne sledi trendom. Dela izjave.",
      ] },
      { h: "Print je naš jezik", p: [
        "Drzen, barvit, nepričakovan – in prepoznaven na prvi pogled. Vsak print ima svojo zgodbo: balijske maske, japonski zmaji, mehiške lobanje, tropsko cvetje. Nastajajo v studiu na Baliju, nekateri tudi v sodelovanju z lokalnimi umetniki.",
        "Zato nobene 69SLAM spodnjice niso »samo ene spodnjice«. So majhen opomnik, vsako jutro, da dan lahko začneš po svoje.",
      ] },
      { h: "Ekipa z otoka", p: [
        "Za znamko stoji pisana druščina kreativcev, surferjev, skejterjev in sanjačev z vsega sveta, ki živijo in ustvarjajo na Baliju. Različne kulture, različne zgodbe – in prav ta mešanica je razlog, da 69SLAM izgleda tako, kot ne izgleda nič drugega.",
      ] },
      { h: "Ne pakiraj dolgčasa", p: [
        "Večina moških gre na teden dopusta s tremi pari boksaric. Mi pravimo: nadgradi rotacijo. V Braziliji za novo leto oblečejo čisto nove spodnjice za srečo – mi mislimo, da si vsak dan zasluži tak začetek.",
      ] },
    ],
    end_h: "Od Balija do tvojega predala",
    end_p: [
      "Več kot 20 let pozneje se 69SLAM nosi po vsem svetu. V Sloveniji ga dobiš pri nas – 100 % original, neposredno od znamke.",
      "Pri nas smo se osredotočili na tisto, kar 69SLAM dela najbolje: spodnjice iz mikrofibre. Se ne rolajo, se hitro sušijo in ostanejo sveže ves dan. Izgledajo glasno, nosijo se tiho.",
    ],
    cta: "Izberi svoj print →",
    quote: "Življenje je že dovolj resno.",
  },
  en: {
    meta_title: "The 69SLAM story — born in Bali | 69SLAM.si",
    meta_desc: "January 2004, Bali, a rainy Sunday and one question: why is men's underwear so boring? The story of 69SLAM and the PLAY LOUD movement.",
    kicker: "The 69SLAM story",
    h1a: "Born in Bali.",
    h1b: "Made to be seen.",
    blocks: [
      { h: "It all started with one question", p: [
        "January 2004, Bali, a rainy Sunday. Someone looked into an underwear drawer and asked: why is all of this so grey, safe and boring?",
        "Underwear is the first thing you put on in the morning. If the day starts dull, how is it supposed to get any better?",
        "That question became 69SLAM – a brand built on colour, confidence and the nerve to be exactly who you are. Life is serious enough. What you wear should put you in a good mood.",
      ] },
      { h: "PLAY LOUD", p: [
        "Not a slogan, a mindset. Jump in. Move freely. Laugh louder. Don't tone yourself down just because everyone else does.",
        "69SLAM doesn't follow trends. It makes statements.",
      ] },
      { h: "Print is our language", p: [
        "Bold, colourful, unexpected – and recognisable at first glance. Every print has its own story: Balinese masks, Japanese dragons, Mexican skulls, tropical flowers. They are created in the Bali studio, some together with local artists.",
        "That's why no pair of 69SLAM is \"just a pair of boxers\". It's a small reminder, every morning, that you can start the day your way.",
      ] },
      { h: "The island crew", p: [
        "Behind the brand is a colourful crew of creatives, surfers, skaters and dreamers from all over the world, living and creating in Bali. Different cultures, different stories – and that mix is exactly why 69SLAM looks like nothing else.",
      ] },
      { h: "Don't pack boring", p: [
        "Most guys pack three pairs of boxers for a week away. We say: upgrade the rotation. In Brazil they wear brand-new underwear on New Year's Eve for luck – we think every day deserves a start like that.",
      ] },
    ],
    end_h: "From Bali to your drawer",
    end_p: [
      "More than 20 years later, 69SLAM is worn all over the world. In Slovenia you get it from us – 100% original, straight from the brand.",
      "We focus on what 69SLAM does best: microfibre underwear. No ride-up, quick to dry, fresh all day. They look loud and wear quiet.",
    ],
    cta: "Pick your print →",
    quote: "Life is serious enough.",
  },
};

const CSS = `
.st-hero{background:var(--navy);color:#fff;padding:72px 0 64px;}
.st-hero .kicker{color:var(--accent2);font-weight:800;font-size:.8rem;letter-spacing:.16em;text-transform:uppercase;}
.st-hero h1{font-size:clamp(2.2rem,6vw,4.2rem);line-height:1.02;font-weight:900;text-transform:uppercase;letter-spacing:-.02em;font-style:italic;margin-top:14px;}
.st-hero h1 em{color:var(--accent);font-style:italic;display:block;}
.st-body{background:#fff;}
.st-body .wrap{max-width:820px;padding-top:56px;padding-bottom:24px;}
.st-block{margin-bottom:44px;}
.st-block h2{font-size:clamp(1.35rem,3vw,1.9rem);font-weight:900;text-transform:uppercase;letter-spacing:-.01em;margin-bottom:14px;color:var(--navy);}
.st-block p{font-size:1.08rem;line-height:1.75;color:var(--ink);margin-bottom:14px;}
.st-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:8px 0 52px;}
.st-strip a{display:block;aspect-ratio:3/4;background-size:cover;background-position:center;border-radius:var(--radius);background-color:var(--bg);}
.st-quote{font-size:clamp(1.5rem,4vw,2.4rem);font-weight:900;font-style:italic;text-transform:uppercase;line-height:1.1;color:var(--accent);margin:0 0 48px;letter-spacing:-.01em;}
.st-end{background:var(--navy);color:#fff;padding:64px 0;}
.st-end .wrap{max-width:820px;}
.st-end h2{font-size:clamp(1.5rem,3.4vw,2.2rem);font-weight:900;text-transform:uppercase;margin-bottom:16px;}
.st-end p{font-size:1.08rem;line-height:1.75;color:#C9D6E6;margin-bottom:14px;}
.st-end .cta{margin-top:18px;}
@media(max-width:640px){.st-strip{grid-template-columns:repeat(2,1fr);}.st-hero{padding:48px 0 44px;}}
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
  };
}

export default async function StoryPage({ params }) {
  const { lang } = await params;
  const s = STORY[lang] || STORY.sl;
  const pics = getProducts().filter((p) => !p.sale && p.img).slice(0, 4);

  return (
    <main>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <section className="st-hero">
        <div className="wrap">
          <span className="kicker">{s.kicker}</span>
          <h1>{s.h1a}<em>{s.h1b}</em></h1>
        </div>
      </section>

      <section className="st-body">
        <div className="wrap">
          {s.blocks.slice(0, 2).map((b) => (
            <div className="st-block" key={b.h}>
              <h2>{b.h}</h2>
              {b.p.map((t, i) => <p key={i}>{t}</p>)}
            </div>
          ))}

          <div className="st-quote">{s.quote}</div>

          <div className="st-strip">
            {pics.map((p) => (
              <Link key={p.code} href={`/${lang}/p/${p.slug}`} aria-label={p.name} style={{ backgroundImage: `url('${p.img}')` }} />
            ))}
          </div>

          {s.blocks.slice(2).map((b) => (
            <div className="st-block" key={b.h}>
              <h2>{b.h}</h2>
              {b.p.map((t, i) => <p key={i}>{t}</p>)}
            </div>
          ))}
        </div>
      </section>

      <section className="st-end">
        <div className="wrap">
          <h2>{s.end_h}</h2>
          {s.end_p.map((t, i) => <p key={i}>{t}</p>)}
          <Link className="cta" href={`/${lang}#shop`}>{s.cta}</Link>
        </div>
      </section>
    </main>
  );
}
