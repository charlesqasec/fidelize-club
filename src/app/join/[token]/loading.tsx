/**
 * Esqueleto exibido enquanto `page.tsx` resolve o token no servidor.
 * Espelha o layout do `JoinCard`: cartão de marca no topo + formulário
 * empilhado. Só estrutura estática — respeita `prefers-reduced-motion`.
 */
export default function JoinLoading() {
  return (
    <div className="min-h-screen bg-surface-soft">
      <div className="mx-auto w-full max-w-md px-4 pb-8 pt-5 sm:px-5 sm:pt-7">
        <div className="rounded-3xl bg-brand-100 p-5 shadow-xl shadow-brand-950/10 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 animate-pulse rounded-2xl bg-white/60 motion-reduce:animate-none" />
            <div className="flex-1 space-y-2">
              <div className="h-2.5 w-28 animate-pulse rounded-full bg-white/50 motion-reduce:animate-none" />
              <div className="h-4 w-40 animate-pulse rounded-full bg-white/60 motion-reduce:animate-none" />
            </div>
          </div>
          <div className="mt-4 h-2.5 w-32 animate-pulse rounded-full bg-white/50 motion-reduce:animate-none" />
        </div>
        <div className="mt-3 space-y-4 rounded-3xl border border-line bg-white p-5 sm:p-6">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-20 animate-pulse rounded-full bg-brand-100 motion-reduce:animate-none" />
              <div className="h-11 w-full animate-pulse rounded-lg bg-surface-soft motion-reduce:animate-none" />
            </div>
          ))}
          <div className="h-12 w-full animate-pulse rounded-full bg-brand-100 motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  );
}
