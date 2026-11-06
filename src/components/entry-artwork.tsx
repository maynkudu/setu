"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import type { Role } from "@/lib/domain";

export function EntryArtwork({ role }: { role: Role }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const media = gsap.matchMedia();
    media.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        gsap.from(".entry-art-layer", {
          y: 45,
          rotation: -5,
          opacity: 0,
          duration: 1.4,
          stagger: 0.12,
          ease: "power3.out",
          transformOrigin: "50% 50%",
        });
        const parts = node.querySelectorAll<SVGPathElement>(".art-draw");
        parts.forEach((path, i) => {
          const length = path.getTotalLength();
          gsap.fromTo(
            path,
            { strokeDasharray: length, strokeDashoffset: length },
            {
              strokeDashoffset: 0,
              delay: 0.25 + i * 0.12,
              duration: 1.8,
              ease: "power2.inOut",
            },
          );
        });
        const x = gsap.quickTo(node.querySelector("svg"), "x", {
          duration: 0.7,
          ease: "power3.out",
        });
        const y = gsap.quickTo(node.querySelector("svg"), "y", {
          duration: 0.7,
          ease: "power3.out",
        });
        const move = (event: PointerEvent) => {
          if (event.pointerType !== "mouse") return;
          const rect = node.getBoundingClientRect();
          x(((event.clientX - rect.left) / rect.width - 0.5) * 20);
          y(((event.clientY - rect.top) / rect.height - 0.5) * 20);
        };
        const reset = () => {
          x(0);
          y(0);
        };
        node.addEventListener("pointermove", move);
        node.addEventListener("pointerleave", reset);
        return () => {
          node.removeEventListener("pointermove", move);
          node.removeEventListener("pointerleave", reset);
          x.tween.kill();
          y.tween.kill();
        };
      },
      root,
    );
    return () => media.revert();
  }, [role]);
  return (
    <div ref={root} className="entry-art" aria-hidden="true">
      <svg viewBox="0 0 600 460" fill="none">
        {role === "student" ? (
          <>
            {[0, 1, 2, 3].map((i) => (
              <g className="entry-art-layer" key={i}>
                <path
                  d={`M${100 + i * 35} ${265 - i * 47} l150 -70 230 110 -150 70Z`}
                  fill="currentColor"
                  fillOpacity={0.08 + i * 0.06}
                  stroke="currentColor"
                  strokeOpacity=".65"
                />
                <path
                  className="art-draw"
                  d={`M${130 + i * 35} ${270 - i * 47} l120 -55 190 90`}
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </g>
            ))}
            <path
              className="art-draw"
              d="M105 380 C160 340 220 385 260 320 S340 245 345 170 S405 80 490 85"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx="490" cy="85" r="9" fill="currentColor" />
          </>
        ) : role === "mentor" ? (
          <>
            {[0, 1, 2, 3, 4].map((i) => (
              <g key={i} className="entry-art-layer">
                <ellipse
                  cx="300"
                  cy="230"
                  rx={210 - i * 22}
                  ry={165 - i * 24}
                  transform={`rotate(${i % 2 ? 35 : -35} 300 230)`}
                  stroke="currentColor"
                  strokeWidth={i === 4 ? 7 : 2}
                  strokeOpacity={0.22 + i * 0.15}
                />
              </g>
            ))}
            <path
              className="art-draw"
              d="M95 300 C140 95 315 60 430 155 S440 390 270 355"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx="270" cy="355" r="10" fill="currentColor" />
          </>
        ) : (
          <>
            {[0, 1, 2].map((i) => (
              <g
                key={i}
                className="entry-art-layer"
                transform={`translate(${i * 22} ${-i * 25})`}
              >
                <rect
                  x="118"
                  y="130"
                  width="325"
                  height="225"
                  rx="3"
                  fill="currentColor"
                  fillOpacity=".05"
                  stroke="currentColor"
                  strokeOpacity={0.3 + i * 0.2}
                />
                <path
                  d="M118 185H443M118 240H443M118 295H443M200 130V355M280 130V355M360 130V355"
                  stroke="currentColor"
                  strokeOpacity=".2"
                />
              </g>
            ))}
            <path
              className="art-draw"
              d="M160 320H225V265H305V155H385V105H470"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinejoin="round"
            />
            {[
              [160, 320],
              [225, 265],
              [305, 155],
              [385, 105],
              [470, 105],
            ].map(([cx, cy]) => (
              <circle key={cx} cx={cx} cy={cy} r="7" fill="currentColor" />
            ))}
          </>
        )}
      </svg>
    </div>
  );
}
