/**
 * Esqueleto exibido enquanto `page.tsx` resolve o token no servidor.
 * Espelha o layout do `WebCard`: um cartão arredondado no topo + blocos
 * empilhados. Só `opacity`/estrutura estática — respeita
 * `prefers-reduced-motion` via `motion-reduce:animate-none` (o pulso
 * desliga, a forma continua visível).
 */
export default function WebCardLoading() {
  return (
    <div className="min-h-screen bg-surface-soft">
      <div className="mx-auto w-full max-w-md px-4 pb-8 pt-5 sm:px-5 sm:pt-7">
        <div className="rounded-3xl bg-brand-100 p-5 shadow-xl shadow-brand-950/10 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 animate-pulse rounded-2xl bg-white/60 motion-reduce:animate-none" />
            <div className="flex-1 space-y-2">
              <div className="h-2.5 w-24 animate-pulse rounded-full bg-white/50 motion-reduce:animate-none" />
              <div className="h-4 w-40 animate-pulse rounded-full bg-white/60 motion-reduce:animate-none" />
            </div>
          </div>
          <div className="mt-5 border-t border-white/25 pt-5">
            <div className="h-2.5 w-20 animate-pulse rounded-full bg-white/50 motion-reduce:animate-none" />
            <div className="mt-3 h-10 w-28 animate-pulse rounded-lg bg-white/60 motion-reduce:animate-none" />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Array.from({ length: 8 }, (_, i) => (
                <div
                  key={i}
                  className="h-8 w-8 animate-pulse rounded-full bg-white/40 motion-reduce:animate-none"
                />
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 space-y-3">
          <div className="h-32 animate-pulse rounded-2xl border border-line bg-white motion-reduce:animate-none" />
          <div className="h-20 animate-pulse rounded-2xl border border-line bg-white motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  );
}
