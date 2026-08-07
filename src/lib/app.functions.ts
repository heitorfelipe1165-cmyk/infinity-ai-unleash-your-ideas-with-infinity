import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { FREE_DAILY_LIMIT } from "@/lib/plans";

export const OWNER_EMAIL = "heitorfelipe1165@gmail.com";

export type AccountState = {
  userId: string;
  email: string;
  fullName: string | null;
  isAdmin: boolean;
  subscriptionStatus: string;
  /** Status da última solicitação: null | pending | approved | rejected | finalized | banned */
  requestStatus: string | null;
  /** Plano da última solicitação: null | free | pro | infinite */
  plan: string | null;
  /** Conta suspensa pelo administrador */
  isBanned: boolean;
  /** Chave PIX liberada para exibição (aprovado, aguardando confirmação do pagamento) */
  pixUnlocked: boolean;
  /** Mensagens enviadas hoje (usado no plano grátis) */
  usedToday: number;
  freeLimit: number;
  /** Plano grátis atingiu o limite diário de mensagens */
  freeLimitReached: boolean;
  hasAccess: boolean;
};



/**
 * Garante que o perfil exista, aplica o cargo de Dono/Administrador ao e-mail
 * do proprietário e devolve o estado de acesso do usuário.
 */
export const getAccountState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AccountState> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;
    const email = String((context.claims as { email?: string }).email ?? "").toLowerCase();
    const isOwner = email === OWNER_EMAIL;

    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, subscription_status")
      .eq("id", userId)
      .maybeSingle();

    let fullName = existing?.full_name ?? null;
    let subscriptionStatus = existing?.subscription_status ?? "inactive";

    if (!existing) {
      subscriptionStatus = isOwner ? "active" : "inactive";
      await supabaseAdmin
        .from("profiles")
        .insert({ id: userId, email, subscription_status: subscriptionStatus });
    }

    if (isOwner) {
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
      if (subscriptionStatus !== "active") {
        await supabaseAdmin
          .from("profiles")
          .update({ subscription_status: "active" })
          .eq("id", userId);
        subscriptionStatus = "active";
      }
    } else {
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userId, role: "user" }, { onConflict: "user_id,role" });
    }

    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const isAdmin = (roles ?? []).some((r) => r.role === "admin");

    const { data: lastRequest } = await supabaseAdmin
      .from("subscriptions")
      .select("status, name, plan")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const requestStatus = lastRequest?.status ?? null;
    const plan = lastRequest?.plan ?? null;
    if (!fullName && lastRequest?.name) fullName = lastRequest.name;

    const isBanned =
      !isAdmin && (subscriptionStatus === "banned" || requestStatus === "banned");

    // Contagem de mensagens do dia — usada para o limite do plano grátis.
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { count } = await supabaseAdmin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("role", "user")
      .gte("created_at", startOfDay.toISOString());

    const usedToday = count ?? 0;
    const isFree = plan === "free";
    const freeLimitReached = !isAdmin && isFree && usedToday >= FREE_DAILY_LIMIT;

    return {
      userId,
      email,
      fullName,
      isAdmin,
      subscriptionStatus,
      requestStatus,
      plan,
      isBanned,
      usedToday,
      freeLimit: FREE_DAILY_LIMIT,
      freeLimitReached,
      pixUnlocked: !isAdmin && !isBanned && requestStatus === "approved",
      hasAccess:
        isAdmin || (!isBanned && requestStatus === "finalized" && !freeLimitReached),
    };
  });

/** Ativa o plano grátis: acesso imediato ao chat com limite diário de mensagens. */
export const startFreePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;
    const email = String((context.claims as { email?: string }).email ?? "").toLowerCase();

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, subscription_status")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.subscription_status === "banned") throw new Error("Sua conta foi suspensa");

    const { error } = await supabaseAdmin.from("subscriptions").insert({
      user_id: userId,
      email,
      name: profile?.full_name ?? email,
      plan: "free",
      status: "finalized",
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("profiles")
      .update({ subscription_status: "active" })
      .eq("id", userId);

    return { ok: true };
  });


