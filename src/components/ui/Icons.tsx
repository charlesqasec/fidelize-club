import type { ReactElement, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

/** Assinatura comum de todo componente de ícone deste arquivo. */
export type IconComponent = (props: IconProps) => ReactElement;

/** Ícones inline (sem biblioteca externa) — traço 1.7, grid 24. */
function Svg({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconNfc(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M9 6.5v1" />
      <path d="M17 8.5a5 5 0 0 1 0 7" />
      <path d="M19.5 6a8.5 8.5 0 0 1 0 12" />
    </Svg>
  );
}

export function IconUserPlus(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="10" cy="8" r="3.5" />
      <path d="M3.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M19 8.5v5M16.5 11h5" />
    </Svg>
  );
}

export function IconCard(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2.5" y="5" width="19" height="14" rx="3" />
      <path d="M2.5 10h19" />
      <path d="M6.5 14.5h4" />
    </Svg>
  );
}

export function IconRepeat(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 9a5 5 0 0 1 5-5h9m0 0-3-3m3 3-3 3" />
      <path d="M20 15a5 5 0 0 1-5 5H6m0 0 3 3m-3-3 3-3" />
    </Svg>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8" r="3.3" />
      <path d="M2.8 19.5a6.2 6.2 0 0 1 12.4 0" />
      <path d="M16 5.4a3.3 3.3 0 0 1 0 5.2M17.5 14.4a6.2 6.2 0 0 1 3.7 5.1" />
    </Svg>
  );
}

export function IconShield(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2.8 4.8 5.6v5.6c0 4.4 3 8.3 7.2 9.9 4.2-1.6 7.2-5.5 7.2-9.9V5.6Z" />
      <path d="m9.2 12 2 2 3.6-3.8" />
    </Svg>
  );
}

export function IconMegaphone(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 10.5v3a1.8 1.8 0 0 0 1.8 1.8h1.4L18 20V4L6.7 8.7H5.3a1.8 1.8 0 0 0-1.8 1.8Z" />
      <path d="M20.5 9.5v5" />
      <path d="M8 15.6V20a1.5 1.5 0 0 0 3 0v-3.2" />
    </Svg>
  );
}

export function IconGift(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="9" width="18" height="11.5" rx="2" />
      <path d="M3 13.2h18M12 9v11.5" />
      <path d="M12 9S10.4 4 8.2 4a2.1 2.1 0 0 0 0 5Zm0 0s1.6-5 3.8-5a2.1 2.1 0 0 1 0 5Z" />
    </Svg>
  );
}

export function IconStar(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m12 3.3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z" />
    </Svg>
  );
}

export function IconExternalLink(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 6H5.5A2.5 2.5 0 0 0 3 8.5v10A2.5 2.5 0 0 0 5.5 21h10a2.5 2.5 0 0 0 2.5-2.5V15" />
      <path d="M13 3.5h7.5V11M20.2 3.8l-9 9" />
    </Svg>
  );
}

export function IconChart(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </Svg>
  );
}

export function IconSparkle(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5 13.8 9l5.5 1.8-5.5 1.8L12 18l-1.8-5.4L4.7 10.8 10.2 9Z" />
      <path d="M18.5 3v3M20 4.5h-3" />
    </Svg>
  );
}

export function IconClock(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.7" />
      <path d="M12 7v5.2l3.2 2" />
    </Svg>
  );
}

export function IconLock(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.4" />
      <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
    </Svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m5 12.5 4.4 4.4L19 7.3" />
    </Svg>
  );
}

export function IconWrench(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20 5.3a4.8 4.8 0 0 1-6.2 6.2L6 19.3a2.1 2.1 0 0 1-3-3l7.8-7.8A4.8 4.8 0 0 1 17 2.3l-3 3 1.7 1.7 3-3c.2.4.3.8.3 1.3Z" />
    </Svg>
  );
}

export function IconHeadset(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="2.5" y="13.5" width="4" height="6" rx="1.6" />
      <rect x="17.5" y="13.5" width="4" height="6" rx="1.6" />
      <path d="M20 19.5v.5a2.5 2.5 0 0 1-2.5 2.5H13" />
    </Svg>
  );
}

/* --- Ícones de segmento --- */

export function IconScissors(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="6" cy="6.5" r="2.6" />
      <circle cx="6" cy="17.5" r="2.6" />
      <path d="M8.3 8 20 19M8.3 16 20 5" />
    </Svg>
  );
}

