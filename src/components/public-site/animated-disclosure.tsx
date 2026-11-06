"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

export function AnimatedCollapse({
  open,
  children,
  id,
  className = "",
  onClosed,
}: {
  open: boolean;
  children: ReactNode;
  id?: string;
  className?: string;
  onClosed?: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [initiallyOpen] = useState(open);
  useEffect(() => {
    const panelNode = panel.current;
    const contentNode = content.current;
    if (!panelNode || !contentNode) return;
    const node = panelNode;
    const body = contentNode;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let animation: gsap.core.Timeline | null = null;
    function animate() {
      animation?.kill();
      if (preference.matches) {
        gsap.set(node, { height: open ? "auto" : 0 });
        gsap.set(body, { y: 0, opacity: open ? 1 : 0 });
        if (!open) onClosed?.();
        return;
      }
      animation = gsap
        .timeline({
          onComplete: () => {
            if (open) gsap.set(node, { height: "auto" });
            else onClosed?.();
            ScrollTrigger.refresh();
          },
        })
        .to(
          node,
          {
            height: open ? body.offsetHeight : 0,
            duration: open ? 0.44 : 0.3,
            ease: "power3.inOut",
          },
          0,
        )
        .to(
          body,
          {
            y: open ? 0 : -8,
            opacity: open ? 1 : 0,
            duration: open ? 0.32 : 0.18,
            ease: "power3.out",
          },
          open ? 0.08 : 0,
        );
    }
    animate();
    preference.addEventListener("change", animate);
    const observer = new ResizeObserver(() => {
      if (
        open &&
        animation?.isActive() &&
        Math.abs(
          body.offsetHeight - Number(animation.getChildren()[0]?.vars.height),
        ) > 1
      )
        animate();
    });
    observer.observe(body);
    return () => {
      animation?.kill();
      observer.disconnect();
      preference.removeEventListener("change", animate);
    };
  }, [open, onClosed]);
  return (
    <div
      ref={panel}
      id={id}
      className={`animated-collapse ${className}`}
      style={{ height: initiallyOpen ? "auto" : 0 }}
      inert={!open}
      aria-hidden={!open}
    >
      <div
        ref={content}
        className="disclosure-body"
        style={{ opacity: initiallyOpen ? 1 : 0 }}
      >
        {children}
      </div>
    </div>
  );
}

export function FAQDisclosure({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(false);
  const finishClose = useCallback(() => setVisible(false), []);
  return (
    <details open={visible} data-expanded={expanded}>
      <summary
        aria-expanded={expanded}
        aria-controls={id}
        onClick={(event) => {
          event.preventDefault();
          if (!expanded) setVisible(true);
          setExpanded(!expanded);
        }}
      >
        {question}
        <span aria-hidden="true">+</span>
      </summary>
      <AnimatedCollapse open={expanded} id={id} onClosed={finishClose}>
        <p>{answer}</p>
      </AnimatedCollapse>
    </details>
  );
}
