import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import {
  ChevronRight,
  Edit3,
  Eye,
  FileText,
  Image,
  Plus,
  Key,
  Lock,
  MessageCircle,
  Mail,
  MoonStar,
  Phone,
  Shield,
  Star,
  Newspaper,
  UserX,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState, type ComponentType } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useProfiles } from "@/context/profiles-context";
import { useVip } from "@/context/vip";
import { useSocial } from "@/hooks/use-social";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { uploadAlbumPhotos, useAlbumUrls } from "@/lib/album-storage";
import type { Post } from "@/context/profiles-context";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Conexão Privada" },
      {
        name: "description",
        content: "Gerencie perfil, privacidade, segurança, assinatura e preferências da sua conta.",
      },
      { property: "og:title", content: "Configurações — Conexão Privada" },
      {
        property: "og:description",
        content: "Gerencie perfil, privacidade, segurança, assinatura e preferências da sua conta.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

type SettingsIcon = ComponentType<{ className?: string }>;

type SettingsRowProps = {
  icon?: SettingsIcon;
  label: string;
  description?: string;
  value?: string;
  onClick: () => void;
  destructive?: boolean;
};

const general = [
  { icon: Edit3, label: "Editar perfil", description: "Atualize suas informações públicas" },
  { icon: Lock, label: "Permissões e privacidade", description: "Controle quem pode encontrar você" },
  { icon: UserX, label: "Perfis bloqueados", description: "Gerencie perfis que não deseja ver" },
  { icon: Star, label: "Minha assinatura", description: "Veja os benefícios do VIP", vip: true },
];

const security = [
  { icon: Key, label: "Alterar senha", description: "Mantenha sua conta protegida" },
  { icon: Mail, label: "Alterar email", description: "Atualize seu endereço de acesso" },
  { icon: Phone, label: "Alterar telefone", description: "Gerencie o telefone cadastrado" },
];

const others = [
  { icon: MessageCircle, label: "Contato com o suporte" },
  { icon: FileText, label: "Termos de serviço" },
  { icon: Shield, label: "Política de privacidade" },
  { icon: Newspaper, label: "Blog" },
];

const interestOptions = [
  "Casais",
  "Casais (2 mulheres)",
  "Casais (2 homens)",
  "Homens",
  "Homens Trans",
  "Mulheres",
  "Mulheres Trans",
  "Travestis",
  "Cross-dressing (CD)",
];

const wallOptions = [
  "Todos",
  "Perfis de meu interesse, quem eu sigo e eu",
  "Perfis que eu sigo e eu",
  "Apenas eu",
];

const messageOptions = [
  "Todos",
  "Perfis de meu interesse ou que eu sigo",
  "Apenas perfis que eu sigo",
  "Ninguém",
];

function PrivacyRadioGroup({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-3 space-y-1">
      {options.map((option) => (
        <label key={option} className="flex min-h-8 cursor-pointer items-center gap-3 text-xs">
          <span className="flex-1">{option}</span>
          <input
            type="radio"
            name={name}
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
            className="h-4 w-4 shrink-0 cursor-pointer accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </label>
      ))}
    </div>
  );
}

function PrivacyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [interests, setInterests] = useState<string[]>(["Casais", "Mulheres"]);
  const [wallPermission, setWallPermission] = useState(wallOptions[0] ?? "Todos");
  const [messagePermission, setMessagePermission] = useState(messageOptions[0] ?? "Todos");

  const toggleInterest = (interest: string) => {
    setInterests((selected) => selected.includes(interest)
      ? selected.filter((item) => item !== interest)
      : [...selected, interest]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-xl border-border bg-surface px-4 py-5 shadow-2xl sm:max-w-lg sm:px-6">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle>Permissões e privacidade</DialogTitle>
          <DialogDescription>Escolha quem pode interagir com você.</DialogDescription>
        </DialogHeader>

        <div className="space-y-7">
          <section>
            <h2 className="text-sm font-medium leading-tight">Primeiramente, quais são os perfis de seu interesse?</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {interestOptions.map((interest) => {
                const selected = interests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleInterest(interest)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-[11px] transition-colors",
                      selected
                        ? "border-foreground bg-foreground text-background"
                        : "border-muted-foreground/70 text-foreground hover:border-foreground",
                    )}
                  >
                    {interest}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="border-t border-border pt-6">
            <h2 className="text-sm font-medium">Quem pode escrever no seu mural?</h2>
            <PrivacyRadioGroup name="wall-permission" options={wallOptions} value={wallPermission} onChange={setWallPermission} />
          </section>

          <section className="border-t border-border pt-6">
            <h2 className="text-sm font-medium leading-tight">Quem pode lhe enviar mensagens privadas?</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Você ainda poderá enviar mensagens para todos (e estes poderão lhe responder). As mensagens privadas que você já recebeu não serão apagadas nem bloqueadas.
            </p>
            <PrivacyRadioGroup name="message-permission" options={messageOptions} value={messagePermission} onChange={setMessagePermission} />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SettingsRow({ icon: Icon, label, description, value, onClick, destructive }: SettingsRowProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={cn(
        "min-h-14 w-full justify-start rounded-none px-4 py-3 text-sm hover:bg-surface-2 first:rounded-t-xl last:rounded-b-xl",
        destructive && "justify-center text-destructive hover:bg-destructive/10 hover:text-destructive",
      )}
    >
      {Icon && (
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
        </span>
      )}
      <span className="min-w-0 flex-1 text-left">
        <span className="block">{label}</span>
        {description && <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{description}</span>}
      </span>
      {!destructive && (
        <>
          {value && <span className="font-semibold text-foreground">{value}</span>}
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </>
      )}
    </Button>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`section-${title}`}>
      <h2 id={`section-${title}`} className="mb-2 px-1 text-xs font-semibold uppercase text-muted-foreground">
        {title}
      </h2>
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">{children}</div>
    </section>
  );
}

function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { openVipModal } = useVip();
  const { current, posts, profiles, updatePrivateAlbum } = useProfiles();
  const social = useSocial();
  const [darkMode, setDarkMode] = useState(true);
  const [albumsOpen, setAlbumsOpen] = useState(false);
  const [visitsOpen, setVisitsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [selectedPublicPost, setSelectedPublicPost] = useState<Post | null>(null);

  const privateAlbum = current?.private_album ?? [];
  const privateAlbumUrls = useAlbumUrls(privateAlbum);
  const publicPosts = useMemo(
    () => posts.filter(
      (post) => post.author_id === current?.id
        && !post.wall_profile_id
        && post.media === "foto"
        && Boolean(post.image),
    ),
    [current?.id, posts],
  );
  const publicPostUrls = useAlbumUrls(
    publicPosts.map((post) => post.image).filter((image): image is string => Boolean(image)),
  );
  const followerCount = current ? social.followersOf(current.id).length : 0;
  const followingCount = current ? social.followingOf(current.id).length : 0;
  const visitorProfiles = current
    ? [...new Set(social.visits.filter((visit) => visit.profile_id === current.id).map((visit) => visit.visitor_id))]
        .map((id) => profiles.find((profile) => profile.id === id))
        .filter((profile): profile is NonNullable<typeof profile> => Boolean(profile))
    : [];

  //Trava de segurança
  if (!current) {
    return <div className="p-8 text-center text-muted-foreground" />;
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };
  
  const albumCount = publicPosts.length + privateAlbum.length;

 const addPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    toast.error("Usuário não autenticado");
    return;
  }

  const [filePath] = await uploadAlbumPhotos(user.id, "private", [file]);
  if (!filePath) {
    toast.error("Não foi possível salvar a foto");
    return;
  }
  updatePrivateAlbum([filePath, ...privateAlbum]);
  
  toast("Foto adicionada ao álbum com sucesso!");
  event.target.value = "";
};
  const removePhoto = (index: number) => {
    updatePrivateAlbum(privateAlbum.filter((_, photoIndex) => photoIndex !== index));
    toast("Foto removida do álbum");
  };

  const showPrototype = (label: string) => toast(`${label}: recurso em demonstração`);

  if (location.pathname === "/configuracoes/amigos" || location.pathname === "/configuracoes/privacidade" || location.pathname === "/configuracoes/bloqueados") {
    return (
      <AppShell>
        <Outlet />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-0 md:py-8">
        <header className="mb-7">
          <p className="text-xs font-medium text-primary-glow">Sua conta</p>
          <h1 className="mt-1 text-2xl font-semibold">Configurações</h1>
        </header>

        <div className="space-y-6">
          <SettingsSection title="Métricas da conta">
            <SettingsRow icon={Image} label="Meus álbuns" value={String(albumCount)} onClick={() => setAlbumsOpen(true)} />
            <SettingsRow
              icon={Users}
              label="Amigos e seguidores"
              value={String(followerCount + followingCount)}
              onClick={() => navigate({ to: "/configuracoes/amigos" })}
            />
            <SettingsRow
              icon={Eye}
              label="Visitas recebidas"
              value={String(visitorProfiles.length)}
              onClick={() => setVisitsOpen(true)}
            />
          </SettingsSection>

          <SettingsSection title="Geral">
            {general.map((item) => {
              const { icon: Icon, ...rest } = item;

              return (
                <SettingsRow
                  key={item.label}
                  icon={Icon}
                  {...rest}
                  onClick={() => {
                    if (item.label === "Editar perfil") {
                      navigate({ to: "/editar-perfil" });
                      return;
                    }
                    if (item.label === "Permissões e privacidade") {
                      setPrivacyOpen(true);
                      return;
                    }
                    if (item.label === "Perfis bloqueados") {
                      navigate({ to: "/configuracoes/bloqueados" });
                      return;
                    }
                    if (item.vip) {
                      openVipModal();
                      return;
                    }
                    showPrototype(item.label);
                  }}
                />
              );
            })}
          </SettingsSection>

          <SettingsSection title="Segurança e conta">
            {security.map((item) => {
              const { icon: Icon, ...rest } = item;

              return <SettingsRow key={item.label} icon={Icon} {...rest} onClick={() => showPrototype(item.label)} />;
            })}
          </SettingsSection>

          <SettingsSection title="Aparência">
            <div className="flex h-16 items-center gap-3 px-4">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted-foreground">
                <MoonStar className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Modo de cores</p>
                <p className="text-xs text-muted-foreground">{darkMode ? "Escuro" : "Escuro suave"}</p>
              </div>
              <Switch
                checked={darkMode}
                onCheckedChange={(checked) => {
                  setDarkMode(checked);
                  toast(checked ? "Modo escuro ativado" : "Modo escuro suave ativado");
                }}
                aria-label="Alternar modo de cores"
              />
            </div>
          </SettingsSection>

          <SettingsSection title="Outros">
            {others.map((item) => {
              const { icon: Icon, ...rest } = item;

              return <SettingsRow key={item.label} icon={Icon} {...rest} onClick={() => showPrototype(item.label)} />;
            })}
          </SettingsSection>

          <section aria-label="Ações da conta" className="space-y-3">
            <div className="overflow-hidden rounded-xl border border-destructive/25 bg-surface">
              <SettingsRow label="Sair" destructive onClick={() => void handleSignOut()} />
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto w-full justify-start rounded-xl border border-border bg-surface px-4 py-4 text-left hover:bg-surface-2"
                >
                  <div className="min-w-0 flex-1 whitespace-normal">
                    <p className="text-sm font-medium text-destructive">Excluir conta</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Ao excluir sua conta, todos seus dados serão removidos e isso não poderá ser desfeito.
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-h-[85vh] max-w-sm overflow-y-auto rounded-xl border-border bg-surface">
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir sua conta?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação removeria permanentemente seus dados. Neste protótipo, nenhuma informação será apagada.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => toast("Exclusão simulada — nenhum dado foi removido")}
                  >
                    Confirmar exclusão
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </section>
        </div>

        <footer className="px-4 pb-5 pt-10 text-center text-[11px] leading-relaxed text-muted-foreground">
          <p>Conexão Privada · versão 1.0.0</p>
          <p>© 2026 Conexão Privada. Todos os direitos reservados.</p>
        </footer>
      </div>
      <Dialog open={albumsOpen} onOpenChange={setAlbumsOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto rounded-xl border-border bg-surface sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Meus álbuns</DialogTitle>
            <DialogDescription>Veja as fotos públicas e gerencie o álbum privado.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <section aria-labelledby="public-album-title">
              <div className="mb-2 flex items-center justify-between">
                <h3 id="public-album-title" className="text-sm font-semibold">Álbum público</h3>
                <span className="text-xs text-muted-foreground">{publicPosts.length} foto(s)</span>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {publicPosts.map((post, index) => (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => setSelectedPublicPost(post)}
                    className="aspect-square overflow-hidden rounded-lg bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label={`Abrir publicação de ${new Date(post.created_at).toLocaleDateString("pt-BR")}`}
                  >
                    <img
                      src={publicPostUrls[index] ?? undefined}
                      alt="Foto da publicação"
                      className="h-full w-full object-cover transition-transform hover:scale-105"
                    />
                  </button>
                ))}
                {publicPosts.length === 0 && (
                  <p className="col-span-3 py-6 text-center text-xs text-muted-foreground sm:col-span-4">
                    Nenhuma publicação com foto.
                  </p>
                )}
              </div>
            </section>
            {([["private", "Álbum privado", privateAlbum]] as const).map(([album, title, photos]) => (
              <section key={album} aria-labelledby={`${album}-album-title`}>
                <div className="mb-2 flex items-center justify-between">
                  <h3 id={`${album}-album-title`} className="text-sm font-semibold">{title}</h3>
                  <label className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-primary-glow">
                    <Plus className="h-3.5 w-3.5" /> Adicionar foto
                    <input type="file" accept="image/*" className="sr-only" onChange={addPhoto} />
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {photos.map((photo, index) => (
                    <div key={`${photo}-${index}`} className="group relative aspect-square overflow-hidden rounded-lg bg-surface-2">
                      <img
                        src={privateAlbumUrls[index] ?? undefined}
                        alt={`${title}, foto ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        aria-label={`Remover foto ${index + 1} de ${title}`}
                        className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={selectedPublicPost !== null} onOpenChange={(open) => !open && setSelectedPublicPost(null)}>
        <DialogContent className="rounded-xl border-border bg-surface sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Publicação com foto</DialogTitle>
            <DialogDescription>
              {selectedPublicPost && new Date(selectedPublicPost.created_at).toLocaleDateString("pt-BR")}
            </DialogDescription>
          </DialogHeader>
          {selectedPublicPost && (
            <div className="space-y-3">
              <img
                src={publicPostUrls[publicPosts.findIndex((post) => post.id === selectedPublicPost.id)] ?? undefined}
                alt="Foto da publicação"
                className="max-h-[55vh] w-full rounded-lg object-contain"
              />
              {selectedPublicPost.text && <p className="text-sm text-foreground/90">{selectedPublicPost.text}</p>}
              <button
                type="button"
                onClick={() => {
                  setSelectedPublicPost(null);
                  navigate({ to: "/perfil/$id", params: { id: selectedPublicPost.author_id } });
                }}
                className="w-full rounded-lg bg-gradient-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
              >
                Abrir publicação no perfil
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={visitsOpen} onOpenChange={setVisitsOpen}>
        <DialogContent className="rounded-xl border-border bg-surface sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Visitas recebidas</DialogTitle>
            <DialogDescription>As pessoas que visitaram seu perfil recentemente.</DialogDescription>
          </DialogHeader>
          <div className="divide-y divide-border rounded-lg border border-border">
            {["Aurora", "Duo Noir", "Caio", "Nina"].map((visitor, index) => (
              <div key={visitor} className="flex items-center gap-3 px-3 py-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-xs font-semibold text-primary-glow">{visitor.slice(0, 1)}</span>
                <span className="flex-1 text-sm">{visitor}</span>
                <span className="text-xs text-muted-foreground">{index + 1} h</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <PrivacyDialog open={privacyOpen} onOpenChange={setPrivacyOpen} />
      <Outlet />
    </AppShell>
  );
}