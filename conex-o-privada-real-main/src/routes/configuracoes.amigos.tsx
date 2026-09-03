import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Heart, UserRound } from "lucide-react";
import { useState } from "react";
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

function ProfileList({
  profiles,
  following,
  onToggleFollow,
}: {
  profiles: ReturnType<typeof useProfiles>["profiles"];
  following: (id: string) => boolean;
  onToggleFollow: (id: string) => void;
}) {
  if (profiles.length === 0) {
    return <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">Nenhum perfil nesta lista ainda.</p>;
  }

  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
      {profiles.map((profile) => (
        <div
          key={profile.id}
          className="flex min-h-16 items-center gap-3 px-3 py-3 transition-colors hover:bg-surface-2"
        >
          <Link
            to="/perfil/$id"
            params={{ id: profile.id }}
            className="flex min-w-0 flex-1 items-center gap-3"
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
          </Link>
          <button
            type="button"
            aria-label={following(profile.id) ? `Deixar de seguir ${profile.nick}` : `Seguir ${profile.nick}`}
            title={following(profile.id) ? "Deixar de seguir" : "Seguir"}
            onClick={() => onToggleFollow(profile.id)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary-glow transition-colors hover:bg-surface-2"
          >
            <Heart className={`h-5 w-5 ${following(profile.id) ? "fill-current" : ""}`} />
          </button>
        </div>
      ))}
    </div>
  );
}

function ConnectionsPage() {
  const { profiles, currentId, isFollowing, toggleFollow } = useProfiles();
  const [unfollowedIds, setUnfollowedIds] = useState<string[]>([]);
  const mockConnections = profiles.filter((profile) => profile.id !== currentId);
  const followers = mockConnections.slice(0, 5);
  const following = mockConnections.slice(2, 7).filter((profile) => !unfollowedIds.includes(profile.id));

  const handleToggleFollow = (id: string, isFollowingList: boolean) => {
    toggleFollow(id);
    if (isFollowingList && isFollowing(id)) {
      setUnfollowedIds((ids) => [...ids, id]);
    }
  };

  return (
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
          <ProfileList profiles={followers} following={isFollowing} onToggleFollow={(id) => handleToggleFollow(id, false)} />
        </TabsContent>
        <TabsContent value="seguindo" className="mt-4">
          <ProfileList profiles={following} following={() => true} onToggleFollow={(id) => handleToggleFollow(id, true)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
