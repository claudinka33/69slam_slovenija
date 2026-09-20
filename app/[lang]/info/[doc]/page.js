import Link from "next/link";
import { notFound } from "next/navigation";
import { LANGS } from "../../../../lib/i18n";
import { DOCS, DOC_ORDER, LEGAL_UPDATED } from "../../../../lib/legal";

const CSS = `
.lg-wrap{max-width:860px;margin:0 auto;padding:44px 20px 72px;}
.lg-wrap h1{font-size:clamp(1.7rem,4vw,2.5rem);font-weight:900;text-transform:uppercase;letter-spacing:-.02em;font-style:normal;line-height:1.05;}
.lg-upd{color:var(--gray);font-size:.82rem;margin:8px 0 28px;}
.lg-note{background:#fff8e1;color:#5c4a00;border-radius:10px;padding:10px 14px;font-size:.85rem;margin-bottom:22px;}
.lg-wrap h2{font-size:1.12rem;font-weight:800;text-transform:uppercase;letter-spacing:.02em;font-style:normal;margin:30px 0 10px;}
.lg-wrap p{font-size:.98rem;line-height:1.7;color:#222;margin-bottom:12px;}
.lg-wrap ul{margin:0 0 14px 20px;}
.lg-wrap li{font-size:.98rem;line-height:1.65;color:#222;margin-bottom:6px;}
.lg-wrap pre{white-space:pre-wrap;font-family:inherit;font-size:.92rem;line-height:1.7;background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:18px 20px;color:#222;}
.lg-nav{display:flex;flex-wrap:wrap;gap:8px;margin-top:40px;padding-top:22px;border-top:1px solid var(--line);}
.lg-nav a{border:1px solid var(--line);border-radius:50px;padding:7px 14px;font-size:.74rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;text-decoration:none;color:#0a0a0a;}
.lg-nav a.cur,.lg-nav a:hover{background:#0a0a0a;border-color:#0a0a0a;color:#fff;}
`;

export function generateStaticParams() {
  return LANGS.flatMap((lang) => DOC_ORDER.map((doc) => ({ lang, doc })));
}

export async function generateMetadata({ params }) {
  const { lang, doc } = await params;
  const d = DOCS[doc];
  if (!d) return {};
  return {
    title: `${d.title} | 69SLAM.si`,
    description: d.desc,
    alternates: { canonical: `https://69slam.si/sl/info/${doc}` },
  };
}

export default async function LegalPage({ params }) {
  const { lang, doc } = await params;
  const d = DOCS[doc];
  if (!d) notFound();

  return (
    <main>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="lg-wrap">
        <h1>{d.title}</h1>
        <div className="lg-upd">Zadnja posodobitev: {LEGAL_UPDATED}</div>
        {lang !== "sl" && <div className="lg-note">Legal documents are available in Slovenian only. Questions? Write to us and we will gladly help in English.</div>}
        {d.body.map(([type, val], i) =>
          type === "h2" ? <h2 key={i}>{val}</h2> :
          type === "ul" ? <ul key={i}>{val.map((li, j) => <li key={j}>{li}</li>)}</ul> :
          type === "pre" ? <pre key={i}>{val}</pre> :
          <p key={i}>{val}</p>
        )}
        <nav className="lg-nav">
          {DOC_ORDER.map((slug) => (
            <Link key={slug} href={`/${lang}/info/${slug}`} className={slug === doc ? "cur" : ""}>{DOCS[slug].title}</Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
