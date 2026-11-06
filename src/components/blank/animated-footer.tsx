"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { FluidRefraction } from "./fluid-refraction";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// BLANK Animated Footer's sampled glyphs and connected hover clusters.
const ASCII_CHARS = "........:::=+xX#0369";
const COLUMNS = 80;
const CELL = 20;
const FONT = 18;
const HOVER_RADIUS = 8;
const CLUSTER_SIZE = 10;
const LIFETIME = 300;
const CHAR_COLOR = "#cc93ad";
const HOVER_COLOR = "#f3dce6";
const BACKGROUND = "#411629";
type Cell = { col: number; row: number; char: string; until: number };
type Hand = {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  base: HTMLCanvasElement;
  cells: Map<string, Cell>;
  rows: number;
  baseline: number;
};

function AsciiHands() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const rootNode = root.current;
    if (!rootNode) return;
    const node = rootNode;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const wrappers = Array.from(
      node.querySelectorAll<HTMLElement>(".ascii-hand"),
    );
    const canvases = Array.from(node.querySelectorAll("canvas"));
    const hands: Hand[] = [];
    const images: HTMLImageElement[] = [];
    let visible = false;
    let loaded = false;
    let disposed = false;
    let frame = 0;
    let pointers = wrappers.map((wrapper) => ({
      x: gsap.quickTo(wrapper, "x", { duration: 0.75, ease: "power3.out" }),
      y: gsap.quickTo(wrapper, "y", { duration: 0.75, ease: "power3.out" }),
    }));
    function draw(time: number) {
      frame = 0;
      if (!visible || document.hidden || disposed) return;
      let active = false;
      for (const hand of hands) {
        const { context, base, cells, baseline } = hand;
        context.clearRect(0, 0, COLUMNS * CELL, hand.rows * CELL);
        context.drawImage(base, 0, 0, COLUMNS * CELL, hand.rows * CELL);
        if (preference.matches) continue;
        for (const cell of cells.values()) {
          if (cell.until <= time) continue;
          active = true;
          context.fillStyle = HOVER_COLOR;
          context.fillRect(cell.col * CELL, cell.row * CELL, CELL, CELL);
          context.fillStyle = BACKGROUND;
          context.fillText(
            cell.char,
            cell.col * CELL + CELL / 2,
            cell.row * CELL + baseline,
          );
        }
      }
      if (active) frame = requestAnimationFrame(draw);
    }
    function wake() {
      if (!frame && visible && !document.hidden && !disposed)
        frame = requestAnimationFrame(draw);
    }
    function build(image: HTMLImageElement, canvas: HTMLCanvasElement) {
      if (disposed || !image.naturalWidth) return;
      const rows = Math.round(
        (COLUMNS * image.naturalHeight) / image.naturalWidth,
      );
      const sampler = document.createElement("canvas");
      sampler.width = COLUMNS;
      sampler.height = rows;
      const sample = sampler.getContext("2d", { willReadFrequently: true });
      if (!sample) return;
      sample.drawImage(image, 0, 0, COLUMNS, rows);
      const pixels = sample.getImageData(0, 0, COLUMNS, rows).data;
      const cells = new Map<string, Cell>();
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < COLUMNS; col++) {
          const i = (row * COLUMNS + col) * 4;
          const light =
            (pixels[i] * 0.299 +
              pixels[i + 1] * 0.587 +
              pixels[i + 2] * 0.114) /
            255;
          const index = Math.min(
            ASCII_CHARS.length - 1,
            Math.floor((1 - light) * ASCII_CHARS.length),
          );
          if (index <= ASCII_CHARS.lastIndexOf(".")) continue;
          cells.set(`${col},${row}`, {
            col,
            row,
            char: ASCII_CHARS[index],
            until: 0,
          });
        }
      }
      const bounds = canvas.getBoundingClientRect();
      const scale =
        Math.min(
          bounds.width / (COLUMNS * CELL),
          bounds.height / (rows * CELL),
        ) * Math.min(devicePixelRatio, 1.5);
      canvas.width = Math.max(1, Math.round(COLUMNS * CELL * scale));
      canvas.height = Math.max(1, Math.round(rows * CELL * scale));
      const context = canvas.getContext("2d");
      const base = document.createElement("canvas");
      base.width = canvas.width;
      base.height = canvas.height;
      const brush = base.getContext("2d");
      if (!context || !brush) return;
      for (const ctx of [context, brush]) {
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        ctx.font = `${FONT}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
      }
      const metrics = brush.measureText("X");
      const baseline =
        CELL / 2 +
        (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) /
          2;
      brush.fillStyle = CHAR_COLOR;
      for (const cell of cells.values())
        brush.fillText(
          cell.char,
          cell.col * CELL + CELL / 2,
          cell.row * CELL + baseline,
        );
      hands.push({ canvas, context, base, cells, rows, baseline });
      node.dataset.hands = String(hands.length);
      wake();
    }
    function load() {
      if (loaded) return;
      loaded = true;
      canvases.forEach((canvas, i) => {
        const image = new window.Image();
        image.onload = () => build(image, canvas);
        image.src =
          i === 0 ? "/footer/left-hand.webp" : "/footer/right-hand.webp";
        images.push(image);
      });
    }
    function highlight(hand: Hand, first: Cell) {
      const until = performance.now() + LIFETIME;
      let current = first;
      const seen = new Set<Cell>([first]);
      first.until = until;
      const count = Math.floor(Math.random() * CLUSTER_SIZE) + 1;
      for (let i = 0; i < count; i++) {
        const neighbours: Cell[] = [];
        for (let y = -1; y <= 1; y++)
          for (let x = -1; x <= 1; x++) {
            const cell = hand.cells.get(
              `${current.col + x},${current.row + y}`,
            );
            if (cell && !seen.has(cell)) neighbours.push(cell);
          }
        const next = neighbours[Math.floor(Math.random() * neighbours.length)];
        if (!next) break;
        next.until = until + i * 10;
        seen.add(next);
        current = next;
      }
    }
    function pointer(event: PointerEvent) {
      if (!visible || preference.matches || event.pointerType === "touch")
        return;
      const rect = node.getBoundingClientRect();
      pointers.forEach((move, i) => {
        move.x(
          ((event.clientX - rect.left) / rect.width - 0.5) *
            40 *
            (i === 0 ? 1 : -1),
        );
        move.y(-((event.clientY - rect.top) / rect.height - 0.5) * 24);
      });
      for (const hand of hands) {
        const rect = hand.canvas.getBoundingClientRect();
        const width = Math.min(rect.width, (rect.height * COLUMNS) / hand.rows);
        const height = (width * hand.rows) / COLUMNS;
        const left = rect.left + (rect.width - width) / 2;
        const top = rect.top + (rect.height - height) / 2;
        if (
          event.clientX < left ||
          event.clientX > left + width ||
          event.clientY < top ||
          event.clientY > top + height
        )
          continue;
        const col = ((event.clientX - left) / width) * COLUMNS;
        const row = ((event.clientY - top) / height) * hand.rows;
        let closest: Cell | undefined;
        let distance = HOVER_RADIUS * HOVER_RADIUS;
        for (const cell of hand.cells.values()) {
          const next = (cell.col - col) ** 2 + (cell.row - row) ** 2;
          if (next < distance) {
            closest = cell;
            distance = next;
          }
        }
        if (closest) highlight(hand, closest);
      }
      wake();
    }
    function leave() {
      pointers.forEach((move) => {
        move.x(0);
        move.y(0);
      });
    }
    function motionChange() {
      gsap.killTweensOf(wrappers);
      gsap.set(wrappers, { x: 0, y: 0 });
      pointers = wrappers.map((wrapper) => ({
        x: gsap.quickTo(wrapper, "x", { duration: 0.75, ease: "power3.out" }),
        y: gsap.quickTo(wrapper, "y", { duration: 0.75, ease: "power3.out" }),
      }));
      wake();
    }
    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        if (visible) {
          load();
          wake();
        } else {
          cancelAnimationFrame(frame);
          frame = 0;
          leave();
        }
      },
      { rootMargin: "250px" },
    );
    observer.observe(node);
    const sizing = new ResizeObserver(() => {
      hands.length = 0;
      images.forEach((image, i) => {
        if (image.complete && image.naturalWidth) build(image, canvases[i]);
      });
    });
    sizing.observe(node);
    node.addEventListener("pointermove", pointer);
    node.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", wake);
    preference.addEventListener("change", motionChange);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      sizing.disconnect();
      images.forEach((image) => {
        image.onload = null;
      });
      node.removeEventListener("pointermove", pointer);
      node.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", wake);
      preference.removeEventListener("change", motionChange);
      gsap.killTweensOf(wrappers);
    };
  }, []);
  return (
    <div ref={root} className="ascii-hands" aria-hidden="true">
      <div className="ascii-reveal ascii-left">
        <div className="ascii-hand">
          <canvas />
        </div>
      </div>
      <div className="ascii-reveal ascii-right">
        <div className="ascii-hand">
          <canvas />
        </div>
      </div>
    </div>
  );
}

export function AnimatedFooter({
  contact,
  year,
  policies,
}: {
  contact?: string;
  year: number;
  policies: readonly { href: string; label: string }[];
}) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: ".connection-footer-stage",
            start: "top 90%",
            end: "top 10%",
            scrub: 0.6,
          },
        });
        timeline
          .from(
            ".ascii-left",
            { xPercent: -125, duration: 1, ease: "power3.out" },
            0,
          )
          .from(
            ".ascii-right",
            { xPercent: 125, duration: 1, ease: "power3.out" },
            0,
          )
          .from(
            ".connection-footer-heading > span",
            {
              yPercent: 110,
              duration: 0.65,
              stagger: 0.06,
              ease: "power3.out",
            },
            0,
          )
          .from(
            ".connection-footer-logo",
            { yPercent: 115, rotation: -4, duration: 1, ease: "power3.out" },
            0.12,
          );
      },
      root,
    );
    return () => media.revert();
  }, []);
  return (
    <footer ref={root} className="connection-footer">
      <div className="connection-footer-stage">
        <div className="connection-footer-entry">
          <h2 className="connection-footer-heading">
            <span>Let&apos;s take</span>
            <span>the next step.</span>
          </h2>
          <div className="connection-footer-actions">
            <Link
              className="action action-white"
              href="/entry/student?mode=signup"
            >
              Find your mentor
            </Link>
            <Link className="text-link" href="/entry/mentor?mode=signup">
              Become a mentor
            </Link>
          </div>
        </div>
        <AsciiHands />
        <div className="connection-footer-wordmark">
          <FluidRefraction
            className="connection-footer-logo"
            image="/setu-logo.png"
            aria-label="SETU"
            objectFit="contain"
            refractionAmount={14}
            chromaticAberration={2}
            highlight={15}
            pressureIterations={12}
            splatRadius={7}
            style={{ background: "transparent" }}
          />
        </div>
        <span className="connection-footer-note">
          Career guidance through alumni mentorship.
        </span>
      </div>
      <div className="connection-footer-links">
        <nav aria-label="Programme links">
          <Link href="/association">About SETU</Link>
          <Link href="/entry/admin">IIC staff sign in</Link>
          {contact && <a href={`mailto:${contact}`}>Contact the programme</a>}
        </nav>
        <nav aria-label="Policies">
          {policies.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="connection-footer-base">
          <span>© {year} SETU</span>
          <span>Student project. No institutional endorsement claimed.</span>
          <a href="https://www.iitm.ac.in/">IIT Madras</a>
        </div>
      </div>
    </footer>
  );
}
