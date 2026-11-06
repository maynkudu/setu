"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// SVG path drawing adapted from BLANK Ribbon Stroke Scroll, without its pinned scroller.
export default function ConnectionArt() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const media = gsap.matchMedia();
    media.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        const paths =
          node.querySelectorAll<SVGPathElement>(".connection-stroke");
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        paths.forEach((path, i) => {
          const length = path.getTotalLength();
          gsap.set(path, { strokeDasharray: length });
          tl.fromTo(
            path,
            { strokeDashoffset: length },
            { strokeDashoffset: 0, duration: 1.8 },
            i * 0.2,
          );
        });
        const hero = node.closest(".hero");
        if (hero)
          gsap.to(node.querySelector(".connection-scroll"), {
            rotation: -16,
            y: -65,
            scale: 1.12,
            force3D: true,
            ease: "none",
            scrollTrigger: {
              trigger: hero,
              start: "top top",
              end: "bottom top",
              scrub: 0.6,
            },
          });
        const pointerMedia = matchMedia("(pointer: fine)");
        const x = gsap.quickTo(node.querySelector(".connection-pointer"), "x", {
          duration: 0.8,
          ease: "power3.out",
        });
        const y = gsap.quickTo(node.querySelector(".connection-pointer"), "y", {
          duration: 0.8,
          ease: "power3.out",
        });
        const rotate = gsap.quickTo(
          node.querySelector(".connection-pointer"),
          "rotation",
          { duration: 0.8, ease: "power3.out" },
        );
        const move = (event: PointerEvent) => {
          if (!pointerMedia.matches) return;
          const rect = node.getBoundingClientRect();
          const nx = (event.clientX - rect.left) / rect.width - 0.5;
          const ny = (event.clientY - rect.top) / rect.height - 0.5;
          x(nx * 30);
          y(ny * 24);
          rotate(nx * 9);
        };
        function reset() {
          x(0);
          y(0);
          rotate(0);
        }
        node.addEventListener("pointermove", move);
        node.addEventListener("pointerleave", reset);
        return () => {
          node.removeEventListener("pointermove", move);
          node.removeEventListener("pointerleave", reset);
          x.tween.kill();
          y.tween.kill();
          rotate.tween.kill();
        };
      },
      root,
    );
    return () => media.revert();
  }, []);
  return (
    <div ref={root} className="connection-art" aria-hidden="true">
      <div className="connection-orbit" />
      <div className="connection-scroll">
        <div className="connection-pointer">
          <svg viewBox="0 0 650 650" fill="none">
            <defs>
              <linearGradient
                id="ribbon-cream"
                x1="90"
                y1="120"
                x2="420"
                y2="470"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#fff8ef" />
                <stop offset=".32" stopColor="#f4e2d2" />
                <stop offset=".58" stopColor="#ac7a78" />
                <stop offset=".77" stopColor="#fff5e6" />
                <stop offset="1" stopColor="#ceaaa0" />
              </linearGradient>
              <linearGradient
                id="ribbon-rose"
                x1="240"
                y1="220"
                x2="530"
                y2="560"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#8e3452" />
                <stop offset=".3" stopColor="#e8a5bb" />
                <stop offset=".55" stopColor="#fff0e7" />
                <stop offset=".76" stopColor="#c27692" />
                <stop offset="1" stopColor="#903451" />
              </linearGradient>
            </defs>
            <ellipse
              cx="350"
              cy="525"
              rx="155"
              ry="18"
              fill="#341523"
              opacity=".18"
            />
            <g strokeWidth="68" strokeLinecap="round" strokeLinejoin="round">
              <path
                className="connection-stroke"
                d="M176 260 L276 160 C370 66 486 182 392 276 L292 376 C198 470 82 354 176 260Z"
                stroke="url(#ribbon-cream)"
              />
              <path
                className="connection-stroke"
                d="M292 376 L392 276 C486 182 602 298 508 392 L408 492 C314 586 198 470 292 376Z"
                stroke="url(#ribbon-rose)"
              />
            </g>
          </svg>
        </div>
      </div>
      <span className="connection-label connection-student">Your question</span>
      <span className="connection-label connection-mentor">
        Their experience
      </span>
    </div>
  );
}
