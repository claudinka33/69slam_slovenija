"use client";
import { useCart } from "./CartContext";

export default function BundleBar({ t }) {
  const { openBundle } = useCart();
  return (
    <section className="wrap">
      <div className="bundlebar">
        <div className="inner">
          <div className="btxt">
            <h3>{t.bundle_title}</h3>
            <p>{t.bundle_sub}</p>
          </div>
          <button className="cta" onClick={openBundle}>{t.bundle_cta}</button>
        </div>
      </div>
    </section>
  );
}
