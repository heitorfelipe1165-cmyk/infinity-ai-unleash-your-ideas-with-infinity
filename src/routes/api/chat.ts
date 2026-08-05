import { createFileRoute } from "@tanstack/react-router";

const SYSTEM_PROMPT = `Você é a "Infinity AI", uma assistente virtual de elite: extremamente prestativa, rápida, precisa e capaz de executar tarefas complexas.
Responda sempre no idioma do usuário (padrão: português do Brasil).
Use markdown bem estruturado: títulos com #, listas, negrito e tabelas em markdown quando houver dados tabulares.
Quando o usuário pedir um relatório, documento, planilha, tabela ou apresentação de slides, estruture a resposta com títulos claros e seções curtas, e use tabelas markdown para dados, de modo que o conteúdo possa ser exportado para Word, Excel, PowerPoint ou TXT.`;

type Msg = { role: "user" | "assistant"; content: string; images?: string[] };

type Part =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

// Converte a mensagem em conteúdo multimodal quando houver imagens anexadas.
function toGatewayMessage(msg: Msg): { role: string; content: string | Part[] } {
  const images = (msg.images ?? []).filter(
    (src) => typeof src === "string" && (src.startsWith("data:image/") || src.startsWith("https://")),
  );
  if (msg.role !== "user" || images.length === 0) {
    return { role: msg.role, content: msg.content };
  }
  const parts: Part[] = [
    { type: "text", text: msg.content.trim() || "Analise a imagem enviada." },
    ...images.slice(0, 4).map((url) => ({ type: "image_url" as const, image_url: { url } })),
  ];
  return { role: msg.role, content: parts };
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }

        const apiKey = process.env["LOVABLE_API_KEY"];
        const supabaseUrl = process.env["SUPABASE_URL"];
        const supabaseKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!apiKey || !supabaseUrl || !supabaseKey) {
          return new Response("Servidor não configurado", { status: 500 });
        }

        // Valida a sessão e o direito de acesso (dono ou assinatura ativa).
        const { createClient } = await import("@supabase/supabase-js");
        const token = authHeader.slice("Bearer ".length);
        const supabase = createClient(supabaseUrl, supabaseKey, {
          global: {
            fetch: (input, init) => {
              const headers = new Headers(init?.headers);
              headers.set("apikey", supabaseKey);
              headers.set("Authorization", `Bearer ${token}`);
              return fetch(input, { ...init, headers });
            },
          },
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: userData } = await supabase.auth.getUser(token);
        const user = userData?.user;
        if (!user) return new Response("Unauthorized", { status: 401 });

        const { data: adminRole } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        const isAdmin = adminRole !== null && adminRole !== undefined;

        const { data: profile } = await supabase
          .from("profiles")
          .select("subscription_status")
          .eq("id", user.id)
          .maybeSingle();

        if (isAdmin !== true && profile?.subscription_status !== "active") {
          return new Response("Assinatura inativa", { status: 402 });
        }

        const body = (await request.json()) as { messages?: Msg[] };
        const messages = (Array.isArray(body.messages) ? body.messages.slice(-30) : []).map(
          toGatewayMessage,
        );
        if (messages.length === 0) {
          return new Response("Mensagens obrigatórias", { status: 400 });
        }

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": apiKey,
          },
          body: JSON.stringify({
            model: "google/gemini-3.6-flash",
            stream: true,
            messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          return new Response(text || "Falha na IA", { status: upstream.status || 500 });
        }

        // Converte o SSE do gateway em texto puro em streaming.
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buffer = "";

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const reader = upstream.body!.getReader();
            try {
              for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";
                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed.startsWith("data:")) continue;
                  const payload = trimmed.slice(5).trim();
                  if (payload === "[DONE]") continue;
                  try {
                    const json = JSON.parse(payload) as {
                      choices?: { delta?: { content?: string } }[];
                    };
                    const delta = json.choices?.[0]?.delta?.content;
                    if (delta) controller.enqueue(encoder.encode(delta));
                  } catch {
                    // fragmento incompleto — ignora
                  }
                }
              }
            } catch (error) {
              console.error("[chat] stream error", error);
            } finally {
              controller.close();
              reader.releaseLock();
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
          },
        });
      },
    },
  },
});
