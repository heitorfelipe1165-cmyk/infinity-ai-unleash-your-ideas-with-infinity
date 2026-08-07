import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Menu, Paperclip, SendHorizonal, X } from "lucide-react";
import { InfinityLogo } from "@/components/InfinityLogo";
import { supabase } from "@/integrations/supabase/client";
import { getAccountState } from "@/lib/app.functions";
import { ChatSidebar, type ChatSummary } from "@/components/chat/ChatSidebar";
import { MessageBubble, type ChatMessage } from "@/components/chat/MessageBubble";
import { shouldOfferDownloads } from "@/lib/file-export";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "Chat — Infinity AI" },
      {
        name: "description",
        content:
          "Converse com a Infinity AI em tempo real, retome conversas antigas e baixe suas respostas em Word, Excel, PowerPoint ou TXT.",
      },
      { property: "og:title", content: "Chat — Infinity AI" },
      {
        property: "og:description",
        content: "Assistente de elite com streaming em tempo real e exportação de arquivos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatPage,
});

const SUGGESTIONS = [
  "Crie um relatório completo sobre tendências de IA em 2026",
  "Monte uma tabela de orçamento mensal para uma startup",
  "Gere uma apresentação de 6 slides sobre produtividade",
];

function ChatPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchAccount = useServerFn(getAccountState);

  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const account = useQuery({
    queryKey: ["account"],
    queryFn: () => fetchAccount({ data: undefined }),
  });

  useEffect(() => {
    if (!account.data) return;
    if (account.data.isBanned) {
      toast.error("Sua conta foi suspensa");
      void (async () => {
        await queryClient.cancelQueries();
        queryClient.clear();
        await supabase.auth.signOut();
        navigate({ to: "/auth", replace: true });
      })();
      return;
    }
    if (!account.data.hasAccess) {
      toast.error(
        account.data.freeLimitReached
          ? "Limite diário atingido. Faça o PIX para liberar mais acesso."
          : "Acesso bloqueado. O chat só será desbloqueado após a realização do PIX e confirmação do envio.",
      );
      navigate({ to: "/paywall", replace: true });
    }
  }, [account.data, navigate, queryClient]);

  // Mantém o acesso sincronizado em tempo real (aprovação, liberação, banimento).
  useEffect(() => {
    const channel = supabase
      .channel("chat-access")
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


  const loadChats = useCallback(async () => {
    const { data } = await supabase
      .from("chats")
      .select("id, title, created_at")
      .order("created_at", { ascending: false });
    setChats(data ?? []);
  }, []);

  useEffect(() => {
    if (account.data?.hasAccess) void loadChats();
  }, [account.data?.hasAccess, loadChats]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function openChat(chatId: string) {
    setShowHistory(false);
    setSidebarOpen(false);
    setActiveChatId(chatId);
    const { data } = await supabase
      .from("messages")
      .select("role, content")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });
    setMessages(
      (data ?? []).map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    );
  }

  async function addImage(file: File) {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máximo 5 MB)");
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("read"));
      reader.readAsDataURL(file);
    }).catch(() => null);
    if (!dataUrl) {
      toast.error("Não foi possível ler a imagem");
      return;
    }
    setAttachments((prev) => [...prev, dataUrl].slice(0, 4));
  }

  function newChat() {
    setActiveChatId(null);
    setMessages([]);
    setInput("");
    setAttachments([]);
    setShowHistory(false);
    setSidebarOpen(false);
  }

  async function resetChats() {
    const userId = account.data?.userId;
    if (!userId) return;
    if (!window.confirm("Isso vai apagar todas as suas conversas. Continuar?")) return;
    const { error: msgError } = await supabase.from("messages").delete().eq("user_id", userId);
    const { error: chatError } = await supabase.from("chats").delete().eq("user_id", userId);
    if (msgError || chatError) {
      toast.error("Não foi possível resetar os chats");
      return;
    }
    setChats([]);
    newChat();
    toast.success("Chats resetados. Comece uma nova conversa!");
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function send(text: string, imgs: string[] = attachments) {
    const prompt = text.trim();
    if ((!prompt && imgs.length === 0) || streaming) return;

    setInput("");
    setAttachments([]);
    setShowHistory(false);
    const userId = account.data?.userId;
    if (!userId) return;

    let chatId = activeChatId;
    if (!chatId) {
      const { data, error } = await supabase
        .from("chats")
        .insert({ user_id: userId, title: (prompt || "Imagem enviada").slice(0, 120) })
        .select("id, title, created_at")
        .single();
      if (error || !data) {
        toast.error("Não foi possível criar a conversa");
        return;
      }
      chatId = data.id;
      setActiveChatId(data.id);
      setChats((prev) => [data, ...prev]);
    }

    const history = [
      ...messages,
      { role: "user" as const, content: prompt, ...(imgs.length ? { images: imgs } : {}) },
    ];
    setMessages([...history, { role: "assistant", content: "" }]);
    setStreaming(true);

    await supabase.from("messages").insert({
      chat_id: chatId,
      user_id: userId,
      role: "user",
      content: prompt || "[imagem enviada]",
    });

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sessão expirada");

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: history }),
      });

      if (response.status === 402) {
        navigate({ to: "/paywall", replace: true });
        return;
      }
      if (!response.ok || !response.body) {
        throw new Error(
          response.status === 429
            ? "Muitas solicitações. Tente novamente em instantes."
            : "A IA não respondeu. Tente novamente.",
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: answer }]);
      }

      queryClient.invalidateQueries({ queryKey: ["account"] });

      if (answer.trim()) {
        await supabase
          .from("messages")
          .insert({ chat_id: chatId, user_id: userId, role: "assistant", content: answer });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro inesperado");
      setMessages(history);
    } finally {
      setStreaming(false);
    }
  }

  const lastUserPrompt = useMemo(
    () => [...messages].reverse().find((m) => m.role === "user")?.content ?? "",
    [messages],
  );

  if (account.isLoading || !account.data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-neon" />
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-background/70 backdrop-blur-sm md:hidden"
        />
      )}
      <div
        className={`${sidebarOpen ? "fixed inset-y-0 left-0 z-40 w-72" : "hidden"} md:relative md:block`}
      >
        <ChatSidebar
          chats={chats}
          activeChatId={activeChatId}
          isAdmin={account.data.isAdmin}
          showPix={account.data.pixUnlocked}
          plan={account.data.plan}
          usage={
            account.data.plan === "free" && !account.data.isAdmin
              ? { used: account.data.usedToday, limit: account.data.freeLimit }
              : null
          }
          email={account.data.email}
          onNewChat={newChat}
          onOpenHistory={() => {
            setShowHistory(true);
            setSidebarOpen(false);
            void loadChats();
          }}
          onSelectChat={openChat}
          onResetChats={resetChats}
          onSignOut={signOut}
        />
      </div>

      <main className="relative flex flex-1 flex-col">
        <div className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-64 opacity-40" />

        <header className="relative flex items-center gap-3 border-b border-border px-4 py-3">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="glow-ring glow-ring-hover rounded-lg border border-border bg-surface p-2 md:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-sm font-semibold">
              {showHistory ? "Histórico de conversas" : "Infinity AI"}
            </h1>
            <p className="text-[11px] text-muted-foreground">
              {account.data.isAdmin
                ? "Dono / Administrador"
                : account.data.plan === "free"
                  ? `Plano grátis • ${account.data.usedToday}/${account.data.freeLimit} mensagens hoje`
                  : "Assinatura ativa"}
            </p>
          </div>
        </header>

        {showHistory ? (
          <div className="scrollbar-slim relative flex-1 overflow-y-auto px-4 py-6">
            <div className="mx-auto max-w-3xl space-y-2">
              {chats.length === 0 ? (
                <p className="text-sm text-muted-foreground">Você ainda não tem conversas salvas.</p>
              ) : (
                chats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => openChat(chat.id)}
                    className="surface-panel glow-ring glow-ring-hover flex w-full flex-col items-start rounded-xl px-4 py-3 text-left"
                  >
                    <span className="line-clamp-1 text-sm font-medium">{chat.title}</span>
                    <span className="mt-1 text-[11px] text-muted-foreground">
                      {new Date(chat.created_at).toLocaleString("pt-BR")}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="scrollbar-slim relative flex-1 overflow-y-auto px-4 py-6">
            <div className="mx-auto max-w-3xl space-y-6">
              {messages.length === 0 ? (
                <div className="pt-10 text-center">
                  <InfinityLogo className="mx-auto h-10 w-16 text-neon" />
                  <h2 className="mt-4 text-2xl font-bold">
                    Como posso <span className="text-gradient-neon">acelerar</span> seu dia?
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Peça relatórios, planilhas ou apresentações e baixe o arquivo pronto.
                  </p>
                  <div className="mt-8 grid gap-2 text-left sm:grid-cols-3">
                    {SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => void send(suggestion)}
                        className="surface-panel glow-ring glow-ring-hover rounded-xl p-3 text-xs text-muted-foreground"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((message, index) => (
                  <MessageBubble
                    key={index}
                    message={message}
                    streaming={streaming && index === messages.length - 1}
                    showDownloads={
                      message.role === "assistant" &&
                      shouldOfferDownloads(lastUserPrompt, message.content)
                    }
                  />
                ))
              )}
              <div ref={bottomRef} />
            </div>
          </div>
        )}

        <div className="relative border-t border-border px-4 py-4">
          <div className="mx-auto max-w-3xl">
            {attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {attachments.map((src, i) => (
                  <div key={i} className="relative">
                    <img
                      src={src}
                      alt={`Anexo ${i + 1}`}
                      className="h-20 w-20 rounded-xl border border-border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground hover:text-foreground"
                      aria-label="Remover imagem"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send(input);
            }}
            className="glow-ring glow-ring-hover mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-input bg-surface p-2 focus-within:border-neon"
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              multiple
              className="hidden"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                files.forEach((file) => void addImage(file));
                event.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="glow-ring glow-ring-hover flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:text-neon"
              aria-label="Anexar imagem"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPaste={(event) => {
                const items = Array.from(event.clipboardData?.items ?? []);
                const images = items
                  .filter((item) => item.type.startsWith("image/"))
                  .map((item) => item.getAsFile())
                  .filter((file): file is File => file !== null);
                if (images.length > 0) {
                  event.preventDefault();
                  images.forEach((file) => void addImage(file));
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send(input);
                }
              }}
              rows={1}
              placeholder="Peça qualquer coisa à Infinity AI ou cole uma imagem (Ctrl+V)..."
              className="scrollbar-slim max-h-40 min-h-11 w-full resize-none bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              disabled={streaming || (!input.trim() && attachments.length === 0)}
              className="glow-ring bg-gradient-neon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-primary-foreground hover:shadow-[0_0_24px_-6px_var(--violet)] disabled:opacity-50"
            >
              {streaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SendHorizonal className="h-4 w-4" />
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
