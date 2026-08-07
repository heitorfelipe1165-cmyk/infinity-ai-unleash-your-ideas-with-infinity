import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AccountLoadingScreen } from "@/components/AccountLoadingScreen";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  pendingComponent: AccountLoadingScreen,
  component: () => <Outlet />,
});
