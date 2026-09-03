import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

const STORAGE_KEY = "cp:age-confirmed";

export function AgeGate() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) !== "1") setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      className="fixed inset-0 z-[60] grid place-items-center bg-background/90 px-5 backdrop-blur-xl"
    >
      <div className="w-full max-w-sm animate-in fade-in zoom-in-95 rounded-2xl border border-gold/30 bg-surface p-7 text-center shadow-gold duration-300">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-gradient-primary shadow-neon">
          <ShieldCheck className="h-6 w-6 text-primary-foreground" />
        </span>
        <h2 id="age-gate-title" className="mt-5 text-lg font-semibold">
          Conteúdo para maiores de 18 anos
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Este é um ambiente privado para adultos. Ao continuar, você confirma ter 18 anos ou mais
          e concorda com nossas diretrizes de respeito e discrição.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={() => {
              try {
                sessionStorage.setItem(STORAGE_KEY, "1");
              } catch {
                /* ignore */
              }
              setOpen(false);
            }}
            className="rounded-full bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-neon transition-opacity hover:opacity-90"
          >
            Tenho 18 anos ou mais
          </button>
          <a
            href="https://www.google.com"
            className="rounded-full border border-border px-6 py-3 text-sm text-muted-foreground hover:text-foreground"
          >
            Sair
          </a>
        </div>
      </div>
    </div>
  );
}
