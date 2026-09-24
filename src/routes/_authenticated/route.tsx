import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const shouldBypassAuth = import.meta.env.DEV && import.meta.env["VITE_SKIP_AUTH"] === "true";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (shouldBypassAuth) {
      return {
        user: {
          id: "dev-user",
          email: "dev@local.test",
        },
      };
    }

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/entrar" });
    return { user: data.user };
  },
  component: () => <Outlet />,
});
