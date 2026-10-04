import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authRequest } from "@/lib/d1-client";

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

    const { data: user } = await authRequest<{ id: string; email: string; app_metadata: { role: string } }>("/api/auth/session");
    if (!user) throw redirect({ to: "/entrar" });
    return { user };
  },
  component: () => <Outlet />,
});
