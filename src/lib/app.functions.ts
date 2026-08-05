import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const OWNER_EMAIL = "heitorfelipe1165@gmail.com";

export type AccountState = {
  userId: string;
  email: string;
  fullName: string | null;
  isAdmin: boolean;
  subscriptionStatus: string;
  /** Status da última solicitação de assinatura: null | pending | approved | rejected */
  requestStatus: string | null;
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
      .select("status, name")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const requestStatus = lastRequest?.status ?? null;
    if (!fullName && lastRequest?.name) fullName = lastRequest.name;

    return {
      userId,
      email,
      fullName,
      isAdmin,
      subscriptionStatus,
      requestStatus,
      hasAccess: isAdmin || subscriptionStatus === "active" || requestStatus === "approved",
    };
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

export const decidePaymentRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        requestId: z.string().uuid(),
        approve: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: adminRole } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRole) throw new Error("Acesso restrito ao administrador");


    const { data: request, error } = await context.supabase
      .from("subscriptions")
      .select("id, user_id")
      .eq("id", data.requestId)
      .single();
    if (error || !request) throw new Error("Solicitação não encontrada");

    if (data.approve) {
      await context.supabase
        .from("subscriptions")
        .update({ status: "approved" })
        .eq("id", request.id);
      await context.supabase
        .from("profiles")
        .update({ subscription_status: "active" })
        .eq("id", request.user_id);
    } else {
      await context.supabase
        .from("subscriptions")
        .update({ status: "rejected" })
        .eq("id", request.id);
      await context.supabase
        .from("profiles")
        .update({ subscription_status: "inactive" })
        .eq("id", request.user_id);
    }

    return { ok: true };
  });
