import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { AvatarOrb, VipBadge } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { useProfiles } from "@/context/profiles-context";

export const Route = createFileRoute("/_authenticated/configuracoes/bloqueados")({
  head: () => ({
    meta: [
      { title: "Perfis bloqueados — Conexão Privada" },
      { name: "description", content: "Gerencie os perfis bloqueados da sua conta." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BlockedProfilesPage,
});

function BlockedProfilesPage() {
  const { profiles, currentId, blockedIds, unblockProfile } = useProfiles();
  const blockedProfiles = profiles.filter((profile) => profile.id !== currentId && blockedIds.includes(profile.id));

  const handleUnblock = (nick: string, id: string) => {
    unblockProfile(id);
    toast.success(`${nick} desbloqueado`);
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-10 pt-5 md:px-0 md:pt-8">
      <Link
        to="/configuracoes"
        className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm text-muted-foreground hover:bg-surface-2 hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar às configurações
      </Link>

      <header className="mb-6">
        <p className="text-xs font-medium text-primary-glow">Privacidade</p>
        <h1 className="mt-1 text-2xl font-semibold">Perfis bloqueados</h1>
        <p className="mt-1 text-sm text-muted-foreground">Gerencie os perfis que você não deseja ver ou receber mensagens.</p>
      </header>

      {blockedProfiles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface px-5 py-12 text-center">
          <X className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Nenhum perfil bloqueado</p>
          <p className="mt-1 text-xs text-muted-foreground">Você poderá bloquear perfis pelo menu de opções na página de cada perfil.</p>
        </div>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {blockedProfiles.map((profile) => (
            <div key={profile.id} className="flex min-h-20 items-center gap-3 px-4 py-3">
              <AvatarOrb profile={profile} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold">{profile.nick}</p>
                  {profile.vip && <VipBadge />}
                </div>
                <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <UserRound className="h-3 w-3 shrink-0" /> {profile.type} · {profile.city}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleUnblock(profile.nick, profile.id)}
                className="shrink-0 border-border bg-transparent text-xs hover:bg-surface-2"
              >
                Desbloquear
              </Button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
