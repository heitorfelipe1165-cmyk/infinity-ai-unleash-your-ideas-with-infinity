import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, Crown, Loader2, ShieldCheck, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { decidePaymentRequest, getAccountState, listPaymentRequests } from "@/lib/app.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel Admin — Infinity AI" },
      {
        name: "description",
        content:
          "Painel exclusivo do administrador da Infinity AI para aprovar ou recusar solicitações de acesso.",
      },
      { property: "og:title", content: "Painel Admin — Infinity AI" },
      {
        property: "og:description",
        content: "Gerencie assinaturas e libere o acesso dos clientes da Infinity AI.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

const statusLabel: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado (aguardando PIX)",
  rejected: "Recusado",
  finalized: "Chat liberado",
  banned: "Banido",
};


function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchAccount = useServerFn(getAccountState);
  const fetchRequests = useServerFn(listPaymentRequests);
  const decide = useServerFn(decidePaymentRequest);

  const account = useQuery({
    queryKey: ["account"],
    queryFn: () => fetchAccount({ data: undefined }),
  });

  // Proteção de rota: usuários comuns são devolvidos para a tela inicial.
  useEffect(() => {
    if (account.data && !account.data.isAdmin) {
      navigate({ to: "/chat", replace: true });
    }
  }, [account.data, navigate]);

  const requests = useQuery({
    queryKey: ["payment-requests"],
    queryFn: () => fetchRequests({ data: undefined }),
    enabled: account.data?.isAdmin === true,
    refetchInterval: 15000,
  });

  // Painel em tempo real: novas solicitações aparecem sem recarregar.
  useEffect(() => {
    const channel = supabase
      .channel("subscriptions-admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions" },
        () => queryClient.invalidateQueries({ queryKey: ["payment-requests"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const mutation = useMutation({
    mutationFn: (vars: { requestId: string; decision: "approve" | "reject" | "vip" }) =>
      decide({ data: vars }),
    onSuccess: (_result, vars) => {
      toast.success(
        vars.decision === "approve"
          ? "Acesso aprovado! O cliente já pode ver a chave PIX."
          : vars.decision === "vip"
            ? "Aprovado direto (VIP): chat liberado sem cobrança."
            : "Solicitação recusada",
      );
      queryClient.invalidateQueries({ queryKey: ["payment-requests"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível concluir"),
  });


  if (account.isLoading || !account.data?.isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neon" />
      </div>
    );
  }

  const rows = requests.data ?? [];
  const pending = rows.filter((row) => row.status === "pending");

  return (
    <main className="relative min-h-screen px-4 py-8">
      <div className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-72 opacity-40" />

      <div className="relative mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-violet" />
            <div>
              <h1 className="text-lg font-semibold">Painel Admin</h1>
              <p className="text-[11px] text-muted-foreground">
                Gerenciar usuários • {account.data.email}
              </p>
            </div>
          </div>
          <Link
            to="/chat"
            className="glow-ring glow-ring-hover inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao chat
          </Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <StatCard label="Solicitações pendentes" value={pending.length} />
          <StatCard
            label="Assinaturas ativas"
            value={rows.filter((r) => r.subscription_status === "active").length}
          />
          <StatCard label="Total de solicitações" value={rows.length} />
        </div>

        <section className="surface-panel glow-ring mt-6 overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">Solicitações de pagamento</h2>
            {requests.isFetching && <Loader2 className="h-4 w-4 animate-spin text-neon" />}
          </div>

          {rows.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted-foreground">
              Nenhuma solicitação registrada até o momento.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-background text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Nome</th>
                    <th className="px-5 py-3 font-medium">E-mail</th>
                    <th className="px-5 py-3 font-medium">Data do pedido</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-border">
                      <td className="px-5 py-3">{row.full_name}</td>
                      <td className="px-5 py-3 text-muted-foreground">{row.email}</td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {new Date(row.created_at).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] ${
                            row.subscription_status === "active"
                              ? "border-neon/50 text-neon"
                              : row.status === "rejected"
                                ? "border-destructive/50 text-destructive"
                                : "border-border text-muted-foreground"
                          }`}
                        >
                          {row.subscription_status === "active"
                            ? "Ativo"
                            : (statusLabel[row.status] ?? row.status)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            disabled={mutation.isPending}
                            onClick={() =>
                              mutation.mutate({ requestId: row.id, decision: "approve" })
                            }
                            className="glow-ring glow-ring-hover inline-flex items-center gap-1.5 rounded-lg border border-neon/40 bg-background px-3 py-1.5 text-[11px] font-medium disabled:opacity-50"
                          >
                            <Check className="h-3.5 w-3.5 text-neon" /> Aprovar Acesso
                          </button>
                          <button
                            disabled={mutation.isPending}
                            onClick={() => mutation.mutate({ requestId: row.id, decision: "vip" })}
                            className="glow-ring glow-ring-hover inline-flex items-center gap-1.5 rounded-lg border border-violet/60 bg-background px-3 py-1.5 text-[11px] font-medium disabled:opacity-50"
                            style={{
                              borderColor: "color-mix(in oklab, var(--violet) 60%, transparent)",
                            }}
                          >
                            <Crown className="h-3.5 w-3.5 text-violet" /> Aprovar Direto (VIP)
                          </button>
                          <button
                            disabled={mutation.isPending}
                            onClick={() =>
                              mutation.mutate({ requestId: row.id, decision: "reject" })
                            }
                            className="glow-ring inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-[11px] font-medium transition-colors hover:border-destructive disabled:opacity-50"
                          >
                            <X className="h-3.5 w-3.5 text-destructive" /> Recusar Acesso
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface-panel glow-ring glow-ring-hover rounded-2xl p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gradient-neon">{value}</p>
    </div>
  );
}
