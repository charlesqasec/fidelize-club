/**
 * Nota de 1 a 5 em estrelas. Aceita fração (média) — a parte fracionária
 * preenche a estrela proporcionalmente. Sempre acompanhada de rótulo
 * acessível com o número real.
 */
export function RatingStars({
  value,
  size = "sm",
  label,
}: {
  value: number;
  size?: "sm" | "lg";
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(5, value));
  const px = size === "lg" ? "h-6 w-6" : "h-4 w-4";

  return (
    <span
      role="img"
      aria-label={label ?? `${clamped.toLocaleString("pt-BR")} de 5`}
      className="inline-flex items-center gap-0.5"
    >
      {Array.from({ length: 5 }, (_, index) => {
        const fill = Math.max(0, Math.min(1, clamped - index));
        const id = `star-${size}-${index}-${Math.round(fill * 100)}`;
        return (
          <svg
            key={index}
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={`${px} shrink-0`}
          >
            <defs>
              <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
                <stop offset={`${fill * 100}%`} stopColor="#f59e0b" />
                <stop offset={`${fill * 100}%`} stopColor="#e7e4f2" />
              </linearGradient>
            </defs>
            <path
              d="m12 3.3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"
              fill={`url(#${id})`}
              stroke={fill > 0 ? "#d97706" : "#d6d1e6"}
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </svg>
        );
      })}
    </span>
  );
}
