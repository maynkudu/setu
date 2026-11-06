"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const WIDTH = 520;
const HEIGHT = 340;
const GRID = 24;
const LIFT = 0.65;
const INK = "#681c36";
type Point = { x: number; y: number };

function height(x: number, y: number) {
  return (
    0.12 +
    0.7 * Math.exp(-((x + 0.22) ** 2 / 0.38 + (y + 0.24) ** 2 / 0.48)) +
    0.075 * ((x - 0.7) ** 2 + (y - 0.65) ** 2)
  );
}
function project(x: number, y: number, z: number): Point {
  return { x: WIDTH / 2 + (x - y) * 112, y: 220 + (x + y) * 48 - z * 115 };
}
function flat(t: number): Point {
  return { x: 35 + t * 450, y: 228 - 122 * Math.sin(t * Math.PI) ** 2 };
}
const vertices = Array.from({ length: (GRID + 1) ** 2 }, (_, i) => {
  const x = ((i % (GRID + 1)) / GRID) * 2 - 1;
  const y = (Math.floor(i / (GRID + 1)) / GRID) * 2 - 1;
  return { x, y, z: height(x, y) };
});
const faces = Array.from({ length: GRID ** 2 }, (_, i) => {
  const row = Math.floor(i / GRID),
    col = i % GRID;
  const start = row * (GRID + 1) + col;
  return {
    indices: [start, start + 1, start + GRID + 2, start + GRID + 1],
    depth: row + col,
  };
}).sort((a, b) => a.depth - b.depth);

// The descending half follows the negative gradient of the same height field.
const descent: Point[] = [{ x: -0.1, y: -0.16 }];
for (let i = 0; i < 40; i++) {
  const p = descent[i];
  const epsilon = 0.002;
  const dx =
    (height(p.x + epsilon, p.y) - height(p.x - epsilon, p.y)) / (2 * epsilon);
  const dy =
    (height(p.x, p.y + epsilon) - height(p.x, p.y - epsilon)) / (2 * epsilon);
  descent.push({ x: p.x - dx * 0.08, y: p.y - dy * 0.08 });
}
function route(t: number): Point {
  if (t <= 0.5) return { x: -0.92 + t * 1.64, y: -0.62 + t * 0.92 };
  const at = (t - 0.5) * 2 * (descent.length - 1);
  const a = descent[Math.floor(at)],
    b = descent[Math.min(Math.ceil(at), descent.length - 1)];
  return { x: a.x + (b.x - a.x) * (at % 1), y: a.y + (b.y - a.y) * (at % 1) };
}