/** O cliente confirma que já realizou o PIX, liberando o chat. */
export const finalizePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: last } = await context.supabase
      .from("subscriptions")
      .select("id, status")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!last) throw new Error("Nenhuma solicitação encontrada");
    if (last.status === "banned") throw new Error("Sua conta foi suspensa");
    if (last.status !== "approved" && last.status !== "finalized") {
      throw new Error("Aguarde a aprovação do administrador");
    }

    const { error } = await context.supabase
      .from("subscriptions")
      .update({ status: "finalized" })
      .eq("id", last.id);
    if (error) throw new Error(error.message);

    return { ok: true };
  });


export const createPaymentRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ fullName: z.string().min(3).max(120) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const email = String((context.claims as { email?: string }).email ?? "").toLowerCase();
    const { error } = await context.supabase.from("subscriptions").insert({
      user_id: context.userId,
      name: data.fullName,
      email,
      status: "pending",
    });
    if (error) throw new Error(error.message);

    await context.supabase
      .from("profiles")
      .update({ full_name: data.fullName })
      .eq("id", context.userId);

    return { ok: true };
  });

export type AdminRequestRow = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  status: string;
  created_at: string;
  subscription_status: string;
};

export const listPaymentRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminRequestRow[]> => {
    const { data: adminRole } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRole) throw new Error("Acesso restrito ao administrador");


    const { data: requests, error } = await context.supabase
      .from("subscriptions")
      .select("id, user_id, name, email, status, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: profiles } = await context.supabase
      .from("profiles")
      .select("id, subscription_status");

    const statusById = new Map((profiles ?? []).map((p) => [p.id, p.subscription_status]));

    return (requests ?? []).map(({ name, ...r }) => ({
      ...r,
      full_name: name,
      subscription_status: statusById.get(r.user_id) ?? "inactive",
    }));
  });

async function assertAdmin(supabase: {
  from: (t: string) => any;
}, userId: string) {
  const { data: adminRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!adminRole) throw new Error("Acesso restrito ao administrador");
}

export const decidePaymentRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        requestId: z.string().uuid(),
        decision: z.enum(["approve", "reject", "vip"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    const { data: request, error } = await context.supabase
      .from("subscriptions")
      .select("id, user_id")
      .eq("id", data.requestId)
      .single();
    if (error || !request) throw new Error("Solicitação não encontrada");

    const status =
      data.decision === "approve"
        ? "approved"
        : data.decision === "vip"
          ? "finalized"
          : "rejected";

    await context.supabase.from("subscriptions").update({ status }).eq("id", request.id);
    await context.supabase
      .from("profiles")
      .update({ subscription_status: status === "rejected" ? "inactive" : "active" })
      .eq("id", request.user_id);

    return { ok: true };
  });

export type ManagedUser = {
  id: string;
  email: string;
  full_name: string | null;
  status: string;
  created_at: string;
  isBanned: boolean;
};

/** Lista todos os usuários cadastrados para o painel de Controle. */
export const listAllUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ManagedUser[]> => {
    await assertAdmin(context.supabase, context.userId);

    const { data: profiles, error } = await context.supabase
      .from("profiles")
      .select("id, email, full_name, subscription_status, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: subs } = await context.supabase
      .from("subscriptions")
      .select("user_id, status, created_at")
      .order("created_at", { ascending: false });

    const latest = new Map<string, string>();
    for (const sub of subs ?? []) {
      if (!latest.has(sub.user_id)) latest.set(sub.user_id, sub.status);
    }

    return (profiles ?? []).map((p) => {
      const banned = p.subscription_status === "banned" || latest.get(p.id) === "banned";
      return {
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        created_at: p.created_at,
        status: banned ? "banned" : (latest.get(p.id) ?? p.subscription_status),
        isBanned: banned,
      };
    });
  });

/** Banir ou desbanir um usuário. Desbanir libera o chat (status 'finalized'). */
export const setUserBanState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid(), banned: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.userId === context.userId) throw new Error("Você não pode banir a si mesmo");

    const status = data.banned ? "banned" : "finalized";

    await context.supabase
      .from("profiles")
      .update({ subscription_status: data.banned ? "banned" : "active" })
      .eq("id", data.userId);

    const { data: last } = await context.supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", data.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (last) {
      await context.supabase.from("subscriptions").update({ status }).eq("id", last.id);
    } else {
      const { data: profile } = await context.supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", data.userId)
        .maybeSingle();
      await context.supabase.from("subscriptions").insert({
        user_id: data.userId,
        email: profile?.email ?? "",
        name: profile?.full_name ?? "Usuário",
        status,
      });
    }


    return { ok: true };
  });

