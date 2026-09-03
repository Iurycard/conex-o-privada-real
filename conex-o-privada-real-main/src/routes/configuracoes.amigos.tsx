import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, UserRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AvatarOrb, PageHeader, VipBadge } from "@/components/bits";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProfiles } from "@/context/profiles-context";

export const Route = createFileRoute("/configuracoes/amigos")({
  head: () => ({
    meta: [
      { title: "Amigos e seguidores — Conexão Privada" },
      {
        name: "description",
        content: "Veja os perfis que seguem você e os perfis que você acompanha.",
      },
      { property: "og:title", content: "Amigos e seguidores — Conexão Privada" },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConnectionsPage,
});

function ProfileList({ profiles }: { profiles: ReturnType<typeof useProfiles>["profiles"] }) {
  if (profiles.length === 0) {
    return <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">Nenhum perfil nesta lista ainda.</p>;
  }

  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
      {profiles.map((profile) => (
        <Link
          key={profile.id}
          to="/perfil/$id"
          params={{ id: profile.id }}
          className="flex min-h-16 items-center gap-3 px-3 py-3 transition-colors hover:bg-surface-2"
        >
          <AvatarOrb profile={profile} size={42} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold">{profile.nick}</span>
              {profile.vip && <VipBadge />}
            </span>
            <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <UserRound className="h-3 w-3" /> {profile.type} · {profile.city}
            </span>
          </span>
          <span className="text-xs text-primary-glow">Ver perfil</span>
        </Link>
      ))}
    </div>
  );
}

function ConnectionsPage() {
  const { profiles, currentId } = useProfiles();
  const mockConnections = profiles.filter((profile) => profile.id !== currentId);
  const followers = mockConnections.slice(0, 5);
  const following = mockConnections.slice(2, 7);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-0 md:py-8">
        <Link
          to="/configuracoes"
          className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm text-muted-foreground hover:bg-surface-2 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar às configurações
        </Link>
        <PageHeader title="Amigos e seguidores" subtitle="Acompanhe as conexões da sua rede" />

        <Tabs defaultValue="seguidores" className="mt-2">
          <TabsList className="grid w-full grid-cols-2 bg-surface">
            <TabsTrigger value="seguidores">Seguidores</TabsTrigger>
            <TabsTrigger value="seguindo">Seguindo</TabsTrigger>
          </TabsList>
          <TabsContent value="seguidores" className="mt-4">
            <ProfileList profiles={followers} />
          </TabsContent>
          <TabsContent value="seguindo" className="mt-4">
            <ProfileList profiles={following} />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
