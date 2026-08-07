import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound, Loader2, LockKeyhole, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BrandMark } from "@/components/InfinityLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { OWNER_EMAIL } from "@/lib/plans.owner";
import { rememberPassword } from "@/lib/password-vault";


export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar na Infinity AI" },
      {
        name: "description",
        content: "Acesse sua conta Infinity AI ou crie uma nova para conversar com a IA de elite.",
      },
      { property: "og:title", content: "Entrar na Infinity AI" },
      {
        property: "og:description",
        content: "Login e cadastro da Infinity AI com e-mail e senha.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search["mode"] === "signup" ? ("signup" as const) : undefined,
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot" | "code";

function AuthPage() {
  const navigate = useNavigate();
  const { mode: initialMode } = Route.useSearch();
  const [mode, setMode] = useState<Mode>(initialMode === "signup" ? "signup" : "signin");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const recoveringRef = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && !recoveringRef.current) navigate({ to: "/chat", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (recoveringRef.current) return;
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        navigate({ to: "/chat", replace: true });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") {
        recoveringRef.current = true;
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        toast.success("Enviamos um código de verificação para o seu e-mail.");
        setMode("code");
        return;
      }

      if (mode === "code") {
        const { error } = await supabase.auth.verifyOtp({
          email,
          token: code.trim(),
          type: "recovery",
        });
        if (error) throw error;
        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
        if (updateError) throw updateError;
        toast.success("Senha redefinida com sucesso! Faça login novamente.");
        await supabase.auth.signOut();
        recoveringRef.current = false;
        setCode("");
        setNewPassword("");
        setPassword("");
        setMode("signin");
        return;
      }

      if (mode === "signup") {
        if (email.trim().toLowerCase() === OWNER_EMAIL) {
          throw new Error(
            "Esta conta de administrador já existe. Use apenas o login com e-mail e senha.",
          );
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Conta criada! Confirme seu e-mail para acessar.");
          return;
        }
        rememberPassword(email, password);
        toast.success("Conta criada com sucesso!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        rememberPassword(email, password);
        toast.success("Bem-vindo de volta!");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível continuar");
    } finally {
      setLoading(false);
    }
  }

  const titles: Record<Mode, string> = {
    signin: "Entrar na sua conta",
    signup: "Criar sua conta",
    forgot: "Esqueci minha senha",
    code: "Código de verificação",
  };

  const subtitles: Record<Mode, string> = {
    signin: "Use seu e-mail e senha para acessar a Infinity AI.",
    signup: "Cadastre-se com e-mail e senha para começar.",
    forgot: "Informe seu e-mail e enviaremos um código de verificação.",
    code: `Digite o código enviado para ${email || "seu e-mail"} e escolha uma nova senha.`,
  };

  const submitLabels: Record<Mode, string> = {
    signin: "Entrar",
    signup: "Criar conta",
    forgot: "Enviar código",
    code: "Redefinir senha",
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4">
      <div className="hero-glow pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-50" />

      <div className="surface-panel glow-ring relative w-full max-w-md rounded-3xl p-8 shadow-[0_0_50px_-20px_var(--violet)]">
        <div className="flex items-center justify-between gap-3">
          <BrandMark to="/" />
          <ThemeToggle />
        </div>

        <h1 className="mt-8 text-2xl font-bold">{titles[mode]}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{subtitles[mode]}</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {mode !== "code" && (
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">E-mail</span>
              <div className="glow-ring glow-ring-hover mt-1.5 flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2.5 focus-within:border-neon">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            </label>
          )}

          {(mode === "signin" || mode === "signup") && (
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Senha</span>
              <div className="glow-ring glow-ring-hover mt-1.5 flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2.5 focus-within:border-neon">
                <LockKeyhole className="h-4 w-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Revelar senha"}
                  className="text-muted-foreground transition-colors hover:text-neon"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
          )}

          {mode === "code" && (
            <>
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Código de verificação</span>
                <div className="glow-ring glow-ring-hover mt-1.5 flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2.5 focus-within:border-neon">
                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                  <input
                    inputMode="numeric"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="000000"
                    className="w-full bg-transparent text-sm tracking-[0.3em] outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Nova senha</span>
                <div className="glow-ring glow-ring-hover mt-1.5 flex items-center gap-2 rounded-xl border border-input bg-background px-3 py-2.5 focus-within:border-neon">
                  <LockKeyhole className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </label>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="glow-ring bg-gradient-neon inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-primary-foreground hover:shadow-[0_0_28px_-6px_var(--violet)] disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitLabels[mode]}
          </button>
        </form>

        {mode === "signin" && (
          <button
            type="button"
            onClick={() => setMode("forgot")}
            className="mt-4 w-full text-center text-xs font-medium text-neon transition-opacity hover:opacity-80"
          >
            Esqueci Minha Senha
          </button>
        )}

        {(mode === "forgot" || mode === "code") && (
          <button
            type="button"
            onClick={() => {
              recoveringRef.current = false;
              setMode(mode === "code" ? "forgot" : "signin");
            }}
            className="mt-4 w-full text-center text-xs text-muted-foreground transition-colors hover:text-neon"
          >
            {mode === "code" ? "Reenviar para outro e-mail" : "Voltar para o login"}
          </button>
        )}

        {(mode === "signin" || mode === "signup") && (
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-6 w-full text-center text-xs text-muted-foreground transition-colors hover:text-neon"
          >
            {mode === "signin" ? "Não tem conta? Cadastre-se" : "Já possui conta? Faça login"}
          </button>
        )}
      </div>
    </main>
  );
}

