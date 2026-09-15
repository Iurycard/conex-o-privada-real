import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { useProfiles } from "@/context/profiles-context";
import { readPendingProfile, clearPendingProfile } from "@/lib/pending-profile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/entrar")({
  head: () => ({
    meta: [
      { title: "Entrar — Conexão Privada" },
      { name: "description", content: "Acesse sua conta da Conexão Privada com e-mail e senha ou pelo Google." },
      { property: "og:title", content: "Entrar — Conexão Privada" },
      { property: "og:description", content: "Acesse sua conta discreta da Conexão Privada." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addProfile } = useProfiles();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    if (!email.trim() || !password) {
      toast.error("Preencha e-mail e senha");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);

    if (error) {
      toast.error(
        error.message.includes("Invalid login")
          ? "E-mail ou senha incorretos"
          : "Não foi possível entrar. Tente novamente."
      );
      return;
    }

    // Processa perfil pendente retido no cadastro local
    const pending = readPendingProfile();
    if (pending && data.user) {
      try {
        await addProfile(pending);
        clearPendingProfile();
      } catch (err) {
        console.error("Erro ao criar perfil pendente:", err);
      }
    }

    toast.success("Bem-vindo de volta");
    navigate({ to: "/feed" });
  };

  const signInWithGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Não foi possível entrar com o Google");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/feed" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/70 bg-background/85 px-4 backdrop-blur-xl">
        <Link to="/" aria-label="Voltar" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-sm font-semibold">Entrar</h1>
      </header>

      <main className="mx-auto w-full max-w-sm px-5 pb-16 pt-10">
        <h2 className="text-2xl font-semibold">
          Bem-vindo de <span className="text-gradient-gold">volta</span>
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Acesse sua conta para ver o feed, eventos e conversas.
        </p>

        <div className="mt-8 space-y-4">
          <div>
            <Label htmlFor="email" className="text-sm">
              E-mail
            </Label>
            <div className="relative mt-2">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                className="border-border bg-surface pl-9"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="password" className="text-sm">
              Senha
            </Label>
            <div className="relative mt-2">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void signIn()}
                placeholder="••••••••"
                className="border-border bg-surface pl-9"
              />
            </div>
          </div>
        </div>

        <button
          onClick={() => void signIn()}
          disabled={busy}
          className="mt-7 w-full rounded-full bg-gradient-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-neon disabled:opacity-60"
        >
          {busy ? "Entrando…" : "Entrar"}
        </button>

        <div className="my-6 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
        </div>

        <button
          onClick={() => void signInWithGoogle()}
          className="w-full rounded-full border border-border bg-surface py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-2"
        >
          Continuar com Google
        </button>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Ainda não tem conta?{" "}
          <Link to="/cadastro" className="font-semibold text-primary-glow">
            Criar perfil discreto
          </Link>
        </p>
      </main>
    </div>
  );
}