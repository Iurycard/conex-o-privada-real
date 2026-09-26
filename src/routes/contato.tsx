import { createFileRoute, Link } from "@tanstack/react-router";
import type { FormEvent } from "react";

export const Route = createFileRoute("/contato")({
  component: ContactPage,
});

const SUPPORT_EMAIL = "suporte@conexaoprivada.com.br";

function ContactPage() {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const subject = encodeURIComponent("Solicitação de suporte - Conexão Privada");
    const body = encodeURIComponent(
      `Nome: ${formData.get("name")}\nE-mail: ${formData.get("email")}\n\nSolicitação:\n${formData.get("request")}`,
    );
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  }

  return (
    <main className="min-h-screen bg-background px-5 py-16 text-foreground">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="text-sm text-primary-glow underline underline-offset-4">Voltar ao início</Link>
        <h1 className="mt-8 text-3xl font-semibold">Contato com suporte</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Conte como podemos ajudar. Nossa equipe receberá sua solicitação por e-mail.
        </p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block text-sm font-medium">
            Nome
            <input name="name" required autoComplete="name" className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-primary" />
          </label>
          <label className="block text-sm font-medium">
            E-mail
            <input name="email" type="email" required autoComplete="email" className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-primary" />
          </label>
          <label className="block text-sm font-medium">
            Solicitação
            <textarea name="request" required rows={6} className="mt-2 w-full resize-y rounded-md border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-primary" />
          </label>
          <button type="submit" className="rounded-full bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-neon transition-opacity hover:opacity-90">
            Enviar solicitação
          </button>
        </form>
      </div>
    </main>
  );
}