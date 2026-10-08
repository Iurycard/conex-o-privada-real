import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

export const Route = createFileRoute("/contato")({
  component: ContactPage,
});

function ContactPage() {
  const [submitting, setSubmitting] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          category: formData.get("category"),
          subject: formData.get("subject"),
          message: formData.get("message"),
        }),
      });
      const payload = await response.json() as { id?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível enviar a solicitação");
      setTicketId(payload.id ?? null);
      form.reset();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Não foi possível enviar a solicitação");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-5 py-16 text-foreground">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="text-sm text-primary-glow underline underline-offset-4">Voltar ao início</Link>
        <h1 className="mt-8 text-3xl font-semibold">Contato com suporte</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Envie uma solicitação para a equipe. Ela ficará registrada para acompanhamento.
        </p>
        {ticketId && (
          <div role="status" className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
            Solicitação registrada. Guarde este protocolo: <strong>{ticketId}</strong>
          </div>
        )}
        {error && <p role="alert" className="mt-6 text-sm text-destructive">{error}</p>}
        <form onSubmit={(event) => void handleSubmit(event)} className="mt-8 space-y-5">
          <label className="block text-sm font-medium">
            Nome
            <input name="name" required autoComplete="name" className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-primary" />
          </label>
          <label className="block text-sm font-medium">
            E-mail
            <input name="email" type="email" required autoComplete="email" className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-primary" />
          </label>
          <label className="block text-sm font-medium">
            Categoria
            <select name="category" defaultValue="general" className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-primary">
              <option value="general">Dúvida geral</option>
              <option value="account">Conta e acesso</option>
              <option value="billing">VIP e pagamentos</option>
              <option value="safety">Segurança e denúncias</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            Assunto
            <input name="subject" required maxLength={160} className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-primary" />
          </label>
          <label className="block text-sm font-medium">
            Solicitação
            <textarea name="message" required minLength={10} maxLength={5000} rows={6} className="mt-2 w-full resize-y rounded-md border border-border bg-surface px-3 py-2.5 text-foreground outline-none focus:border-primary" />
          </label>
          <button type="submit" disabled={submitting} className="rounded-full bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-neon transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? "Enviando…" : "Registrar solicitação"}
          </button>
        </form>
      </div>
    </main>
  );
}