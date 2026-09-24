import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Heart, UserPlus, CalendarDays, MessageCircle, Lock, Bell, Eye } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AvatarOrb, PageHeader } from "@/components/bits";
import { useProfiles } from "@/context/profiles-context";
import { useSocial } from "@/hooks/use-social";
import { useVip } from "@/context/vip";

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
  comment: { icon: MessageCircle, tint: "text-primary-glow" },
  visit: { icon: Eye, tint: "text-foreground" },
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
  const { notifications, markNotificationsRead } = useSocial();
  const { profiles, currentId } = useProfiles();
  const { isVip, openVipModal } = useVip();

  useEffect(() => {
    void markNotificationsRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visitorItems = profiles.filter((p) => p.id !== currentId).slice(0, 4);

  return (
    <AppShell>
      <PageHeader title="Notificações" subtitle="Atividade recente da sua rede" />

      <div className="space-y-4 px-4 pb-6 md:px-0">
        {/* Bloco de Visualização de Perfil (Quem olhou seu perfil) */}
        {!isVip ? (
          <button
            type="button"
            onClick={openVipModal}
            className="w-full rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-primary/50"
            aria-label="Abrir informações do VIP sobre visitantes do perfil"
          >
            <span className="text-sm text-muted-foreground">Alguém visitou seu perfil</span>
          </button>
        ) : (
          <div className="grid gap-2">
            {visitorItems.map((p, i) => (
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
                  <span className="font-medium">{p.nick}</span>{" "}
                  <span className="text-muted-foreground">olhou seu perfil</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">há {i + 1} h</span>
                </span>
                <Heart className="h-4 w-4 shrink-0 text-primary-glow" />
              </Link>
            ))}
          </div>
        )}

        {/* Lista de Notificações Reais do Banco de Dados */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface py-12 text-center">
            <Bell className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhuma notificação por enquanto.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const actor = profiles.find((p) => p.id === n.actor_id);
              const kind = iconByType[n.type] ?? { icon: Bell, tint: "text-muted-foreground" };
              const Icon = kind.icon;

              if (n.type === "visit" && !isVip) {
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={openVipModal}
                    className={`flex w-full items-center gap-3 rounded-xl border bg-surface p-3 text-left transition-colors hover:border-primary/50 ${
                      n.read ? "border-border" : "border-primary/30"
                    }`}
                    aria-label="Abrir informações do VIP sobre quem visitou seu perfil"
                  >
                    <span className="min-w-0 flex-1 text-sm text-muted-foreground">Alguém visitou seu perfil</span>
                    <Icon className={`h-4 w-4 shrink-0 ${kind.tint}`} />
                  </button>
                );
              }
              
              const body = (
                <>
                  <AvatarOrb profile={actor ?? { id: n.actor_id ?? `notification-${n.id}`, nick: "?", hue: 300, vip: false, avatar: null }} size={44} />
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
                <Link key={n.id} to="/perfil/$id" params={{ id: n.actor_id! }} className={className}>
                  {body}
                </Link>
              ) : (
                <div key={n.id} className={className}>
                  {body}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