export function IconCoffee(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 8h13v6.5a4.5 4.5 0 0 1-4.5 4.5H8a4.5 4.5 0 0 1-4.5-4.5Z" />
      <path d="M16.5 9.5h1.8a2.6 2.6 0 0 1 0 5.2h-1.8" />
      <path d="M7 2.5v2.2M11 2.5v2.2" />
    </Svg>
  );
}

export function IconCutlery(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 2.5v7a2.5 2.5 0 0 0 5 0v-7M8.5 12v9.5" />
      <path d="M17.5 2.5c-1.7 1-2.5 2.8-2.5 5s.8 3.4 2.5 3.6v10.4" />
    </Svg>
  );
}

export function IconDumbbell(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 9.5v5M6 7v10M18 7v10M21 9.5v5M6 12h12" />
    </Svg>
  );
}

export function IconBag(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 7.5h15l-1.2 13H5.7Z" />
      <path d="M8.5 10V6.8a3.5 3.5 0 0 1 7 0V10" />
    </Svg>
  );
}

export function IconFlower(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="2.6" />
      <path d="M12 9.4c0-2.6-.9-4.4-2.6-4.4S7 6.5 7 8.2s2 3.2 5 3.2M12 14.6c0 2.6.9 4.4 2.6 4.4s2.4-1.5 2.4-3.2-2-3.2-5-3.2" />
      <path d="M9.4 12c-2.6 0-4.4.9-4.4 2.6S6.5 17 8.2 17s3.2-2 3.2-5M14.6 12c2.6 0 4.4-.9 4.4-2.6S17.5 7 15.8 7s-3.2 2-3.2 5" />
    </Svg>
  );
}

export function IconStore(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 9.5V20h17V9.5" />
      <path d="M2.5 9.5 4.6 4h14.8l2.1 5.5a3.1 3.1 0 0 1-6.2 0 3.1 3.1 0 0 1-6.2 0 3.1 3.1 0 0 1-6.2 0Z" />
      <path d="M9.5 20v-5.5h5V20" />
    </Svg>
  );
}

export function IconBuilding(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 20.5V6.5L12 3.5l8.5 3v14" />
      <path d="M2 20.5h20M8 10h2M14 10h2M8 14h2M14 14h2M10.5 20.5v-3h3v3" />
    </Svg>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" />
    </Svg>
  );
}

export function IconX(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5.5 5.5 18.5 18.5M18.5 5.5 5.5 18.5" />
    </Svg>
  );
}

export function IconDots(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/* --- Ícones do Fidelize Admin --- */

export function IconArrowLeft(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M19 12H5m0 0 6-6m-6 6 6 6" />
    </Svg>
  );
}

export function IconLogout(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20H10" />
      <path d="M15 8l4 4-4 4M19 12H9" />
    </Svg>
  );
}

export function IconQr(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <path d="M13.5 13.5h3v3h-3zM19.5 13.5h1M13.5 19.5h1M17.5 17.5h3v3h-3z" />
    </Svg>
  );
}

export function IconMapPin(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 21.5s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10.5" r="2.4" />
    </Svg>
  );
}

export function IconChat(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V17H6.5A2.5 2.5 0 0 1 4 14.5Z" />
      <path d="M8.5 9.5h7M8.5 12.5h4.5" />
    </Svg>
  );
}

export function IconPalette(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 2-.8 2-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H16a4.5 4.5 0 0 0 4.5-4.5C20.5 6.6 16.7 3.5 12 3.5Z" />
      <circle cx="7.5" cy="11.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="10" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconFlag(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5.5 21V4" />
      <path d="M5.5 4.5h12l-2.5 4 2.5 4h-12" />
    </Svg>
  );
}

export function IconAlert(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.7" />
      <path d="M12 7.8v4.9" />
      <circle cx="12" cy="16" r="0.9" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconBot(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4.3v2.9" />
      <circle cx="12" cy="3.4" r="1" fill="currentColor" stroke="none" />
      <rect x="4.3" y="7.2" width="15.4" height="11" rx="3.2" />
      <circle cx="9.2" cy="12.7" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="14.8" cy="12.7" r="1.3" fill="currentColor" stroke="none" />
      <path d="M9 16.3h6" />
      <path d="M2.3 11.5v3.4M21.7 11.5v3.4" />
    </Svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M19.5 19.5l-4.3-4.3" />
    </Svg>
  );
}
