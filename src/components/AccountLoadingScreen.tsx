import { Loader2 } from "lucide-react";

import { InfinityLogo } from "@/components/InfinityLogo";

export function AccountLoadingScreen() {
  return (
    <main
      className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-full opacity-50" />
      <div className="surface-panel glow-ring relative flex max-w-sm flex-col items-center gap-5 rounded-3xl border border-border p-8 text-center shadow-[0_0_60px_-24px_var(--violet)]">
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-neon/30 bg-background">
          <InfinityLogo className="h-9 w-14 text-neon" />
          <Loader2 className="absolute h-20 w-20 animate-spin text-neon/70" strokeWidth={1} />
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-display text-lg font-semibold text-foreground">
            Sincronizando seu acesso
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Estamos validando sua sessão e assinatura com segurança.
          </p>
        </div>
      </div>
    </main>
  );
}
