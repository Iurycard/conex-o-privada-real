import { createFileRoute, Link } from "@tanstack/react-router";
import { CloudSun } from "lucide-react";

export const Route = createFileRoute("/saida")({
  head: () => ({
    meta: [
      { title: "Previsão do tempo" },
      { name: "description", content: "Condições do tempo para hoje na sua região." },
      { property: "og:title", content: "Previsão do tempo" },
      { property: "og:description", content: "Condições do tempo para hoje na sua região." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SafeExit,
});

function SafeExit() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center">
        <CloudSun className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-semibold">27°C · Parcialmente nublado</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Máxima de 29°C, mínima de 19°C. Sem previsão de chuva para hoje.
        </p>
        <Link
          to="/feed"
          className="mt-6 inline-flex rounded-full border border-border px-5 py-2 text-xs text-muted-foreground hover:text-foreground"
        >
          Voltar ao app
        </Link>
      </div>
    </div>
  );
}
