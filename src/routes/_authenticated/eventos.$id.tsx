import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, MapPin, Star, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AvatarOrb, MediaBlock, VipBadge } from "@/components/bits";
import { eventCovers } from "@/lib/event-covers";
import { useEvents } from "@/lib/use-events";
import { useProfiles } from "@/context/profiles-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/eventos/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes do evento — Conexão Privada" },
      { name: "description", content: "Veja local, data, descrição e quem confirmou presença neste evento." },
      { property: "og:title", content: "Detalhes do evento — Conexão Privada" },
      { property: "og:description", content: "Local, data, descrição e lista de presenças do evento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EventDetailPage,
});

function EventDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { profiles } = useProfiles();
  const { events, loading, countFor, myStatus, setStatus, attendeeIds } = useEvents();

  const ev = events.find((e) => e.id === id);

  if (loading) {
    return (
      <AppShell>
        <p className="p-6 text-sm text-muted-foreground">Carregando evento…</p>
      </AppShell>
    );
  }

  if (!ev) {
    return (
      <AppShell>
        <div className="p-6 text-center">
          <p className="text-sm text-muted-foreground">Evento não encontrado.</p>
          <Link to="/eventos" className="mt-3 inline-block text-sm font-medium text-primary-glow hover:underline">
            Voltar para eventos
          </Link>
        </div>
      </AppShell>
    );
  }

  const cover = ev.cover_key ? eventCovers[ev.cover_key] : undefined;
  const status = myStatus(ev.id);
  const goingProfiles = attendeeIds(ev.id, "going")
    .map((uid) => profiles.find((p) => p.id === uid))
    .filter((p): p is NonNullable<typeof p> => !!p);

  return (
    <AppShell>
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/85 px-3 py-2 backdrop-blur">
        <button
          onClick={() => navigate({ to: "/eventos" })}
          aria-label="Voltar"
          className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{ev.title}</p>
        {ev.vip && <VipBadge />}
      </header>

      <div className="relative">
        {cover ? (
          <img
            src={cover}
            alt={`Ambiente do evento ${ev.title}`}
            width={1024}
            height={576}
            className="aspect-[16/9] w-full object-cover"
          />
        ) : (
          <MediaBlock hue={ev.hue} className="aspect-[16/9] w-full" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
      </div>

      <div className="space-y-4 px-4 pb-8 pt-4 md:px-0">
        <div>
          <h1 className="text-2xl font-semibold">{ev.title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">por {ev.host}</p>
        </div>

        <div className="space-y-1.5 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary-glow" /> {ev.date_text}
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary-glow" /> {ev.place}
          </p>
          <p className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary-glow" /> {countFor(ev, "going")} confirmados ·{" "}
            {countFor(ev, "interested")} interessados
          </p>
        </div>

        {ev.description && <p className="text-sm leading-relaxed text-foreground/90">{ev.description}</p>}

        <div className="flex flex-wrap gap-1.5">
          {ev.tags.map((t) => (
            <span key={t} className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] text-muted-foreground">
              {t}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              void setStatus(ev.id, "going");
              if (status !== "going") toast.success(`Presença confirmada em ${ev.title}`);
            }}
            className={`rounded-full px-4 py-3 text-sm font-semibold ${
              status === "going"
                ? "bg-gradient-primary text-primary-foreground shadow-neon"
                : "border border-border bg-surface-2 text-foreground"
            }`}
          >
            Vou
          </button>
          <button
            onClick={() => void setStatus(ev.id, "interested")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-3 text-sm font-medium ${
              status === "interested"
                ? "border border-gold/50 bg-gold/10 text-gold"
                : "border border-border bg-surface-2 text-muted-foreground"
            }`}
          >
            <Star className={`h-4 w-4 ${status === "interested" ? "fill-current" : ""}`} /> Tenho interesse
          </button>
        </div>

        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Quem vai</h2>
          {goingProfiles.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">Ninguém confirmou ainda. Seja o primeiro!</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-3">
              {goingProfiles.map((p) => (
                <Link key={p.id} to="/perfil/$id" params={{ id: p.id }} className="flex w-16 flex-col items-center gap-1">
                  <AvatarOrb profile={p} size={48} />
                  <span className="w-full truncate text-center text-[11px] text-muted-foreground">{p.nick}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
