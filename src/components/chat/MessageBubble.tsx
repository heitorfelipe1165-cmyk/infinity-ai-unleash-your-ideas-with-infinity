import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, User } from "lucide-react";
import { DownloadBar } from "./DownloadBar";

export type ChatMessage = { role: "user" | "assistant"; content: string };

type Props = {
  message: ChatMessage;
  streaming?: boolean;
  showDownloads?: boolean;
};

export function MessageBubble({ message, streaming, showDownloads }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="glow-ring mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface">
          <Bot className="h-4 w-4 text-neon" />
        </div>
      )}

      <div
        className={`max-w-[min(46rem,88%)] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "border border-border bg-secondary text-secondary-foreground"
            : "surface-panel"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="space-y-3 [&_a]:text-neon [&_code]:rounded [&_code]:bg-background [&_code]:px-1 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-semibold [&_li]:ml-4 [&_li]:list-disc [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-background [&_pre]:p-3 [&_strong]:text-foreground [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:bg-background [&_th]:px-2 [&_th]:py-1">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            {streaming && (
              <span className="typing-caret inline-block h-4 w-[2px] translate-y-0.5 bg-neon" />
            )}
            {showDownloads && !streaming && message.content.trim().length > 0 && (
              <DownloadBar content={message.content} />
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="glow-ring mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
