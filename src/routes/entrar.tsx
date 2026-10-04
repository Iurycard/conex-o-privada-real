import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { authRequest } from "@/lib/d1-client";
import { useAuth, type AuthUser } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/entrar")({
  head: () => ({
    meta: [
      { title: "Entrar — Conexão Privada" },
      { name: "description", content: "Acesse sua conta da Conexão Privada com e-mail e senha." },
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
  const { user, refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/feed", replace: true });
  }, [navigate, user]);

  const signIn = async () => {
    if (!email.trim() || !password) {
      toast.error("Preencha e-mail e senha");
      return;
    }
    setBusy(true);
    const { error } = await authRequest<AuthUser>("/api/auth/login", {
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message || "Não foi possível entrar. Tente novamente.");
      return;
    }
    window.dispatchEvent(new Event("cp:auth-changed"));
    await refresh();
    toast.success("Bem-vindo de volta");
    navigate({ to: "/feed" });
  };

  const sendPasswordReset = () => toast.error("A recuperação exige configurar um provedor de e-mail");

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/70 bg-background/85 px-4 backdrop-blur-xl">
        <Link to="/" aria-label="Voltar" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-sm font-semibold">Entrar</h1>
      </header>

      <main className="mx-auto w-full max-w-sm px-5 pb-16 pt-10">
        <h2 className="text-2xl font-semibold"><span className="text-gradient-gold">Bem-vindo de volta</span></h2>
        <p className="mt-2 text-sm text-muted-foreground">Acesse sua conta para ver o feed, eventos e conversas.</p>
        <div className="mt-8 space-y-4">
          <div>
            <Label htmlFor="email" className="text-sm">E-mail</Label>
            <div className="relative mt-2">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@email.com" className="border-border bg-surface pl-9" />
            </div>
          </div>
          <div>
            <Label htmlFor="password" className="text-sm">Senha</Label>
            <div className="relative mt-2">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void signIn()} placeholder="••••••••" className="border-border bg-surface pl-9" />
            </div>
          </div>
        </div>
        <button type="button" onClick={() => void signIn()} disabled={busy} className="mt-7 w-full rounded-full bg-gradient-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-neon disabled:opacity-60">
          {busy ? "Entrando…" : "Entrar"}
        </button>
        <button type="button" onClick={sendPasswordReset} className="mt-3 w-full text-center text-xs font-medium text-primary-glow hover:underline">
          Esqueci minha senha
        </button>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Ainda não tem conta? <Link to="/cadastro" className="font-semibold text-primary-glow">Criar perfil discreto</Link>
        </p>
      </main>
    </div>
  );
}