"use client";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

// Register once for the whole client bundle; every GSAP plugin is free in the public package.
gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, DrawSVGPlugin, MotionPathPlugin);

/** Media query that gates every non-essential animation. */
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";

/** Pointer-driven 3D only where it makes sense: motion allowed, a mouse or trackpad, a desk-sized screen. */
export const TILT_OK = `${MOTION_OK} and (pointer: fine) and (min-width: 1024px)`;

/**
 * Tilts `target` in 3D toward the pointer while it moves over `surface`, and exposes the pointer position as
 * --gx / --gy (percent) for a glare layer. Returns a cleanup for gsap.matchMedia.
 */
export function attachTilt(target: HTMLElement, { surface = target, maxX = 5, maxY = 7, perspective = 1400 } = {}) {
  // Perspective lives on the tilted element only (no parent perspective, no preserve-3d), so effects never stack.
  gsap.set(target, { transformPerspective: perspective });
  const rotateX = gsap.quickTo(target, "rotationX", { duration: 0.7, ease: "power3.out" });
  const rotateY = gsap.quickTo(target, "rotationY", { duration: 0.7, ease: "power3.out" });

  const onMove = (event: PointerEvent) => {
    const box = target.getBoundingClientRect();
    const x = Math.min(Math.max((event.clientX - box.left) / box.width, 0), 1);
    const y = Math.min(Math.max((event.clientY - box.top) / box.height, 0), 1);
    rotateX((0.5 - y) * 2 * maxX);
    rotateY((x - 0.5) * 2 * maxY);
    target.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
    target.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
  };
  const onLeave = () => {
    rotateX(0);
    rotateY(0);
  };

  surface.addEventListener("pointermove", onMove);
  surface.addEventListener("pointerleave", onLeave);
  return () => {
    surface.removeEventListener("pointermove", onMove);
    surface.removeEventListener("pointerleave", onLeave);
    gsap.set(target, { rotationX: 0, rotationY: 0 });
  };
}

export { gsap, useGSAP, ScrollTrigger, SplitText };
