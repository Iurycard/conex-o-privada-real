import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ProfileView } from "@/components/profile-view";
import { useProfiles } from "@/context/profiles-context";

export const Route = createFileRoute("/perfil/$id")({
  head: () => ({
    meta: [
      { title: "Perfil da comunidade — Conexão Privada" },
      { name: "description", content: "Veja bio, métricas, publicações, álbum público e álbum privado de um membro da comunidade." },
      { property: "og:title", content: "Perfil da comunidade — Conexão Privada" },
      { property: "og:description", content: "Bio, selo VIP, linha do tempo e álbuns de um membro da Conexão Privada." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const { id } = Route.useParams();
  const { getProfile, currentId } = useProfiles();
  const profile = getProfile(id);

  if (!profile) {
    return (
      <AppShell>
        <div className="px-4 py-16 text-center md:px-0">
          <p className="text-sm text-muted-foreground">Este perfil não existe mais.</p>
          <Link to="/explorar" className="mt-4 inline-block text-sm text-primary-glow hover:underline">
            Voltar ao Explorar
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <ProfileView profile={profile} isOwner={profile.id === currentId} />
    </AppShell>
  );
}
