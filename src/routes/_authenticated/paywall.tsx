import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, Copy, Loader2, LogOut, MessageSquare, Sparkles } from "lucide-react";

import {
  createPaymentRequest,
  finalizePayment,
  getAccountState,
  startFreePlan,
} from "@/lib/app.functions";
import { supabase } from "@/integrations/supabase/client";
import { BrandMark } from "@/components/InfinityLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FREE_DAILY_LIMIT, PLANS, pixKeyFor, planLabel, priceFor, type PlanId } from "@/lib/plans";

export const Route = createFileRoute("/_authenticated/paywall")({
  head: () => ({
    meta: [
      { title: "Planos e ativação — Infinity AI" },
      {
        name: "description",
        content:
          "Escolha o plano Grátis, Pro (R$ 30,00/mês) ou Infinito (R$ 50,00 vitalício) e ative seu acesso à Infinity AI via PIX.",
      },
      { property: "og:title", content: "Planos e ativação — Infinity AI" },
      {
        property: "og:description",
        content: "Grátis, Pro por R$ 30,00/mês ou Infinito por R$ 50,00 vitalício.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Paywall,
});

function Paywall() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchAccount = useServerFn(getAccountState);
  const submitRequest = useServerFn(createPaymentRequest);
  const confirmPix = useServerFn(finalizePayment);
  const activateFree = useServerFn(startFreePlan);

  const [fullName, setFullName] = useState("");
  const [selected, setSelected] = useState<PlanId | null>(null);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  const account = useQuery({
    queryKey: ["account"],
    queryFn: () => fetchAccount({ data: undefined }),
  });

  const requestStatus = account.data?.requestStatus ?? null;
  const pixUnlocked = account.data?.pixUnlocked ?? false;
  const banned = account.data?.isBanned ?? false;
  const plan = account.data?.plan ?? null;
  const limitReached = account.data?.freeLimitReached ?? false;
  const pixKey = pixKeyFor(plan ?? "pro");

  // Administradores vão direto ao chat.
  useEffect(() => {
    if (account.data?.isAdmin) navigate({ to: "/chat", replace: true });
  }, [account.data?.isAdmin, navigate]);

  // Já liberou o chat: segue direto para a conversa.
  useEffect(() => {
    if (account.data?.hasAccess && !account.data.isAdmin) navigate({ to: "/chat", replace: true });
  }, [account.data?.hasAccess, account.data?.isAdmin, navigate]);

  // Conta suspensa: desloga na hora.
  useEffect(() => {
    if (!banned) return;
    toast.error("Sua conta foi suspensa");
    void (async () => {
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
      navigate({ to: "/auth", replace: true });
    })();
  }, [banned, navigate, queryClient]);

  // Atualiza a tela assim que o administrador aprovar a solicitação.
  useEffect(() => {
    const channel = supabase
      .channel("subscriptions-paywall")
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions" }, () =>
        queryClient.invalidateQueries({ queryKey: ["account"] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () =>
        queryClient.invalidateQueries({ queryKey: ["account"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const mutation = useMutation({
    mutationFn: (vars: { fullName: string; plan: "pro" | "infinite" }) =>
      submitRequest({ data: vars }),
    onSuccess: () => {
      setSent(true);
      toast.success("Solicitação enviada! Aguarde a aprovação do administrador.");
      queryClient.invalidateQueries({ queryKey: ["account"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar"),
  });

  const freePlan = useMutation({
    mutationFn: () => activateFree({ data: undefined }),
    onSuccess: async () => {
      toast.success(`Plano grátis ativado! Você tem ${FREE_DAILY_LIMIT} mensagens por dia.`);
      await queryClient.invalidateQueries({ queryKey: ["account"] });
      navigate({ to: "/chat", replace: true });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível ativar"),
  });

  const release = useMutation({
    mutationFn: () => confirmPix({ data: undefined }),
    onSuccess: async () => {
      toast.success("Pagamento confirmado! Chat liberado.");
      await queryClient.invalidateQueries({ queryKey: ["account"] });
      navigate({ to: "/chat", replace: true });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível liberar o chat"),
  });

  async function copyPix() {
    try {
      await navigator.clipboard.writeText(pixKey);
    } catch {
      const area = document.createElement("textarea");
      area.value = pixKey;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    toast.success("Chave PIX copiada!");
    setTimeout(() => setCopied(false), 2500);
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const waiting = !pixUnlocked && (sent || requestStatus === "pending");
  const paidPlans = PLANS.filter((p) => p.id !== "free" || !limitReached);

  return (
    <main className="relative min-h-[100dvh] px-4 py-10">
      <div className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-[460px] opacity-50" />

      <div className="relative mx-auto max-w-4xl">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <BrandMark to="/" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={signOut}
              className="glow-ring glow-ring-hover inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs"
            >
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>
          </div>
        </div>

        {limitReached && (
          <div className="glow-ring mt-8 rounded-2xl border border-destructive/50 bg-surface p-5 text-sm">
            <span className="font-semibold text-destructive">Limite diário atingido.</span> Faça o
            PIX para liberar mais acesso.
          </div>
        )}

        {pixUnlocked ? (
          <section className="surface-panel glow-ring mt-8 rounded-3xl p-8 shadow-[0_0_60px_-24px_var(--violet)]">
            <span className="glow-ring inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-neon" /> {planLabel[plan ?? "pro"]}
            </span>
            <h1 className="mt-6 text-2xl font-bold">Solicitação aprovada!</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Pague {priceFor(plan ?? "pro")} com a chave PIX abaixo e depois clique em “Já fiz o PIX
              - Liberar Chat”.
            </p>

            <p className="mt-6 text-xs font-medium text-muted-foreground">
              Chave PIX (Copia e Cola)
            </p>
            <p className="scrollbar-slim mt-2 max-h-32 overflow-y-auto break-all rounded-lg border border-border bg-surface p-3 font-mono text-xs leading-relaxed text-neon">
              {pixKey}
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={copyPix}
                className="glow-ring bg-gradient-neon inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-primary-foreground hover:shadow-[0_0_26px_-6px_var(--violet)]"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copiado!" : "Copiar PIX"}
              </button>
              <button
                onClick={() => release.mutate()}
                disabled={release.isPending}
                className="glow-ring glow-ring-hover inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-neon/50 bg-surface px-5 py-3 text-sm font-semibold disabled:opacity-60"
              >
                {release.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageSquare className="h-4 w-4 text-neon" />
                )}
                Já fiz o PIX - Liberar Chat
              </button>
            </div>
          </section>
        ) : waiting ? (
          <section className="surface-panel glow-ring mt-8 rounded-3xl p-8">
            <h1 className="text-2xl font-bold">Solicitação enviada com sucesso!</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Aguarde a aprovação do administrador. Assim que ela sair, a chave PIX aparece aqui
              automaticamente — sem precisar recarregar a página.
            </p>
            <Loader2 className="mt-6 h-5 w-5 animate-spin text-neon" />
          </section>
        ) : selected && selected !== "free" ? (
          <section className="surface-panel glow-ring mt-8 rounded-3xl p-8">
            <button
              onClick={() => setSelected(null)}
              className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-neon"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Escolher outro plano
            </button>
            <h1 className="mt-5 text-2xl font-bold">
              Plano <span className="text-gradient-neon">{planLabel[selected]}</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Digite seu nome completo para enviar a solicitação. A chave PIX é revelada após a
              aprovação do administrador.
            </p>

            <form
              className="mt-6 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (fullName.trim().length < 3) {
                  toast.error("Digite seu nome completo");
                  return;
                }
                mutation.mutate({ fullName: fullName.trim(), plan: selected });
              }}
            >
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">
                  Nome completo (mesmo do pagamento)
                </span>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="glow-ring glow-ring-hover mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-neon"
                />
              </label>

              <button
                type="submit"
                disabled={mutation.isPending}
                className="glow-ring bg-gradient-neon inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar Pagamento
              </button>
            </form>
          </section>
        ) : (
          <section className="mt-8">
            <h1 className="text-2xl font-bold sm:text-3xl">
              Escolha o seu <span className="text-gradient-neon">plano</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              Comece grátis com {FREE_DAILY_LIMIT} mensagens por dia ou libere o uso ilimitado com
              PIX.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {paidPlans.map((p) => (
                <article
                  key={p.id}
                  className={`surface-panel glow-ring glow-ring-hover flex flex-col rounded-2xl p-6 ${
                    p.highlight ? "border border-neon/50 shadow-[var(--shadow-neon)]" : ""
                  }`}
                >
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {p.name}
                  </h2>
                  <p className="mt-3 text-3xl font-bold">{p.price}</p>
                  <p className="text-xs text-muted-foreground">{p.period}</p>

                  <ul className="mt-5 flex-1 space-y-2">
                    {p.perks.map((perk) => (
                      <li
                        key={perk}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-neon" />
                        {perk}
                      </li>
                    ))}
                  </ul>

                  <button
                    disabled={freePlan.isPending}
                    onClick={() => {
                      if (p.id === "free") freePlan.mutate();
                      else setSelected(p.id);
                    }}
                    className={`glow-ring mt-6 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-60 ${
                      p.highlight
                        ? "bg-gradient-neon text-primary-foreground"
                        : "glow-ring-hover border border-border bg-background"
                    }`}
                  >
                    {p.id === "free" && freePlan.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    {p.id === "free" ? "Entrar grátis" : `Assinar ${p.name}`}
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
