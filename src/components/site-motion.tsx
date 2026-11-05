"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Lenis from "lenis";
import { usePathname } from "next/navigation";
export function SiteMotion({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const overlay = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let scroll: Lenis | undefined;
    const configure = () => {
      scroll?.destroy();
      scroll = undefined;
      if (!preference.matches)
        scroll = new Lenis({
          autoRaf: true,
          anchors: true,
          lerp: 0.095,
          smoothWheel: true,
          prevent: (node) =>
            Boolean(node.closest("dialog,.sidebar,[data-lenis-prevent]")),
        });
    };
    configure();
    preference.addEventListener("change", configure);
    return () => {
      preference.removeEventListener("change", configure);
      scroll?.destroy();
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    let exit: Animation | undefined;
    const node = overlay.current;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    if (!node) return;
    if (preference.matches) {
      queueMicrotask(() => setLoading(false));
      return;
    }
    const mark = node.querySelector("svg");
    const intro = mark?.animate(
      [
        { opacity: 0, transform: "translateY(8px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 550, easing: "cubic-bezier(.16,1,.3,1)", fill: "both" },
    );
    const timer = setTimeout(() => void dismiss(), 1500);
    let dismissed = false;
    async function dismiss() {
      if (cancelled || dismissed) return;
      dismissed = true;
      clearTimeout(timer);
      exit = node?.animate(
        [{ clipPath: "inset(0 0 0 0)" }, { clipPath: "inset(0 0 100% 0)" }],
        {
          duration: 480,
          easing: "cubic-bezier(.76,0,.24,1)",
          fill: "forwards",
        },
      );
      try {
        await exit?.finished;
      } catch {}
      if (!cancelled) setLoading(false);
    }
    void Promise.all([document.fonts.ready, intro?.finished])
      .then(dismiss)
      .catch(dismiss);
    const reduce = () => {
      if (preference.matches) {
        intro?.cancel();
        exit?.cancel();
        node.style.display = "none";
        setLoading(false);
      }
    };
    preference.addEventListener("change", reduce);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      intro?.cancel();
      exit?.cancel();
      preference.removeEventListener("change", reduce);
    };
  }, []);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const animations: Animation[] = [];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            observer.unobserve(entry.target);
            if (!preference.matches) {
              animations.push(
                entry.target.animate(
                  [
                    { opacity: 0.25, transform: "translateY(22px)" },
                    { opacity: 1, transform: "translateY(0)" },
                  ],
                  { duration: 650, easing: "cubic-bezier(.16,1,.3,1)" },
                ),
              );
            }
          }
        }
      },
      { threshold: 0.15 },
    );
    node
      .querySelectorAll(".process-item,.public-bottom")
      .forEach((element) => observer.observe(element));
    const reduce = () => {
      if (preference.matches) animations.forEach((a) => a.finish());
    };
    preference.addEventListener("change", reduce);
    return () => {
      observer.disconnect();
      animations.forEach((a) => a.cancel());
      preference.removeEventListener("change", reduce);
    };
  }, [pathname]);
  return (
    <div ref={root} data-site-ready={!loading}>
      {children}
      {loading && (
        <div ref={overlay} className="setu-preloader" aria-hidden="true">
          <div className="preloader-brand">
            <svg viewBox="0 0 80 50" fill="none">
              <path
                className="preloader-bridge"
                d="M8 39V15m64 24V15M8 28c15-24 49-24 64 0M21 39V18m19 21V9m19 30V18M8 39h64"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span>setu</span>
          </div>
        </div>
      )}
      <noscript>
        <style>{".setu-preloader{display:none!important}"}</style>
      </noscript>
    </div>
  );
}
