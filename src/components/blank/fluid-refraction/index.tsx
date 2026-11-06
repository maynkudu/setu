"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import Image from "next/image";
import type {
  createFluidRenderer,
  FluidMedia,
  FluidSettings,
} from "./renderer";

export type FluidRefractionProps = FluidMedia &
  Partial<FluidSettings> & {
    className?: string;
    style?: CSSProperties;
    "aria-label"?: string;
  };

/** BLANK's fluid simulation, loaded near the viewport with a static media fallback. */
export function FluidRefraction({
  image,
  video,
  className,
  style,
  "aria-label": label = "Interactive fluid refraction",
  refractionAmount = 15,
  chromaticAberration = 10,
  highlight = 50,
  disappearSpeed = 2,
  velocityDissipation = 99,
  pressureDissipation = 80,
  pressureIterations = 25,
  curl = 30,
  splatRadius = 5,
  interactOnHover = true,
  objectFit = "cover",
}: FluidRefractionProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<ReturnType<typeof createFluidRenderer>>(null);
  const settingsRef = useRef<FluidSettings>({
    refractionAmount,
    chromaticAberration,
    highlight,
    disappearSpeed,
    velocityDissipation,
    pressureDissipation,
    pressureIterations,
    curl,
    splatRadius,
    interactOnHover,
    objectFit,
  });
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const settings = {
      refractionAmount,
      chromaticAberration,
      highlight,
      disappearSpeed,
      velocityDissipation,
      pressureDissipation,
      pressureIterations,
      curl,
      splatRadius,
      interactOnHover,
      objectFit,
    };
    settingsRef.current = settings;
    controllerRef.current?.update(settings);
  }, [
    refractionAmount,
    chromaticAberration,
    highlight,
    disappearSpeed,
    velocityDissipation,
    pressureDissipation,
    pressureIterations,
    curl,
    splatRadius,
    interactOnHover,
    objectFit,
  ]);
  useEffect(() => {
    const root = rootRef.current,
      canvas = canvasRef.current;
    if (!root || !canvas) return;
    const container = root,
      layer = canvas;
    let renderer: ReturnType<typeof createFluidRenderer> = null;
    let disposed = false,
      pending = false,
      visible = false;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    function initialize() {
      if (disposed || pending || renderer || !visible || preference.matches)
        return;
      pending = true;
      const media: FluidMedia =
        video !== undefined ? { video } : { image: image ?? "" };
      void import("./renderer")
        .then(({ createFluidRenderer }) => {
          pending = false;
          if (disposed || !visible || preference.matches) return;
          renderer = createFluidRenderer(
            container,
            layer,
            media,
            settingsRef.current,
            () => {
              if (!disposed) setReady(true);
            },
          );
          controllerRef.current = renderer;
        })
        .catch((error: unknown) => {
          pending = false;
          console.error("FluidRefraction initialization failed.", error);
        });
    }
    function motionChange() {
      if (preference.matches) {
        renderer?.dispose();
        renderer = null;
        controllerRef.current = null;
        setReady(false);
      } else initialize();
    }
    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        if (visible) initialize();
      },
      { rootMargin: "200px" },
    );
    observer.observe(root);
    preference.addEventListener("change", motionChange);
    return () => {
      disposed = true;
      observer.disconnect();
      preference.removeEventListener("change", motionChange);
      controllerRef.current = null;
      renderer?.dispose();
    };
  }, [image, video]);
  return (
    <div
      ref={rootRef}
      className={className}
      role="img"
      aria-label={label}
      data-fluid-refraction=""
      data-ready={ready}
      style={{
        width: "100%",
        height: "100%",
        minWidth: 100,
        minHeight: 100,
        overflow: "hidden",
        position: "relative",
        background: "#000",
        touchAction: "pan-y",
        ...style,
      }}
    >
      {!ready &&
        (image !== undefined ? (
          <Image
            src={image}
            alt=""
            fill
            sizes="80vw"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit,
              objectPosition: "center bottom",
            }}
          />
        ) : (
          <video
            src={video}
            muted
            playsInline
            controls
            aria-label={label}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit,
            }}
          />
        ))}
      <canvas
        ref={canvasRef}
        tabIndex={-1}
        aria-hidden="true"
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          visibility: ready ? "visible" : "hidden",
        }}
      />
    </div>
  );
}
export default FluidRefraction;
