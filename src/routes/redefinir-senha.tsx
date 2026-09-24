import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({
    meta: [{ title: "Redefinir senha — Conexão Privada" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);

  const updatePassword = async () => {
    if (password.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres");
      return;
    }
    if (password !== confirmation) {
      toast.error("As senhas não coincidem");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error("O link expirou. Solicite uma nova recuperação");
      return;
    }
    toast.success("Senha atualizada com sucesso");
    navigate({ to: "/entrar" });
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
        <p className="mt-2 text-sm text-muted-foreground">Escolha uma senha nova para voltar à sua conta.</p>
        <div className="mt-8 space-y-4">
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
