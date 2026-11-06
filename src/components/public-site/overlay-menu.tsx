"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import Image from "next/image";
import Link from "next/link";
import { policies } from "@/content/policies";

const entry = "/entry/";
type Presentation = "top" | "floating";
type MenuPhase = "closed" | "opening" | "open" | "closing";
const geometry = [
  "width",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "backgroundColor",
  "color",
  "borderRadius",
  "borderColor",
  "boxShadow",
];
function measure(node: HTMLElement, properties: readonly string[]) {
  const style = getComputedStyle(node);
  return Object.fromEntries(
    properties.map((property) => [
      property,
      style.getPropertyValue(
        property.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`),
      ),
    ]),
  );
}

// The opened menu sits above its transition and the closed navbar.
export default function OverlayMenu({
  dark,
  onToggle,
}: {
  dark: boolean;
  onToggle: (open: boolean) => void;
}) {
  const [phase, setPhase] = useState<MenuPhase>("closed");
  const open = phase === "opening" || phase === "open";
  const visible = phase !== "closed";
  const carrier = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const menuCarrier = useRef<HTMLDivElement>(null);
  const menuBar = useRef<HTMLElement>(null);
  const menuToggle = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const target = useRef(false);
  const controls = useRef<{ open: () => void; close: () => void } | null>(null);

  const close = useCallback(() => {
    if (!target.current) return;
    target.current = false;
    restoreFocus.current = true;
    setPhase("closing");
    controls.current?.close();
    menuToggle.current?.focus({ preventScroll: true });
  }, []);
  const toggleMenu = useCallback(() => {
    if (target.current) close();
    else {
      target.current = true;
      restoreFocus.current = false;
      setPhase("opening");
      onToggle(true);
      controls.current?.open();
    }
  }, [close, onToggle]);
  useEffect(() => () => onToggle(false), [onToggle]);

  useEffect(() => {
    const headerNode = bar.current;
    const carrierNode = carrier.current;
    const overlayNode = overlay.current;
    const menuHeaderNode = menuBar.current;
    const menuCarrierNode = menuCarrier.current;
    if (
      !headerNode ||
      !carrierNode ||
      !overlayNode ||
      !menuHeaderNode ||
      !menuCarrierNode
    )
      return;
    const header = headerNode;
    const wrapper = carrierNode;
    const node = overlayNode;
    const menuHeader = menuHeaderNode;
    const menuWrapper = menuCarrierNode;
    const media = gsap.matchMedia();
    let floating = window.scrollY > 260;
    let presentation: Presentation = floating ? "floating" : "top";
    let activeMenu = false;
    let reduced = false;
    let layoutMotion: gsap.core.Timeline | null = null;
    let menuMotion: gsap.core.Timeline | null = null;
    let scrollMotion: gsap.core.Tween | null = null;
    const elements = [
      { node: header, properties: geometry },
      ...Array.from(header.querySelectorAll<HTMLElement>(".logo")).map(
        (node) => ({ node, properties: ["width", "filter"] }),
      ),
      ...Array.from(
        header.querySelectorAll<HTMLElement>(".nav-context,.nav-links"),
      ).map((node) => ({ node, properties: ["opacity", "fontSize"] })),
      ...Array.from(header.querySelectorAll<HTMLElement>(".nav-action")).map(
        (node) => ({
          node,
          properties: [
            "minHeight",
            "paddingTop",
            "paddingRight",
            "paddingBottom",
            "paddingLeft",
            "borderColor",
          ],
        }),
      ),
    ];
    const offset = () => (window.innerWidth <= 560 ? 12 : 16);
    const classFor = (next: Presentation) =>
      `navigation ${next === "top" && dark ? "navigation-dark" : ""} ${next === "floating" ? "navigation-compact" : ""}`;

    function layout(next: Presentation, duration: number) {
      layoutMotion?.kill();
      scrollMotion?.kill();
      const before = elements.map(({ node, properties }) =>
        measure(node, properties),
      );
      header.className = classFor(next);
      header.style.removeProperty("max-width");
      elements.forEach(({ node, properties }) =>
        gsap.set(node, { clearProps: properties.join(",") }),
      );
      const after = elements.map(({ node, properties }) =>
        measure(node, properties),
      );
      header.style.maxWidth = "none";
      presentation = next;
      wrapper.dataset.navPhase = next;
      const tl = gsap.timeline({
        paused: true,
        defaults: { duration: reduced ? 0 : duration, ease: "power3.inOut" },
        onComplete: () => {
          header.style.removeProperty("max-width");
          elements.forEach(({ node, properties }) =>
            gsap.set(node, { clearProps: properties.join(",") }),
          );
          wrapper.dataset.navPhase = `${next}-settled`;
        },
      });
      elements.forEach(({ node }, i) =>
        tl.fromTo(node, before[i], after[i], 0),
      );
      tl.to(wrapper, { y: next === "top" ? -window.scrollY : offset() }, 0);
      layoutMotion = tl;
      return tl;
    }

    function finishClose() {
      activeMenu = false;
      node.hidden = true;
      setPhase("closed");
      onToggle(false);
      layout(floating ? "floating" : "top", reduced ? 0 : 0.18).play();
    }
    function createMenu() {
      menuMotion?.kill();
      layoutMotion?.pause();
      scrollMotion?.kill();
      activeMenu = true;
      node.hidden = false;
      const shape = geometry.filter(
        (property) => property !== "backgroundColor" && property !== "color",
      );
      const before = measure(header, shape);
      menuHeader.className = `navigation navigation-menu ${!floating && dark ? "navigation-dark" : ""}`;
      gsap.set(menuHeader, { clearProps: shape.join(",") });
      const after = measure(menuHeader, shape);
      const headerMotion = gsap.timeline({
        paused: true,
        defaults: {
          duration: reduced ? 0 : 0.38,
          ease: "power3.inOut",
        },
      });
      headerMotion
        .fromTo(menuHeader, before, after, 0)
        .fromTo(
          menuWrapper,
          { y: gsap.getProperty(wrapper, "y") },
          { y: offset() },
          0,
        );
      const logo = header.querySelector<HTMLElement>(".logo");
      const menuLogo = menuHeader.querySelector<HTMLElement>(".logo");
      if (logo && menuLogo) {
        gsap.set(menuLogo, { clearProps: "width" });
        headerMotion.fromTo(
          menuLogo,
          measure(logo, ["width"]),
          measure(menuLogo, ["width"]),
          0,
        );
      }
      const panels = node.querySelectorAll(".curtain-panel");
      const surface = node.querySelector(".curtain-surface");
      const lines = node.querySelectorAll(".curtain-line");
      gsap.set(panels, { scaleY: 0 });
      gsap.set(surface, { clipPath: "inset(0 0 100% 0)" });
      gsap.set(lines, { yPercent: 110 });
      const tl = gsap.timeline({
        paused: true,
        onComplete: () => {
          if (target.current) setPhase("open");
        },
        onReverseComplete: () => {
          if (!target.current) finishClose();
        },
      });
      tl.add(headerMotion.paused(false), 0)
        .to(
          panels,
          { scaleY: 1, duration: 0.65, stagger: 0.08, ease: "power3.inOut" },
          0.3,
        )
        .to(
          surface,
          { clipPath: "inset(0 0 0% 0)", duration: 0.65, ease: "power3.inOut" },
          0.62,
        )
        .to(
          lines,
          { yPercent: 0, duration: 0.55, stagger: 0.02, ease: "power3.out" },
          0.93,
        );
      menuMotion = tl;
      return tl;
    }
    function updateScroll() {
      const next = window.scrollY > (floating ? 160 : 260);
      const changed = next !== floating;
      floating = next;
      if (activeMenu) return;
      if (changed) {
        layout(floating ? "floating" : "top", floating ? 0.48 : 0.36).play();
      } else if (presentation === "top") {
        if (layoutMotion?.isActive() && !reduced) {
          scrollMotion = gsap.to(wrapper, {
            y: -window.scrollY,
            duration: 0.28,
            ease: "power3.out",
            overwrite: true,
          });
        } else gsap.set(wrapper, { y: -window.scrollY });
      }
    }
    function resize() {
      if (activeMenu) {
        menuMotion?.kill();
        layout(floating ? "floating" : "top", 0).progress(1);
        if (target.current) createMenu().progress(1).pause();
        else finishClose();
      } else layout(floating ? "floating" : "top", 0).progress(1);
    }
    media.add(
      {
        reduce: "(prefers-reduced-motion: reduce)",
        motion: "(prefers-reduced-motion: no-preference)",
      },
      (context) => {
        reduced = Boolean(context.conditions?.reduce);
        header.className = classFor(floating ? "floating" : "top");
        gsap.set(wrapper, { y: floating ? offset() : -window.scrollY });
        wrapper.dataset.navPhase = floating
          ? "floating-settled"
          : "top-settled";
        if (target.current) {
          createMenu().progress(1).pause();
        } else if (activeMenu) finishClose();
        controls.current = {
          open() {
            const tl = activeMenu && menuMotion ? menuMotion : createMenu();
            if (reduced || tl.progress() === 1) {
              tl.progress(1).pause();
              setPhase("open");
            } else tl.timeScale(1).play();
          },
          close() {
            if (reduced || !menuMotion?.progress()) finishClose();
            else menuMotion.timeScale(1.5).reverse();
          },
        };
        window.addEventListener("scroll", updateScroll, { passive: true });
        window.addEventListener("resize", resize);
        return () => {
          controls.current = null;
          layoutMotion?.kill();
          menuMotion?.kill();
          scrollMotion?.kill();
          window.removeEventListener("scroll", updateScroll);
          window.removeEventListener("resize", resize);
        };
      },
    );
    return () => media.revert();
  }, [dark, onToggle]);

  useEffect(() => {
    if (phase === "open" && target.current)
      overlay.current
        ?.querySelector<HTMLAnchorElement>(".curtain-main a")
        ?.focus({ preventScroll: true });
    else if (phase === "opening")
      menuToggle.current?.focus({ preventScroll: true });
    else if (phase === "closed" && restoreFocus.current) {
      restoreFocus.current = false;
      toggle.current?.focus({ preventScroll: true });
    }
  }, [phase]);

  useEffect(() => {
    if (!visible) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function keyboard(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
      if (event.key !== "Tab") return;
      const nodes = Array.from(
        overlay.current?.querySelectorAll<
          HTMLAnchorElement | HTMLButtonElement
        >("a[href],button:not([disabled])") ?? [],
      ).filter((node) => !node.closest("[inert]"));
      const first = nodes[0],
        last = nodes.at(-1);
      if (!nodes.some((node) => node === document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", keyboard);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", keyboard);
    };
  }, [visible, close]);

  return (
    <>
      <div className={`nav-space ${dark ? "nav-space-dark" : ""}`}>
        <div ref={carrier} className="navigation-carrier" inert={visible}>
          <header
            ref={bar}
            className={`navigation ${dark ? "navigation-dark" : ""}`}
          >
            <Link
              href="/"
              className="home-link"
              aria-label="SETU home"
              onNavigate={close}
              transitionTypes={["nav-back"]}
            >
              <Image
                className="logo"
                src="/setu-logo.png"
                width={1438}
                height={655}
                sizes="88px"
                alt="SETU"
              />
            </Link>
            <span className="nav-context">
              IIT Madras BS
              <br />
              Alumni mentorship
            </span>
            <nav className="nav-links" aria-label="Main navigation">
              <Link href="/#how">How it works</Link>
              <Link href="/association">About SETU</Link>
              <Link className="action nav-action" href={`${entry}student`}>
                Student sign in
              </Link>
            </nav>
            <button
              ref={toggle}
              className="menu"
              aria-expanded={open}
              aria-controls="navigation-panel"
              onClick={toggleMenu}
            >
              <span>Menu</span>
              <span className="menu-mark" aria-hidden="true">
                <i />
                <i />
              </span>
            </button>
          </header>
        </div>
      </div>
      <div
        ref={overlay}
        id="navigation-panel"
        className="nav-curtain"
        data-menu-phase={phase}
        hidden={!visible}
        inert={!visible}
        role={visible ? "dialog" : undefined}
        aria-modal={visible ? true : undefined}
        aria-label="Programme navigation"
      >
        <div className="curtain-transition" aria-hidden="true">
          {["#e2d4dc", "#a24864", "#8e3452", "#681c36"].map((color) => (
            <div
              key={color}
              className="curtain-panel"
              style={{ background: color }}
            />
          ))}
        </div>
        <div className="opened-menu">
          <div ref={menuCarrier} className="menu-navigation-carrier">
            <header ref={menuBar} className="navigation navigation-menu">
              <Link
                href="/"
                className="home-link"
                aria-label="SETU home"
                onNavigate={close}
                transitionTypes={["nav-back"]}
              >
                <Image
                  className="logo"
                  src="/setu-logo.png"
                  width={1438}
                  height={655}
                  sizes="88px"
                  alt="SETU"
                />
              </Link>
              <button
                ref={menuToggle}
                className="menu"
                aria-expanded={open}
                aria-controls="navigation-panel"
                onClick={toggleMenu}
              >
                <span>{open ? "Close" : "Menu"}</span>
                <span
                  className={`menu-mark ${open ? "menu-mark-open" : ""}`}
                  aria-hidden="true"
                >
                  <i />
                  <i />
                </span>
              </button>
            </header>
          </div>
          <div className="curtain-surface" inert={phase !== "open"}>
            <nav className="curtain-main" aria-label="Explore SETU">
              {[
                { label: "Home", href: "/" },
                { label: "How it works", href: "/#how" },
                { label: "For alumni", href: "/#alumni" },
                { label: "About SETU", href: "/association" },
              ].map((link, i) => (
                <div className="curtain-mask" key={link.href}>
                  <Link
                    className="curtain-line"
                    href={link.href}
                    onNavigate={close}
                  >
                    <span className="curtain-index">0{i + 1}</span>
                    {link.label}
                  </Link>
                </div>
              ))}
            </nav>
            <div className="curtain-aside">
              <div>
                <span className="curtain-label">Join the programme</span>
                {[
                  ["Find your mentor", "student?mode=signup"],
                  ["Become a mentor", "mentor?mode=signup"],
                  ["IIC staff sign in", "admin"],
                ].map(([label, href]) => (
                  <div className="curtain-mask" key={href}>
                    <Link
                      className="curtain-line"
                      href={`${entry}${href}`}
                      onNavigate={close}
                    >
                      {label}
                    </Link>
                  </div>
                ))}
              </div>
              <nav aria-label="Programme policies">
                <span className="curtain-label">Programme information</span>
                {Object.entries(policies).map(([slug, p]) => (
                  <div className="curtain-mask" key={slug}>
                    <Link
                      className="curtain-line"
                      href={`/policies/${slug}`}
                      onNavigate={close}
                    >
                      {p.title}
                    </Link>
                  </div>
                ))}
              </nav>
            </div>
            <div className="curtain-base">
              <span>Career guidance through alumni mentorship.</span>
              <span>A student project. Voluntary and free.</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
