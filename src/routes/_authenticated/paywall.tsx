import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Infinity as InfinityIcon, Loader2, LogOut, Sparkles } from "lucide-react";
import { createPaymentRequest, getAccountState } from "@/lib/app.functions";
import { supabase } from "@/integrations/supabase/client";

const PIX_KEY = "dd43ac3b-ea9d-4f70-bc06-60a3f5f200ac";

export const Route = createFileRoute("/_authenticated/paywall")({
  head: () => ({
    meta: [
      { title: "Ativar acesso — Infinity AI" },
      {
        name: "description",
        content:
          "Ative seu acesso à Infinity AI por R$ 30,00 por mês pagando via PIX e envie seu comprovante.",
      },
      { property: "og:title", content: "Ativar acesso — Infinity AI" },
      {
        property: "og:description",
        content: "Pague R$ 30,00 via PIX e libere a Infinity AI completa.",
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

  const [fullName, setFullName] = useState("");
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  const account = useQuery({
    queryKey: ["account"],
    queryFn: () => fetchAccount({ data: undefined }),
  });

  useEffect(() => {
    if (account.data?.hasAccess) navigate({ to: "/chat", replace: true });
  }, [account.data?.hasAccess, navigate]);

  const mutation = useMutation({
    mutationFn: (name: string) => submitRequest({ data: { fullName: name } }),
    onSuccess: () => {
      setSent(true);
      queryClient.invalidateQueries({ queryKey: ["account"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar"),
  });

  async function copyPix() {
    try {
      await navigator.clipboard.writeText(PIX_KEY);
    } catch {
      const area = document.createElement("textarea");
      area.value = PIX_KEY;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    toast.success("Copiado!");
    setTimeout(() => setCopied(false), 2500);
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <main className="relative min-h-screen px-4 py-10">
      <div className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-[460px] opacity-50" />

      <div className="relative mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <InfinityIcon className="h-6 w-6 text-neon" />
            <span className="font-display text-base font-semibold">Infinity AI</span>
          </div>
          <button
            onClick={signOut}
            className="glow-ring glow-ring-hover inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs"
          >
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </div>

        <div className="surface-panel glow-ring mt-8 rounded-3xl p-8 shadow-[0_0_60px_-24px_var(--violet)]">
          <span className="glow-ring inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-neon" /> Acesso premium
          </span>

          <h1 className="mt-6 text-3xl font-bold leading-tight">
            Acesse a melhor e mais completa Inteligência Artificial por apenas{" "}
            <span className="text-gradient-neon">R$ 30,00 por mês</span>
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Chat ilimitado em tempo real, histórico salvo e criação automática de documentos Word,
            Excel, PowerPoint e TXT. Pague via PIX e o administrador libera seu acesso em instantes.
          </p>

          <div className="mt-8 rounded-2xl border border-border bg-background p-5">
            <p className="text-xs font-medium text-muted-foreground">Chave PIX (Copia e Cola)</p>
            <p className="mt-2 break-all font-mono text-sm text-neon">{PIX_KEY}</p>
            <button
              onClick={copyPix}
              className="glow-ring bg-gradient-neon mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:shadow-[0_0_26px_-6px_var(--violet)]"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiado!" : "Copiar Chave PIX"}
            </button>
          </div>

          {sent ? (
            <div className="glow-ring mt-8 rounded-2xl border border-neon/40 bg-surface p-5 text-sm shadow-[var(--shadow-neon)]">
              Seu pagamento foi enviado! O administrador irá liberar seu acesso em instantes.
            </div>
          ) : (
            <form
              className="mt-8 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (fullName.trim().length < 3) {
                  toast.error("Digite seu nome completo");
                  return;
                }
                mutation.mutate(fullName.trim());
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

              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">
                  Comprovante (simulação de envio)
                </span>
                <input
                  type="file"
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-xs text-muted-foreground outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:text-secondary-foreground"
                />
              </label>

              <button
                type="submit"
                disabled={mutation.isPending}
                className="glow-ring glow-ring-hover inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neon/40 bg-surface px-4 py-3 text-sm font-semibold disabled:opacity-60"
              >
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar Pagamento
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
