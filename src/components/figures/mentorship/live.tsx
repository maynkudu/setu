"use client";
import { useEffect, useRef, useState } from "react";
import { figureLabel, stages } from "./model";
export function MentorshipFigureLive({
  desk,
  folder,
  front,
  travel,
}: {
  desk: string;
  folder: string;
  front: string;
  travel: { x: number; y: number };
}) {
  const [selected, setSelected] = useState(0);
  const root = useRef<HTMLElement>(null);
  const moving = useRef<SVGGElement>(null);
  const model = useRef({
    target: 0,
    x: 0,
    visible: false,
    manual: false,
    hovered: false,
  });
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0,
      last = 0,
      tour = 0;
    const paint = (position: number) =>
      moving.current?.setAttribute(
        "transform",
        `translate(${(position * travel.x).toFixed(3)} ${(position * travel.y).toFixed(3)})`,
      );
    const tick = (now: number) => {
      const s = model.current;
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 0;
      last = now;
      if (!s.visible) {
        frame = 0;
        return;
      }
      if (!s.manual && !s.hovered && !still.matches) {
        tour += dt;
        const next = Math.floor(tour / 4) % 3;
        if (next !== s.target) {
          s.target = next;
          setSelected(next);
        }
      }
      const target = stages[s.target].x;
      s.x = still.matches
        ? target
        : s.x + (target - s.x) * (1 - Math.exp(-dt / 0.24));
      if (Math.abs(s.x - target) < 0.02) s.x = target;
      paint(s.x);
      frame =
        (!still.matches && !s.manual && !s.hovered) || s.x !== target
          ? requestAnimationFrame(tick)
          : 0;
    };
    const run = () => {
      if (!frame && model.current.visible) {
        last = 0;
        frame = requestAnimationFrame(tick);
      }
    };
    const observer = new IntersectionObserver(
      (entries) => {
        model.current.visible = entries[entries.length - 1].isIntersecting;
        node.dataset.visible = String(model.current.visible);
        if (model.current.visible) run();
      },
      { rootMargin: "60px" },
    );
    observer.observe(node);
    const move = () => run();
    node.addEventListener("figure-stage", move);
    const change = () => {
      if (still.matches) paint(stages[model.current.target].x);
      run();
    };
    still.addEventListener("change", change);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      node.removeEventListener("figure-stage", move);
      still.removeEventListener("change", change);
    };
  }, [travel]);
  function choose(index: number) {
    const bounded = Math.min(2, Math.max(0, index));
    model.current.target = bounded;
    model.current.manual = true;
    setSelected(bounded);
    root.current?.dispatchEvent(new Event("figure-stage"));
  }
  return (
    <figure
      ref={root}
      className="iso mentorship-figure"
      data-theme="light"
      data-stage={selected}
      onPointerEnter={() => {
        model.current.hovered = true;
      }}
      onPointerLeave={() => {
        model.current.hovered = false;
        root.current?.dispatchEvent(new Event("figure-stage"));
      }}
      onFocus={() => {
        model.current.manual = true;
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          model.current.manual = false;
          root.current?.dispatchEvent(new Event("figure-stage"));
        }
      }}
    >
      <div className="figure-header">
        <span>FIG 01</span>
        <span>The mentorship desk</span>
      </div>
      <svg
        className="iso-svg"
        viewBox="0 0 560 370"
        role="img"
        aria-label={figureLabel}
      >
        <g key="desk" dangerouslySetInnerHTML={{ __html: desk }} />
        <g
          ref={moving}
          key="request-folder"
          className="request-folder"
          dangerouslySetInnerHTML={{ __html: folder }}
        />
        <g
          key="front-workstations"
          dangerouslySetInnerHTML={{ __html: front }}
        />
      </svg>
      <div
        className="figure-controls"
        role="group"
        aria-label="Explore mentorship stages"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            choose(selected + (e.key === "ArrowRight" ? 1 : -1));
          }
          if (e.key === "Home") {
            e.preventDefault();
            choose(0);
          }
          if (e.key === "End") {
            e.preventDefault();
            choose(2);
          }
        }}
      >
        <span
          aria-hidden="true"
          className="figure-selection"
          style={{
            transform: `translateX(calc(${selected * 100}% + ${selected * 5}px))`,
          }}
        />
        {stages.map((s, i) => (
          <button
            key={s.label}
            onClick={() => choose(i)}
            aria-pressed={selected === i}
          >
            <span>0{i + 1}</span>
            {s.label}
          </button>
        ))}
      </div>
      <figcaption>
        <strong>{stages[selected].title}</strong>
        <span>{stages[selected].detail}</span>
        <small>Choose a stage to follow the request.</small>
      </figcaption>
    </figure>
  );
}
