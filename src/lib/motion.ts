/**
 * Utilidades de motion design — sem dependências.
 *
 * Princípios (docs/ARQUITETURA.md, seção 12.1):
 * - só transform/opacity;
 * - nada de listener global pesado — efeitos de cursor escutam no próprio
 *   elemento, throttled por requestAnimationFrame;
 * - `prefers-reduced-motion` e ponteiro grosso (touch) desligam parallax,
 *   tilt e botões magnéticos.
 */

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
export const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia(REDUCED_MOTION_QUERY).matches
  );
}

export function hasFinePointer(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia(FINE_POINTER_QUERY).matches
  );
}

/** Efeitos de cursor só fazem sentido com mouse/trackpad e sem reduced motion. */
export function pointerEffectsAllowed(): boolean {
  return hasFinePointer() && !prefersReducedMotion();
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
