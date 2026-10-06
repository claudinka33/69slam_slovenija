import { LOGO_WHITE } from "../../lib/brand";
import Signup from "./Signup";

export const metadata = {
  title: "69SLAM.si — urejamo novo spletno trgovino",
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
.mt-small{margin-top:34px;font-size:.82rem;color:#777;}
.mt-small a{color:#bdbdbd;}
@media (max-width:480px){.mt-form{flex-direction:column}.mt-form button{padding:14px}}
`;

export default function Maintenance() {
  return (
    <main className="mt">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="mt-box">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="mt-logo" src={LOGO_WHITE} alt="69SLAM" />
        <div className="mt-tag">Kmalu</div>
        <h1>Urejamo <span>novo</span> spletno trgovino za vas</h1>
        <p>Nova 69SLAM trgovina bo odprta zelo kmalu. Pusti svoj e-mail in te obvestimo prvega, ko odpremo — s posebnim popustom za otvoritev.</p>
        <Signup />
        <div className="mt-small">
          Vprašanja ali naročila: <a href="mailto:69slamslovenia@gmail.com">69slamslovenia@gmail.com</a>
        </div>
      </div>
    </main>
  );
}