export default function ProcessGraph() {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const node = root.current,
      sheet = canvas.current;
    const context = sheet?.getContext("2d");
    if (!node || !sheet || !context) return;
    const stage = node,
      surface = sheet,
      brush = context;
    const media = gsap.matchMedia();
    const phase = { draw: 0, morph: 0 };
    const peak = { x: 0, y: 0, strength: 0 };
    let visible = false,
      reduced = false,
      frame = 0;
    const steerX = gsap.quickTo(peak, "x", {
      duration: 0.22,
      ease: "power3.out",
      onUpdate: wake,
    });
    const steerY = gsap.quickTo(peak, "y", {
      duration: 0.22,
      ease: "power3.out",
      onUpdate: wake,
    });
    const raise = gsap.quickTo(peak, "strength", {
      duration: 0.42,
      ease: "power3.out",
      onUpdate: wake,
    });

    function lifted(x: number, y: number, base = height(x, y)) {
      const distance = (x - peak.x) ** 2 + (y - peak.y) ** 2;
      return base + peak.strength * LIFT * Math.exp(-distance / 0.11);
    }
    function mix(p: Point, q: Point): Point {
      return {
        x: p.x + (q.x - p.x) * phase.morph,
        y: p.y + (q.y - p.y) * phase.morph,
      };
    }
    function polygon(points: Point[]) {
      brush.beginPath();
      points.forEach((p, i) =>
        i ? brush.lineTo(p.x, p.y) : brush.moveTo(p.x, p.y),
      );
      brush.closePath();
    }
    function draw() {
      frame = 0;
      if (!visible || document.hidden) return;
      brush.clearRect(0, 0, WIDTH, HEIGHT);
      if (phase.morph > 0) {
        brush.globalAlpha = phase.morph;
        const floor = [
          project(-1, -1, -0.05),
          project(1, -1, -0.05),
          project(1, 1, -0.05),
          project(-1, 1, -0.05),
        ];
        polygon(floor);
        brush.fillStyle = "#f0e9ed";
        brush.fill();
        brush.strokeStyle = "#d6c5ce";
        brush.lineWidth = 0.7;
        brush.stroke();
        const points = vertices.map((p) => {
          const z = lifted(p.x, p.y, p.z);
          return { ...mix(flat((p.x + 1) / 2), project(p.x, p.y, z)), z };
        });
        for (const face of faces) {
          const [a, b, c, d] = face.indices.map((i) => points[i]);
          const z = (a.z + b.z + c.z + d.z) / 4;
          const shade = gsap.utils.clamp(
            0,
            1,
            z * 0.62 + (b.z - a.z + d.z - a.z) * 0.7,
          );
          polygon([a, b, c, d]);
          brush.fillStyle = `rgb(${Math.round(239 - shade * 120)} ${Math.round(216 - shade * 163)} ${Math.round(228 - shade * 141)})`;
          brush.fill();
          brush.strokeStyle = "#681c3642";
          brush.lineWidth = 0.55;
          brush.stroke();
        }
        brush.globalAlpha = 1;
      }
      const line = Array.from({ length: 81 }, (_, i) => {
        const t = i / 80,
          p = route(t);
        return mix(flat(t), project(p.x, p.y, lifted(p.x, p.y) + 0.012));
      });
      function stroke(points: Point[], color: string, width: number) {
        brush.beginPath();
        points.forEach((p, i) =>
          i ? brush.lineTo(p.x, p.y) : brush.moveTo(p.x, p.y),
        );
        brush.strokeStyle = color;
        brush.lineWidth = width;
        brush.lineJoin = "round";
        brush.lineCap = "round";
        brush.stroke();
      }
      stroke(line, "#d9c8d0", 2);
      stroke(line.slice(0, Math.floor(phase.draw * 80) + 1), INK, 3);
      for (const i of [0, 40, 80]) {
        const p = line[i];
        brush.beginPath();
        brush.arc(p.x, p.y, 5.5, 0, Math.PI * 2);
        brush.fillStyle = INK;
        brush.fill();
        brush.strokeStyle = "#fff";
        brush.lineWidth = phase.morph * 2;
        if (phase.morph) brush.stroke();
      }
      stage.dataset.surfaceProgress = phase.morph.toFixed(3);
      stage.dataset.peak = peak.strength.toFixed(3);
    }
    function wake() {
      if (!frame && visible && !document.hidden)
        frame = requestAnimationFrame(draw);
    }
    function resize() {
      const ratio = Math.min(devicePixelRatio, 1.5);
      surface.width = Math.round(stage.clientWidth * ratio);
      surface.height = Math.round(
        ((stage.clientWidth * HEIGHT) / WIDTH) * ratio,
      );
      brush.setTransform(
        surface.width / WIDTH,
        0,
        0,
        surface.height / HEIGHT,
        0,
        0,
      );
      wake();
    }
    function move(event: PointerEvent) {
      if (reduced || event.pointerType === "touch" || phase.morph < 0.5) return;
      const box = surface.getBoundingClientRect();
      const x = ((event.clientX - box.left) / box.width) * WIDTH;
      const y = ((event.clientY - box.top) / box.height) * HEIGHT;
      let closest: (typeof vertices)[number] | undefined,
        distance = 55 ** 2;
      for (const p of vertices) {
        const screen = project(p.x, p.y, p.z + LIFT);
        const next = (x - screen.x) ** 2 + (y - screen.y) ** 2;
        if (next < distance) {
          distance = next;
          closest = p;
        }
      }
      if (closest) {
        steerX(closest.x);
        steerY(closest.y);
        raise(1);
      } else raise(0);
    }
    function leave() {
      raise(0);
    }
    function keyboard(event: KeyboardEvent) {
      if (reduced) return;
      const delta = 0.15;
      if (event.key === "Escape") {
        event.preventDefault();
        leave();
        return;
      }
      if (!event.key.startsWith("Arrow")) return;
      event.preventDefault();
      steerX(
        gsap.utils.clamp(
          -0.9,
          0.9,
          peak.x +
            (event.key === "ArrowRight"
              ? delta
              : event.key === "ArrowLeft"
                ? -delta
                : 0),
        ),
      );
      steerY(
        gsap.utils.clamp(
          -0.9,
          0.9,
          peak.y +
            (event.key === "ArrowDown"
              ? delta
              : event.key === "ArrowUp"
                ? -delta
                : 0),
        ),
      );
      raise(1);
    }
    media.add(
      {
        reduce: "(prefers-reduced-motion: reduce)",
        motion: "(prefers-reduced-motion: no-preference)",
      },
      (state) => {
        reduced = Boolean(state.conditions?.reduce);
        [steerX, steerY, raise].forEach((steer) => steer.tween.pause());
        peak.strength = 0;
        if (reduced) {
          phase.draw = 1;
          phase.morph = 1;
          wake();
        } else
          gsap
            .timeline({
              onUpdate: wake,
              scrollTrigger: {
                trigger: stage,
                start: "top 75%",
                end: "bottom 55%",
                scrub: 0.12,
              },
            })
            .fromTo(
              phase,
              { draw: 0 },
              { draw: 1, duration: 0.5, ease: "none" },
              0,
            )
            .to(phase, { draw: 1, duration: 0.5, ease: "none" }, 0.5)
            .fromTo(
              phase,
              { morph: 0 },
              { morph: 1, duration: 0.14, ease: "power2.out" },
              0.5,
            );
      },
    );
    const intersection = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible) wake();
      else {
        cancelAnimationFrame(frame);
        frame = 0;
        leave();
      }
    });
    const observer = new ResizeObserver(resize);
    intersection.observe(stage);
    observer.observe(stage);
    stage.addEventListener("pointermove", move);
    stage.addEventListener("pointerleave", leave);
    stage.addEventListener("blur", leave);
    stage.addEventListener("keydown", keyboard);
    document.addEventListener("visibilitychange", wake);
    resize();
    stage.dataset.ready = "true";
    return () => {
      media.revert();
      intersection.disconnect();
      observer.disconnect();
      cancelAnimationFrame(frame);
      gsap.killTweensOf(peak);
      stage.removeEventListener("pointermove", move);
      stage.removeEventListener("pointerleave", leave);
      stage.removeEventListener("blur", leave);
      stage.removeEventListener("keydown", keyboard);
      document.removeEventListener("visibilitychange", wake);
    };
  }, []);
  return (
    <div
      ref={root}
      className="process-art"
      tabIndex={0}
      role="img"
      aria-label="Programme curve. Hover or use arrow keys to raise the surface. Moving away or pressing Escape restores its shape."
    >
      <svg viewBox="0 0 520 340" fill="none" aria-hidden="true">
        <path
          d="M35 228C147 228 147 106 260 106S373 228 485 228"
          stroke="#681c36"
          strokeWidth="3"
        />
        <circle cx="35" cy="228" r="5.5" fill="#681c36" />
        <circle cx="260" cy="106" r="5.5" fill="#681c36" />
        <circle cx="485" cy="228" r="5.5" fill="#681c36" />
      </svg>
      <canvas ref={canvas} aria-hidden="true" />
    </div>
  );
}
