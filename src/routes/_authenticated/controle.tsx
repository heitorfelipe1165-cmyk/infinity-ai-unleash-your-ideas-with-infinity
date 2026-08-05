import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { toast } from "sonner";
import { ArrowLeft, Ban, Loader2, ShieldCheck, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAccountState, listAllUsers, setUserBanState } from "@/lib/app.functions";

export const Route = createFileRoute("/_authenticated/controle")({
  head: () => ({
    meta: [
      { title: "Controle de usuários — Infinity AI" },
      {
        name: "description",
        content:
          "Painel de controle da Infinity AI para banir ou desbanir usuários cadastrados em tempo real.",
      },
      { property: "og:title", content: "Controle de usuários — Infinity AI" },
      {
        property: "og:description",
        content: "Gerencie todos os usuários cadastrados na Infinity AI.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ControlPage,
});

const statusLabel: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado (aguardando PIX)",
  rejected: "Recusado",
  finalized: "Liberado",
  banned: "Banido",
  active: "Ativo",
  inactive: "Inativo",
};

function ControlPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchAccount = useServerFn(getAccountState);
  const fetchUsers = useServerFn(listAllUsers);
  const setBan = useServerFn(setUserBanState);

  const account = useQuery({
    queryKey: ["account"],
    queryFn: () => fetchAccount({ data: undefined }),
  });

  useEffect(() => {
    if (account.data && !account.data.isAdmin) {
      navigate({ to: "/chat", replace: true });
    }
  }, [account.data, navigate]);

  const users = useQuery({
    queryKey: ["all-users"],
    queryFn: () => fetchUsers({ data: undefined }),
    enabled: account.data?.isAdmin === true,
    refetchInterval: 15000,
  });

  // Atualização em tempo real da lista de usuários.
  useEffect(() => {
    const channel = supabase
      .channel("control-users")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () =>
        queryClient.invalidateQueries({ queryKey: ["all-users"] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions" }, () =>
        queryClient.invalidateQueries({ queryKey: ["all-users"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const mutation = useMutation({
    mutationFn: (vars: { userId: string; banned: boolean }) => setBan({ data: vars }),
    onSuccess: (_r, vars) => {
      toast.success(vars.banned ? "Usuário banido" : "Usuário desbanido e liberado");
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
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

  const rows = users.data ?? [];

  return (
    <main className="relative min-h-screen px-4 py-8">
      <div className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-72 opacity-40" />

      <div className="relative mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-violet" />
            <div>
              <h1 className="text-lg font-semibold">Controle de usuários</h1>
              <p className="text-[11px] text-muted-foreground">
                {rows.length} usuário(s) cadastrado(s)
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

        <section className="surface-panel glow-ring mt-6 overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold">Todos os usuários</h2>
            {users.isFetching && <Loader2 className="h-4 w-4 animate-spin text-neon" />}
          </div>

          {rows.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted-foreground">
              Nenhum usuário cadastrado até o momento.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-background text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">E-mail</th>
                    <th className="px-5 py-3 font-medium">Status atual</th>
                    <th className="px-5 py-3 font-medium">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-border">
                      <td className="px-5 py-3">
                        <span className="block">{row.email}</span>
                        {row.full_name && (
                          <span className="text-[11px] text-muted-foreground">{row.full_name}</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] ${
                            row.isBanned
                              ? "border-destructive/60 text-destructive"
                              : row.status === "finalized"
                                ? "border-neon/50 text-neon"
                                : "border-border text-muted-foreground"
                          }`}
                        >
                          {statusLabel[row.status] ?? row.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {row.id === account.data.userId ? (
                          <span className="text-[11px] text-muted-foreground">
                            Sua conta (administrador)
                          </span>
                        ) : row.isBanned ? (
                          <button
                            disabled={mutation.isPending}
                            onClick={() => mutation.mutate({ userId: row.id, banned: false })}
                            className="glow-ring glow-ring-hover inline-flex items-center gap-1.5 rounded-lg border border-neon/50 bg-background px-3 py-1.5 text-[11px] font-semibold text-neon disabled:opacity-50"
                          >
                            <UserCheck className="h-3.5 w-3.5" /> Desbanir Usuário
                          </button>
                        ) : (
                          <button
                            disabled={mutation.isPending}
                            onClick={() => mutation.mutate({ userId: row.id, banned: true })}
                            className="glow-ring inline-flex items-center gap-1.5 rounded-lg border border-destructive bg-destructive px-3 py-1.5 text-[11px] font-semibold text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                          >
                            <Ban className="h-3.5 w-3.5" /> Banir Usuário
                          </button>
                        )}
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
