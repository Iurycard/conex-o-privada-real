import { useState } from "react";
import { CalendarDays, MapPin, Users, Star } from "lucide-react";
import { MediaBlock, VipBadge } from "@/components/bits";
import { events } from "@/lib/mock-data";
import { eventCovers } from "@/lib/event-covers";
import { toast } from "sonner";

type Status = "none" | "going" | "interested";

export function EventCard({ id }: { id: string }) {
  const ev = events.find((e) => e.id === id)!;
  const [status, setStatus] = useState<Status>("none");

  const going = ev.going + (status === "going" ? 1 : 0);
  const interested = ev.interested + (status === "interested" ? 1 : 0);

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-surface ${ev.vip ? "border-gold/35" : "border-border"}`}
    >
      <div className="relative">
        {eventCovers[ev.id] ? (
          <img
            src={eventCovers[ev.id]}
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
          <span className="rounded-full bg-background/70 px-2 py-0.5 text-[10px] backdrop-blur">{ev.host}</span>
        </div>
        <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-background/80 px-2.5 py-1 text-[11px] backdrop-blur">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-glow" />
          {going} confirmados
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-lg font-semibold">{ev.title}</h3>
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
            <span
              key={t}
              className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[10px] text-muted-foreground"
            >
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
