/**
 * Cofre local de senha: guarda a senha digitada no login/cadastro apenas neste
 * navegador, para que o botão "Revelar Senha" do chat possa exibi-la.
 * A senha real do Supabase é criptografada e nunca sai do servidor.
 */
const KEY = "infinity-password-vault";

export function rememberPassword(email: string, password: string) {
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ email: email.trim().toLowerCase(), password }),
    );
  } catch {
    /* armazenamento indisponível */
  }
}

export function revealPassword(email: string): string | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { email?: string; password?: string };
    if (saved.email !== email.trim().toLowerCase()) return null;
    return saved.password ?? null;
  } catch {
    return null;
  }
}

export function forgetPassword() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* armazenamento indisponível */
  }
}
