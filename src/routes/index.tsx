import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  ArrowRight,
  Check,
  FileSpreadsheet,
  FileText,
  ImagePlus,
  Presentation,
  ScanEye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BrandMark } from "@/components/InfinityLogo";
import { OWNER_EMAIL } from "@/lib/plans.owner";
import { PLANS } from "@/lib/plans";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Infinity AI — A Inteligência Artificial Sem Limites para o seu Negócio" },
      {
        name: "description",
        content:
          "Infinity AI cria documentos Word, planilhas Excel, apresentações PowerPoint, analisa prints e gera mídia. Comece grátis e evolua para o plano Pro ou Infinito.",
      },
      {
        property: "og:title",
        content: "Infinity AI — A Inteligência Artificial Sem Limites para o seu Negócio",
      },
      {
        property: "og:description",
        content:
          "Documentos, planilhas, slides, análise de imagens e estúdio de mídia em um só assistente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: FileText,
    title: "Criação de Documentos",
    text: "Relatórios, propostas e contratos entregues em .docx com cabeçalhos corporativos da marca.",
  },
  {
    icon: FileSpreadsheet,
    title: "Planilhas Inteligentes",
    text: "Tabelas, orçamentos e cronogramas prontos em .xlsx com formatação profissional.",
  },
  {
    icon: Presentation,
    title: "Apresentações de Slides",
    text: "Decks completos em .pptx no tema escuro oficial da Infinity AI, com neon azul e roxo.",
  },
  {
    icon: ScanEye,
    title: "Input Multimodal",
    text: "Envie ou cole prints com Ctrl+V e receba a leitura completa do que está na imagem.",
  },
  {
    icon: ImagePlus,
    title: "Estúdio de Mídia",
    text: "Peça uma imagem e veja a criação acontecer direto na conversa, pronta para baixar.",
  },
];

function Landing() {
  const navigate = useNavigate();

  // Bypass do dono: sessão ativa do administrador vai direto para o chat.
  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      const email = data.session?.user.email?.toLowerCase();
      if (active && email === OWNER_EMAIL) navigate({ to: "/chat", replace: true });
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-[620px] opacity-60" />

      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 md:grid-cols-3">
          <BrandMark to="/" />

          <nav className="hidden items-center justify-center gap-7 text-sm text-muted-foreground md:flex">
            <button
              onClick={() => scrollTo("recursos")}
              className="transition-colors hover:text-neon"
            >
              Recursos
            </button>
            <button onClick={() => scrollTo("planos")} className="transition-colors hover:text-neon">
              Planos
            </button>
          </nav>

          <div className="flex items-center justify-end gap-2">
            <ThemeToggle />
            <Link
              to="/auth"
              className="glow-ring glow-ring-hover rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium"
            >
              Entrar
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="glow-ring bg-gradient-neon rounded-full px-4 py-2 text-sm font-semibold text-primary-foreground hover:shadow-[0_0_26px_-6px_var(--violet)]"
            >
              Cadastrar
            </Link>
          </div>
        </div>
      </header>

      <main className="relative">
        <section className="mx-auto max-w-4xl px-6 pb-20 pt-20 text-center sm:pt-28">
          <span className="glow-ring inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-neon" />
            Comece grátis • Pro R$ 30,00/mês • Infinito R$ 50,00 vitalício
          </span>

          <h1 className="mt-8 text-4xl font-bold leading-[1.07] sm:text-6xl">
            <span className="text-gradient-neon">Infinity AI</span> — A Inteligência Artificial Sem
            Limites para o seu Negócio
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Um único assistente para escrever, calcular, apresentar, enxergar e criar. Entregas
            prontas para uso em segundos — sem planilhas quebradas e sem slides genéricos.
          </p>

          <button
            onClick={() => scrollTo("planos")}
            className="glow-ring bg-gradient-neon mt-10 inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03] hover:shadow-[0_0_34px_-6px_var(--violet)]"
          >
            Começar Agora Gratuitamente <ArrowRight className="h-4 w-4" />
          </button>
        </section>

        <section id="recursos" className="mx-auto max-w-6xl scroll-mt-24 px-6 pb-24">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">
            Tudo o que a <span className="text-gradient-neon">Infinity AI</span> faz por você
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="surface-panel glow-ring glow-ring-hover rounded-2xl p-6"
              >
                <div className="glow-ring flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background">
                  <feature.icon className="h-5 w-5 text-neon" />
                </div>
                <h3 className="mt-5 text-base font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="planos" className="mx-auto max-w-6xl scroll-mt-24 px-6 pb-24">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">
            Escolha o seu <span className="text-gradient-neon">plano</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-muted-foreground">
            Crie sua conta e selecione o plano dentro do app. Planos pagos são liberados via PIX após
            aprovação do administrador.
          </p>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {PLANS.map((plan) => (
              <article
                key={plan.id}
                className={`surface-panel glow-ring glow-ring-hover relative flex flex-col rounded-2xl p-7 ${
                  plan.highlight ? "border border-neon/50 shadow-[var(--shadow-neon)]" : ""
                }`}
              >
                {plan.highlight && (
                  <span className="bg-gradient-neon absolute -top-3 left-7 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                    Mais escolhido
                  </span>
                )}
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {plan.name}
                </h3>
                <p className="mt-3 text-3xl font-bold">{plan.price}</p>
                <p className="text-xs text-muted-foreground">{plan.period}</p>

                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-neon" />
                      {perk}
                    </li>
                  ))}
                </ul>

                <Link
                  to="/auth"
                  search={{ mode: "signup" }}
                  className={`glow-ring mt-7 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold ${
                    plan.highlight
                      ? "bg-gradient-neon text-primary-foreground hover:shadow-[0_0_26px_-6px_var(--violet)]"
                      : "glow-ring-hover border border-border bg-background"
                  }`}
                >
                  {plan.id === "free" ? "Começar grátis" : `Assinar ${plan.name}`}
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative border-t border-border py-10">
        <p className="text-center text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          INFINITY AI @ UNEMPLOYED CORP ALL RIGHTS RESERVED
        </p>
      </footer>
    </div>
  );
}
