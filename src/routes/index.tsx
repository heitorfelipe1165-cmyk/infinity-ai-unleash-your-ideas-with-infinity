import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowRight, Bot, FileDown, Infinity as InfinityIcon, ShieldCheck, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Infinity AI — Inteligência Artificial premium por R$ 30/mês" },
      {
        name: "description",
        content:
          "Infinity AI: chat com IA de elite em tempo real, histórico de conversas e exportação automática para Word, Excel, PowerPoint e TXT.",
      },
      { property: "og:title", content: "Infinity AI — IA de elite por R$ 30/mês" },
      {
        property: "og:description",
        content:
          "Converse com a Infinity AI em streaming, salve seu histórico e baixe relatórios em Word, Excel e PowerPoint.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: ({ search }) => {
    void search;
  },
  component: Landing,
});

const features = [
  {
    icon: Zap,
    title: "Respostas em streaming",
    text: "Efeito de digitação em tempo real, palavra por palavra, como nos melhores assistentes do mundo.",
  },
  {
    icon: FileDown,
    title: "Arquivos prontos para uso",
    text: "Baixe qualquer resposta como Word, Excel, PowerPoint ou bloco de notas com um clique.",
  },
  {
    icon: Bot,
    title: "Histórico inteligente",
    text: "Todas as conversas ficam salvas e organizadas pelo título da sua primeira mensagem.",
  },
  {
    icon: ShieldCheck,
    title: "Acesso controlado",
    text: "Liberação manual do administrador após o pagamento via PIX. Simples e seguro.",
  },
];

function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-60" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <InfinityIcon className="h-7 w-7 text-neon" />
          <span className="font-display text-lg font-semibold tracking-tight">Infinity AI</span>
        </div>
        <Link
          to="/auth"
          className="glow-ring glow-ring-hover rounded-full border border-border bg-surface px-5 py-2 text-sm font-medium"
        >
          Entrar
        </Link>
      </header>

      <section className="relative mx-auto max-w-4xl px-6 pt-16 pb-24 text-center">
        <span className="glow-ring inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-neon" />
          IA de elite • R$ 30,00 por mês
        </span>

        <h1 className="mt-8 text-5xl font-bold leading-[1.05] sm:text-6xl">
          A inteligência artificial <span className="text-gradient-neon">infinita</span> para o seu
          trabalho
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Converse, crie relatórios, planilhas e apresentações completas em segundos. A Infinity AI
          responde em tempo real e entrega seus arquivos prontos para download.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/auth"
            className="glow-ring bg-gradient-neon inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold text-primary-foreground hover:scale-[1.03] hover:shadow-[0_0_30px_-6px_var(--violet)]"
          >
            Começar agora <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/auth"
            className="glow-ring glow-ring-hover inline-flex items-center gap-2 rounded-full border border-border bg-surface px-7 py-3 text-sm font-medium"
          >
            Já tenho conta
          </Link>
        </div>

        <div className="mt-20 grid gap-4 text-left sm:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="surface-panel glow-ring glow-ring-hover rounded-2xl p-6"
            >
              <feature.icon className="h-5 w-5 text-neon" />
              <h2 className="mt-4 text-base font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative border-t border-border py-8 text-center text-xs text-muted-foreground">
        Infinity AI © {new Date().getFullYear()} — Assistente virtual de elite
      </footer>
    </main>
  );
}

void redirect;
