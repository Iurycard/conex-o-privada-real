import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Heart, UserPlus, CalendarDays, MessageCircle, Lock, Bell } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AvatarOrb, PageHeader } from "@/components/bits";
import { useProfiles } from "@/context/profiles-context";

export const Route = createFileRoute("/_authenticated/notificacoes")({
  head: () => ({
    meta: [
      { title: "Notificações — Conexão Privada" },
      { name: "description", content: "Curtidas, novos seguidores, convites de eventos e mensagens do seu perfil." },
      { property: "og:title", content: "Notificações — Conexão Privada" },
      { property: "og:description", content: "Curtidas, seguidores, convites e mensagens em um só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NotificationsPage,
});

const iconByType: Record<string, { icon: typeof Heart; tint: string }> = {
  like: { icon: Heart, tint: "text-primary-glow" },
  follow: { icon: UserPlus, tint: "text-foreground" },
  event: { icon: CalendarDays, tint: "text-gold" },
  message: { icon: MessageCircle, tint: "text-primary-glow" },
  album_request: { icon: Lock, tint: "text-gold" },
  album_response: { icon: Lock, tint: "text-gold" },
};

function timeAgo(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.floor(h / 24)} d`;
}

function NotificationsPage() {
  const { profiles, currentId } = useProfiles();
  const items = profiles.filter((p) => p.id !== currentId).slice(0, 8);

  return (
    <AppShell>
      <PageHeader title="Notificações" subtitle="Atividade recente da sua rede" />

      <div className="space-y-2 px-4 pb-6 md:px-0">
        {items.map((p, i) => {
          const kind = kinds[i % kinds.length]!;
          const Icon = kind.icon;
          return (
            <Link
              key={p.id}
              to="/perfil/$id"
              params={{ id: p.id }}
              className={`flex items-center gap-3 rounded-xl border bg-surface p-3 transition-colors hover:border-primary/50 ${
                i < 2 ? "border-primary/30" : "border-border"
              }`}
            >
              <AvatarOrb profile={p} size={44} />
              <span className="min-w-0 flex-1 text-sm">
                <span className="font-medium">{actor?.nick ?? "Alguém"}</span>{" "}
                <span className="text-muted-foreground">{n.body}</span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</span>
              </span>
              <Icon className={`h-4 w-4 shrink-0 ${kind.tint}`} />
            </>
          );
          const className = `flex items-center gap-3 rounded-xl border bg-surface p-3 transition-colors hover:border-primary/50 ${
            n.read ? "border-border" : "border-primary/30"
          }`;
          return n.actor_id ? (
            <Link key={n.id} to="/perfil/$id" params={{ id: n.actor_id }} className={className}>
              {body}
            </Link>
          ) : (
            <div key={n.id} className={className}>
              {body}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
