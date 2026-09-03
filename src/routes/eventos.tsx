import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarDays, MapPin, Users, Star, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MediaBlock, PageHeader, VipBadge } from "@/components/bits";
import { events } from "@/lib/mock-data";
import { toast } from "sonner";
import coverVeludo from "@/assets/event-veludo.jpg";
import coverRooftop from "@/assets/event-rooftop.jpg";
import coverLitoral from "@/assets/event-litoral.jpg";
import coverDourado from "@/assets/event-dourado.jpg";

const covers: Record<string, string> = {
  e1: coverVeludo,
  e2: coverRooftop,
  e3: coverLitoral,
  e4: coverDourado,
};

export const Route = createFileRoute("/eventos")({
  head: () => ({
    meta: [
      { title: "Eventos & Baladas — Conexão Privada" },
      { name: "description", content: "Festas e eventos de produtoras e casas parceiras, com confirmação de presença em tempo real." },
      { property: "og:title", content: "Eventos & Baladas — Conexão Privada" },
      { property: "og:description", content: "Agenda de festas e encontros com lista de presenças ao vivo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EventsPage,
});

type Status = "none" | "going" | "interested";

function EventCard({ id }: { id: string }) {
  const ev = events.find((e) => e.id === id)!;
  const [status, setStatus] = useState<Status>("none");

  const going = ev.going + (status === "going" ? 1 : 0);
  const interested = ev.interested + (status === "interested" ? 1 : 0);

  return (
    <article
      className={`overflow-hidden rounded-xl border bg-surface ${ev.vip ? "border-gold/35" : "border-border"}`}
    >
      <div className="relative">
        {covers[ev.id] ? (
          <img
            src={covers[ev.id]}
            alt={`Ambiente do evento ${ev.title}`}
            loading="lazy"
            width={1024}
            height={576}
            className="aspect-[16/9] w-full object-cover"
          />
        ) : (
          <MediaBlock hue={ev.hue} className="aspect-[16/9] w-full" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
        <div className="absolute left-3 top-3 flex gap-2">
          {ev.vip && <VipBadge />}
          <span className="rounded-full bg-background/70 px-2 py-0.5 text-[10px] backdrop-blur">
            {ev.host}
          </span>
        </div>
        <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-background/80 px-2.5 py-1 text-[11px] backdrop-blur">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-glow" />
          {going} confirmados
        </div>
      </div>

      <div className="p-4">
        <h2 className="text-lg font-semibold">{ev.title}</h2>
        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" /> {ev.date}
          </p>
          <p className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> {ev.place}
          </p>
          <p className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> {interested} interessados
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {ev.tags.map((t) => (
            <span key={t} className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[10px] text-muted-foreground">
              {t}
            </span>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setStatus(status === "going" ? "none" : "going");
              if (status !== "going") toast.success(`Presença confirmada em ${ev.title}`);
            }}
            className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-opacity ${
              status === "going"
                ? "bg-gradient-primary text-primary-foreground shadow-neon"
                : "border border-border bg-surface-2 text-foreground hover:opacity-90"
            }`}
          >
            Vou
          </button>
          <button
            onClick={() => setStatus(status === "interested" ? "none" : "interested")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium ${
              status === "interested"
                ? "border border-gold/50 bg-gold/10 text-gold"
                : "border border-border bg-surface-2 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Star className={`h-4 w-4 ${status === "interested" ? "fill-current" : ""}`} /> Tenho interesse
          </button>
        </div>
      </div>
    </article>
  );
}

function EventsPage() {
  return (
    <AppShell>
      <PageHeader title="Eventos & Baladas" subtitle="Produtoras e casas parceiras divulgando as próximas festas" />

      <div className="px-4 md:px-0">
        <button
          onClick={() => toast("Área de produtores — protótipo visual")}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface py-3 text-sm text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-4 w-4" /> Sou produtor — divulgar evento
        </button>
      </div>

      <div className="grid gap-4 px-4 pb-6 md:grid-cols-2 md:px-0">
        {events.map((e) => (
          <EventCard key={e.id} id={e.id} />
        ))}
      </div>
    </AppShell>
  );
}
