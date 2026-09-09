"use client";

import { useSyncExternalStore } from "react";

import { REDUCED_MOTION_QUERY } from "@/lib/motion";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(REDUCED_MOTION_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

const getSnapshot = () => window.matchMedia(REDUCED_MOTION_QUERY).matches;

/**
 * No servidor (e durante a hidratação) responde `true`: o HTML inicial sai
 * com tudo visível e sem animação, e só depois o cliente decide animar.
 */
const getServerSnapshot = () => true;

/** `prefers-reduced-motion` reativo, seguro para SSR. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
