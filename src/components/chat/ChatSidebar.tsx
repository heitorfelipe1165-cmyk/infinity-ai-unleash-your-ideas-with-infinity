import { Link } from "@tanstack/react-router";
import {
  Eye,
  EyeOff,
  Folder,
  KeyRound,
  LogOut,
  MessageSquare,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BrandMark } from "@/components/InfinityLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { revealPassword } from "@/lib/password-vault";
import { planLabel } from "@/lib/plans";

export type ChatSummary = { id: string; title: string; created_at: string };

type Props = {
  chats: ChatSummary[];
  activeChatId: string | null;
  isAdmin: boolean;
  showPix?: boolean;
  email: string;
  plan?: string | null;
  usage?: { used: number; limit: number } | null;
  onNewChat: () => void;
  onOpenHistory: () => void;
  onSelectChat: (id: string) => void;
  onResetChats: () => void;
  onSignOut: () => void;
};

export function ChatSidebar({
  chats,
  activeChatId,
  isAdmin,
  showPix = false,
  email,
  plan = null,
  usage = null,
  onNewChat,
  onOpenHistory,
  onSelectChat,
  onResetChats,
  onSignOut,
}: Props) {
  const [password, setPassword] = useState<string | null>(null);

  function toggleReveal() {
    if (password) {
      setPassword(null);
      return;
    }
    const saved = revealPassword(email);
    if (!saved) {
      toast.error("Senha não disponível neste navegador. Faça login novamente para salvá-la.");
      return;
    }
    setPassword(saved);
  }

  return (
    <aside className="flex h-full w-full flex-col border-r border-sidebar-border bg-sidebar md:w-72">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 py-4">
        <BrandMark to="/" />
        <ThemeToggle />
      </div>

      <div className="space-y-2 px-3">
        <button
          onClick={onNewChat}
          className="glow-ring bg-gradient-neon flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-primary-foreground hover:shadow-[0_0_26px_-6px_var(--violet)]"
        >
          <Plus className="h-4 w-4" /> Novo Chat
        </button>

        <button
          onClick={onOpenHistory}
          className="glow-ring glow-ring-hover flex w-full items-center gap-2 rounded-xl border border-sidebar-border bg-surface px-4 py-2.5 text-sm font-medium"
        >
          <Folder className="h-4 w-4 text-neon" /> Chats
        </button>

        <button
          onClick={onResetChats}
          className="glow-ring glow-ring-hover flex w-full items-center gap-2 rounded-xl border border-destructive/40 bg-surface px-4 py-2.5 text-sm font-medium text-destructive"
        >
          <Trash2 className="h-4 w-4" /> Resetar Chats
        </button>
      </div>

      <div className="scrollbar-slim mt-5 flex-1 overflow-y-auto px-3 pb-3">
        <p className="px-1 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Conversas
        </p>
        {chats.length === 0 ? (
          <p className="px-1 text-xs text-muted-foreground">Nenhuma conversa salva ainda.</p>
        ) : (
          <ul className="space-y-1">
            {chats.map((chat) => (
              <li key={chat.id}>
                <button
                  onClick={() => onSelectChat(chat.id)}
                  className={`glow-ring flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                    activeChatId === chat.id
                      ? "border border-neon/40 bg-sidebar-accent text-sidebar-accent-foreground"
                      : "border border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{chat.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2 border-t border-sidebar-border p-3">
        {isAdmin && (
          <>
            <Link
              to="/admin"
              className="glow-ring glow-ring-hover flex w-full items-center gap-2 rounded-xl border border-violet/50 bg-surface px-4 py-2.5 text-sm font-medium"
              style={{ borderColor: "color-mix(in oklab, var(--violet) 50%, transparent)" }}
            >
              <ShieldCheck className="h-4 w-4 text-violet" /> Painel Admin
            </Link>
            <Link
              to="/controle"
              className="glow-ring glow-ring-hover flex w-full items-center gap-2 rounded-xl border border-violet/50 bg-surface px-4 py-2.5 text-sm font-medium"
              style={{ borderColor: "color-mix(in oklab, var(--violet) 50%, transparent)" }}
            >
              <ShieldAlert className="h-4 w-4 text-violet" /> Controle
            </Link>
          </>
        )}


        {showPix && (
          <Link
            to="/paywall"
            className="glow-ring glow-ring-hover flex w-full items-center gap-2 rounded-xl border border-neon/40 bg-surface px-4 py-2.5 text-sm font-medium"
          >
            <KeyRound className="h-4 w-4 text-neon" /> Chave PIX
          </Link>
        )}

        <button
          onClick={toggleReveal}
          className="glow-ring glow-ring-hover flex w-full items-center gap-2 rounded-xl border border-sidebar-border bg-surface px-4 py-2.5 text-sm font-medium"
        >
          {password ? <EyeOff className="h-4 w-4 text-neon" /> : <Eye className="h-4 w-4 text-neon" />}
          {password ? "Ocultar Senha" : "Revelar Senha"}
        </button>
        {password && (
          <p className="break-all rounded-lg border border-border bg-background px-3 py-2 font-mono text-[11px] text-neon">
            {password}
          </p>
        )}

        <div className="px-1">
          <p className="truncate text-[11px] text-muted-foreground">{email}</p>
          {plan && (
            <p className="text-[11px] text-muted-foreground">
              Plano: <span className="text-neon">{planLabel[plan] ?? plan}</span>
            </p>
          )}
          {usage && (
            <p className="text-[11px] text-muted-foreground">
              {usage.used}/{usage.limit} mensagens hoje
            </p>
          )}
        </div>

        <button
          onClick={onSignOut}
          className="glow-ring glow-ring-hover flex w-full items-center gap-2 rounded-xl border border-sidebar-border bg-background px-4 py-2.5 text-sm"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </aside>
  );
}
