/**
 * Planos da Infinity AI e chaves PIX oficiais (BR Code / Copia e Cola).
 * Módulo client-safe: nenhum segredo aqui.
 */

export type PlanId = "free" | "pro" | "infinite";

export const FREE_DAILY_LIMIT = 10;

export const PIX_KEYS: Record<Exclude<PlanId, "free">, string> = {
  pro: "00020126580014br.gov.bcb.pix013633366dfb-6a77-4aae-af7d-1341bbd7c111520400005303986540530.005802BR5925CAIO EMANUEL SILVA WERNES6010Vila Velha6211050726f787963047EAE",
  infinite:
    "0020126580014br.gov.bcb.pix013633366dfb-6a77-4aae-af7d-1341bbd7c111520400005303986540550.005802BR5925CAIO EMANUEL SILVA WERNES6010Vila Velha6211050726f78796304560D",
};

export type PlanInfo = {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  highlight?: boolean;
  perks: string[];
};

export const PLANS: PlanInfo[] = [
  {
    id: "free",
    name: "Grátis",
    price: "R$ 0",
    period: "para sempre",
    perks: [
      `${FREE_DAILY_LIMIT} mensagens por dia`,
      "Chat em tempo real",
      "Histórico de conversas",
      "Exportação em .txt",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "R$ 30,00",
    period: "por mês",
    highlight: true,
    perks: [
      "Mensagens ilimitadas",
      "Análise de imagens e prints",
      "Word, Excel, PowerPoint e TXT",
      "Estúdio de mídia (imagens)",
    ],
  },
  {
    id: "infinite",
    name: "Infinito",
    price: "R$ 50,00",
    period: "vitalício",
    perks: [
      "Tudo do Pro, para sempre",
      "Pagamento único, sem renovação",
      "Prioridade nas respostas",
      "Suporte direto do time",
    ],
  },
];

export const planLabel: Record<string, string> = {
  free: "Grátis",
  pro: "Pro (R$ 30,00/mês)",
  infinite: "Infinito (R$ 50,00 vitalício)",
};

export function pixKeyFor(plan: string): string {
  return plan === "infinite" ? PIX_KEYS.infinite : PIX_KEYS.pro;
}

export function priceFor(plan: string): string {
  return plan === "infinite" ? "R$ 50,00" : "R$ 30,00";
}
