import { LOGO_WHITE } from "../../lib/brand";
import Signup from "./Signup";
import { Countdown, TeamLogin } from "./Extras";
import { MAINTENANCE_UNTIL, OPEN_LABEL } from "../../lib/maintenance";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "69SLAM.si — odpiramo danes ob 18:30",
  description: "Nova 69SLAM spletna trgovina prihaja zelo kmalu.",
  robots: { index: false, follow: false },
};

const CSS = `
.mt{min-height:100vh;background:#0a0a0a;color:#fff;display:flex;align-items:center;justify-content:center;padding:40px 20px;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;}
.mt-box{max-width:560px;width:100%;text-align:center;}
.mt-logo{height:58px;width:auto;margin:0 auto 34px;display:block;}
.mt-tag{display:inline-block;border:1px solid #e63946;color:#e63946;border-radius:50px;padding:6px 14px;font-size:.72rem;font-weight:700;
  letter-spacing:.12em;text-transform:uppercase;margin-bottom:22px;}
.mt h1{font-size:clamp(2rem,7vw,3.3rem);font-weight:900;text-transform:uppercase;letter-spacing:-.02em;line-height:1.02;margin:0 0 18px;}
.mt h1 span{color:#e63946;}
.mt p{color:#bdbdbd;font-size:1.02rem;line-height:1.65;margin:0 0 30px;}
.mt-form{display:flex;gap:8px;max-width:440px;margin:0 auto;}
.mt-form input{flex:1;min-width:0;border:1px solid #333;background:#151515;color:#fff;border-radius:10px;padding:14px 16px;font-size:1rem;}
.mt-form button{border:0;background:#e63946;color:#fff;border-radius:10px;padding:0 20px;font-weight:800;text-transform:uppercase;
  letter-spacing:.08em;font-size:.8rem;cursor:pointer;}
.mt-form button:disabled{opacity:.6;}
.mt-msg{margin-top:12px;font-size:.9rem;color:#06d6a0;min-height:1.3em;}
.mt-msg.err{color:#ff8a8a;}
.mt-legal{margin-top:10px;font-size:.74rem;color:#777;}
.mt-legal a{color:#999;}
.mt-small{margin-top:34px;font-size:.82rem;color:#777;}
.mt-small a{color:#bdbdbd;}
.mt-cd{display:flex;gap:10px;justify-content:center;margin:0 0 30px;min-height:76px;}
.mt-cd>div{background:#151515;border:1px solid #2a2a2a;border-radius:12px;padding:10px 0;width:82px;}
.mt-cd b{display:block;font-size:2rem;font-weight:900;line-height:1.1;}
.mt-cd span{font-size:.68rem;color:#888;text-transform:uppercase;letter-spacing:.1em;}
.mt-team{margin-top:26px;background:none;border:0;color:#666;font-size:.8rem;cursor:pointer;text-decoration:underline;}
.mt-pass{margin-top:26px;flex-wrap:wrap;}
.mt-pass button{background:#06d6a0;color:#0a0a0a;}
@media (max-width:480px){.mt-form{flex-direction:column}.mt-form button{padding:14px}}
`;

export default function Maintenance() {
  return (
    <main className="mt">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="mt-box">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="mt-logo" src={LOGO_WHITE} alt="69SLAM" />
        <div className="mt-tag">Otvoritev</div>
        <h1>Odpiramo <span>{OPEN_LABEL}</span></h1>
        <p>Nova 69SLAM spletna trgovina se odpre {OPEN_LABEL}. Pusti svoj e-mail in te obvestimo takoj, ko odpremo — s posebnim popustom za otvoritev.</p>
        {MAINTENANCE_UNTIL && <Countdown until={MAINTENANCE_UNTIL} />}
        <Signup />
        <div className="mt-small">
          Vprašanja ali naročila: <a href="mailto:69slamslovenia@gmail.com">69slamslovenia@gmail.com</a>
        </div>
        <TeamLogin />
      </div>
    </main>
  );
}
