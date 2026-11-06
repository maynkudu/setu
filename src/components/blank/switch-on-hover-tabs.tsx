"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Icon, type IconName } from "../ui";

// Adapted from BLANK Switch On Hover Tabs. Its concave fillets connect the
// selection to the content; deliberate clicks replace hover activation here.
export function WorkspaceNavigation({
  items,
  current,
  unread = 0,
  label,
}: {
  items: { path: string; label: string; icon: IconName }[];
  current: string;
  unread?: number;
  label: string;
}) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const position = () => {
      const active = node.querySelector<HTMLElement>('[aria-current="page"]');
      const marker = node.querySelector(".nav-selection");
      if (!active || !marker) return;
      gsap.killTweensOf(marker);
      gsap.set(marker, { y: active.offsetTop, height: active.offsetHeight });
    };
    const observer = new ResizeObserver(position);
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    observer.observe(node);
    preference.addEventListener("change", position);
    return () => {
      observer.disconnect();
      preference.removeEventListener("change", position);
      gsap.killTweensOf(node.querySelector(".nav-selection"));
    };
  }, []);
  useEffect(() => {
    const node = root.current;
    const active = node?.querySelector<HTMLElement>('[aria-current="page"]');
    const marker = node?.querySelector(".nav-selection");
    if (!active || !marker) return;
    const tween = gsap.to(marker, {
      y: active.offsetTop,
      height: active.offsetHeight,
      duration: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : 0.24,
      ease: "power3.out",
      overwrite: true,
    });
    return () => {
      tween.kill();
    };
  }, [current]);
  return (
    <nav ref={root} className="connected-nav" aria-label={label}>
      <span className="nav-selection" aria-hidden="true">
        <svg className="nav-fillet top" viewBox="0 0 20 20">
          <path d="M 6.018 19.789 C 4.705 20 3.137 20 0 20 L 20 20 L 20 0 C 20 3.137 20 4.705 19.789 6.018 C 18.65 13.098 13.098 18.65 6.018 19.789 Z" />
        </svg>
        <svg className="nav-fillet bottom" viewBox="0 0 20 20">
          <path d="M 6.018 0.211 C 4.705 0 3.137 0 0 0 L 20 0 L 20 20 C 20 16.863 20 15.295 19.789 13.982 C 18.65 6.902 13.098 1.35 6.018 0.211 Z" />
        </svg>
      </span>
      {items.map((item) => (
        <a
          key={item.path}
          href={`/workspace/${item.path}`}
          className={`nav-button ${current === item.path ? "selected" : ""}`}
          aria-current={current === item.path ? "page" : undefined}
        >
          <Icon name={item.icon} />
          {item.label}
          {item.path === "notifications" && unread > 0 && (
            <span className="counter">{unread}</span>
          )}
        </a>
      ))}
    </nav>
  );
}
