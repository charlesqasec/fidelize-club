import type { Metadata } from "next";
import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { createClient } from "@/lib/supabase/server";
import { IconStore } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Estabelecimentos",
  robots: { index: false, follow: false },
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Ativo",
  SUSPENDED: "Suspenso",
  CANCELLED: "Cancelado",
};

/**
 * Listagem real (não CRUD — só leitura) dos estabelecimentos, para o
 * platform_admin escolher qual organização administrar (ETAPA 3.2.1, item
 * 3). RLS já libera SELECT em `organizations` para `platform_admin` — sem
 * `service_role`. Cada linha entra no contexto administrativo daquela
 * organização com a própria sessão, nunca troca de usuário/senha.
 */
export default async function EstabelecimentosPage() {
  const supabase = await createClient();
  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, name, slug, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Estabelecimentos"
        description="Negócios cadastrados na plataforma. Escolha um para entrar no contexto administrativo dele."
      />

      {!organizations || organizations.length === 0 ? (
        <EmptyState
          icon={<IconStore className="h-6 w-6" />}
          title="Nenhum estabelecimento cadastrado ainda"
          description="Quando o cadastro de estabelecimento existir, cada negócio aparece aqui — clique para entrar no contexto administrativo dele."
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
          {organizations.map((org) => (
            <li key={org.id}>
              <Link
                href={`/admin/org/${org.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-brand-50/60"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-brand-950">
                    {org.name}
                  </p>
                  <p className="truncate text-xs text-ink-muted">{org.slug}</p>
                </div>
                <span className="shrink-0 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-800">
                  {STATUS_LABEL[org.status] ?? org.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
