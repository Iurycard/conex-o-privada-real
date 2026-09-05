import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ProfileView } from "@/components/profile-view";
import { useProfiles } from "@/context/profiles-context";

export const Route = createFileRoute("/_authenticated/perfil/")({
  head: () => ({
    meta: [
      { title: "Meu perfil — Conexão Privada" },
      { name: "description", content: "Seu perfil com métricas, linha do tempo, álbum público e álbum privado protegido." },
      { property: "og:title", content: "Meu perfil — Conexão Privada" },
      { property: "og:description", content: "Métricas, bio, publicações e álbuns do seu perfil na Conexão Privada." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { current } = useProfiles();
  return (
    <AppShell>
      <ProfileView profile={current} isOwner />
    </AppShell>
  );
}
