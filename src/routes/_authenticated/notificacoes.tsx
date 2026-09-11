import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, UserPlus, CalendarDays, MessageCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AvatarOrb, PageHeader } from "@/components/bits";
import { useProfiles } from "@/context/profiles-context";
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

const kinds = [
  { icon: Heart, text: "curtiu sua publicação", tint: "text-primary-glow" },
  { icon: UserPlus, text: "começou a seguir você", tint: "text-foreground" },
  { icon: CalendarDays, text: "convidou você para um evento", tint: "text-gold" },
  { icon: MessageCircle, text: "enviou uma mensagem", tint: "text-primary-glow" },
] as const;

function NotificationsPage() {
  const { profiles, currentId } = useProfiles();
  const { isVip } = useVip();
  const regularItems = profiles.filter((p) => p.id !== currentId).slice(0, 8);
  const visitorItems = profiles.filter((p) => p.id !== currentId).slice(0, 4);

  return (
    <AppShell>
      <PageHeader title="Notificações" subtitle="Atividade recente da sua rede" />

      <div className="space-y-2 px-4 pb-6 md:px-0">
        {!isVip && (
          <div className="rounded-xl border border-border bg-surface p-3">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {visitorItems.map((p) => (
                  <span key={p.id} className="blur-[4px]">
                    <AvatarOrb profile={p} size={32} />
                  </span>
                ))}
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <span className="font-medium text-foreground">alguém</span>{" "}
                <span className="text-muted-foreground">olhou seu perfil</span>
              </div>
            </div>
          </div>
        )}

        {isVip &&
          visitorItems.map((p, i) => (
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

        {regularItems.map((p, i) => {
          const kind = kinds[i % kinds.length]!;
          const Icon = kind.icon;
          return (
            <Link
              key={`${p.id}-${kind.text}`}
              to="/perfil/$id"
              params={{ id: p.id }}
              className={`flex items-center gap-3 rounded-xl border bg-surface p-3 transition-colors hover:border-primary/50 ${
                i < 2 ? "border-primary/30" : "border-border"
              }`}
            >
              <AvatarOrb profile={p} size={44} />
              <span className="min-w-0 flex-1 text-sm">
                <span className="font-medium">{p.nick}</span>{" "}
                <span className="text-muted-foreground">{kind.text}</span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">há {i + 1} h</span>
              </span>
              <Icon className={`h-4 w-4 shrink-0 ${kind.tint}`} />
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
