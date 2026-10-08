import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Lock } from "lucide-react";
import { toast } from "sonner";
import { authRequest } from "@/lib/d1-client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — Conexão Privada" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search["token"] === "string" ? search["token"] : "",
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token } = Route.useSearch();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);

  const updatePassword = async () => {
    if (password.length < 12 || password.length > 128) {
      toast.error("A senha precisa ter entre 12 e 128 caracteres");
      return;
    }
    if (password !== confirmation) {
      toast.error("As senhas não coincidem");
      return;
    }
    setBusy(true);
    const { error } = token
      ? await authRequest("/api/auth/password-reset/complete", { token, newPassword: password })
      : await authRequest("/api/auth/password", { currentPassword, newPassword: password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Senha atualizada com sucesso");
    navigate({ to: token ? "/entrar" : "/configuracoes" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/70 bg-background/85 px-4 backdrop-blur-xl">
        <Link to="/entrar" aria-label="Voltar" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-sm font-semibold">Redefinir senha</h1>
      </header>
      <main className="mx-auto w-full max-w-sm px-5 pb-16 pt-10">
        <h2 className="text-2xl font-semibold text-foreground">Crie uma nova senha</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {token
            ? "Defina uma nova senha para recuperar o acesso à sua conta."
            : "Confirme sua senha atual para definir uma senha nova."}
        </p>
        <div className="mt-8 space-y-4">
          {!token && (
            <div>
              <Label htmlFor="current-password">Senha atual</Label>
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="border-border bg-surface pl-9" />
              </div>
            </div>
          )}
          <div>
            <Label htmlFor="new-password">Nova senha</Label>
            <div className="relative mt-2">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="border-border bg-surface pl-9" />
            </div>
          </div>
          <div>
            <Label htmlFor="confirm-password">Confirme a senha</Label>
            <Input id="confirm-password" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 border-border bg-surface" />
          </div>
        </div>
        <button onClick={() => void updatePassword()} disabled={busy} className="mt-7 w-full rounded-full bg-gradient-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-neon disabled:opacity-60">
          {busy ? "Salvando..." : "Salvar nova senha"}
        </button>
      </main>
    </div>
  );
}
