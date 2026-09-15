import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Cake,
  CalendarDays,
  Circle,
  Crown,
  Flag,
  Heart,
  Home,
  Lock,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  MoreVertical,
  PenSquare,
  Play,
  Search,
  Signpost,
  UserRound,
  Ban,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AvatarOrb, MediaBlock, TypeBadge, VipBadge } from "@/components/bits";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProfiles } from "@/context/profiles-context";
import { useVip, FREE_LIKE_LIMIT } from "@/context/vip";
import { useSocial } from "@/hooks/use-social";
import { useAuth } from "@/hooks/use-auth";
import { uploadAlbumPhotos, useAlbumUrls } from "@/lib/album-storage";
import type { Profile } from "@/lib/mock-data";


function nf(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1).replace(".", ",")} mil`;
  return String(n);
}

function seeded(seed: string, min: number, max: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 100000;
  return min + (h % (max - min + 1));
}

const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function LikeAndCommentsRow({
  likes,
  comments,
  liked,
  onLike,
  onOpenLikes,
  onOpenComments,
}: {
  likes: number;
  comments: number;
  liked: boolean;
  onLike: () => void;
  onOpenLikes: () => void;
  onOpenComments: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 text-xs text-muted-foreground">
      <button
        type="button"
        onClick={onLike}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2 py-1 hover:text-foreground"
      >
        <Heart className={`h-3.5 w-3.5 ${liked ? "fill-current text-primary-glow" : ""}`} />
        <span>{likes}</span>
      </button>
      <button
        type="button"
        onClick={onOpenLikes}
        className="text-[11px] font-medium text-primary-glow hover:underline"
      >
        Ver curtidas
      </button>
      <button
        type="button"
        onClick={onOpenComments}
        className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2 py-1 hover:text-foreground"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        <span>{comments}</span>
      </button>
    </div>
  );
}

export function ProfileView({ profile, isOwner }: { profile: Profile; isOwner: boolean }) {
  const navigate = useNavigate();
  const { profiles, posts, blockProfile, updateCurrentAlbums, isBlocked, unblockProfile, createPost } = useProfiles();
  const { isVip, openVipModal, tryUseLike, likesUsedToday } = useVip();
  const social = useSocial();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [lightbox, setLightbox] = useState<{ photos: number[]; index: number; album: "public" | "private" } | null>(null);
  const [connectionsView, setConnectionsView] = useState<"following" | "followers" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [galleryLikes, setGalleryLikes] = useState<Record<number, number>>({ 0: 128, 1: 96, 2: 143, 3: 109, 4: 176, 5: 132 });
  const [galleryLiked, setGalleryLiked] = useState<Record<number, boolean>>({});
  const [galleryComments, setGalleryComments] = useState<Record<number, number>>({ 0: 16, 1: 11, 2: 18, 3: 14, 4: 22, 5: 17 });
  const [likesModalOpen, setLikesModalOpen] = useState(false);
  const [commentsModalOpen, setCommentsModalOpen] = useState(false);
  const { current } = useProfiles();
  const activeProfile = profile ?? current;
  const publicUrls = useAlbumUrls(activeProfile?.publicAlbum ??[]);
  const privateUrls = useAlbumUrls(activeProfile?.privateAlbum ?? []);

   useEffect(() => {
    if (!isOwner && user && profile.id !== user.id) void social.registerVisit(profile.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id, isOwner, user?.id]);

  const stats = useMemo(
    () => ({
      views: seeded(profile.id + "v", 8000, 60000),
      memberMonth: meses[seeded(profile.id + "m", 0, 11)]!,
      memberYear: 2021 + seeded(profile.id + "y", 0, 4),
      onlineHours: seeded(profile.id + "o", 1, 22),
    }),
    [profile.id],
  );

 
  
  if (!current) {
    return <div className="p-8 text-center text-muted-foreground">Carregando perfil...</div> 
  }
  const targetProfileId = profile?.id ??current?.id;
   const blocked = targetProfileId ? isBlocked(targetProfileId) : false;

  if (blocked) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-10 md:px-0">
        <div className="rounded-2xl border border-border bg-surface p-6 text-center shadow-sm">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <Ban className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-xl font-semibold">Perfil bloqueado</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Você bloqueou {profile.nick}. Esse perfil vai ficar oculto até você desbloquear.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                unblockProfile(profile.id);
                toast.success(`${profile.nick} desbloqueado`);
                navigate({ to: "/explorar" });
              }}
              className="rounded-full bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Desbloquear
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: "/explorar" })}
              className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const vip = isOwner ? isVip || profile.vip : profile.vip;
  const access = social.albumAccess(profile.id);
  const canViewPrivateAlbum = isOwner || access === "approved";
  const following = social.isFollowing(profile.id);
 
 

 

  const followersIds = social.followersOf(profile.id);
  const followingIds = social.followingOf(profile.id);

  const visitors = useMemo(() => {
    const ids = social.visits.filter((v) => v.profile_id === profile.id).map((v) => v.visitor_id);
    const unique = [...new Set(ids)];
    return unique
      .map((id) => profiles.find((p) => p.id === id))
      .filter((p): p is Profile => !!p)
      .slice(0, 8);
  }, [social.visits, profiles, profile.id]);

  const pendingRequests = useMemo(
    () => social.albumRequests.filter((r) => r.owner_id === profile.id && r.status === "pending"),
    [social.albumRequests, profile.id],
  );

  const timeline = useMemo(() => posts.filter((p) => p.authorId === profile.id), [posts, profile.id]);
  const connectionProfiles = useMemo(() => {
    const ids = connectionsView === "followers" ? followersIds : followingIds;
    return ids.map((id) => profiles.find((p) => p.id === id)).filter((p): p is Profile => !!p);
  }, [connectionsView, followersIds, followingIds, profiles]);
  const publicPhotos = useMemo(
    () => publicUrls.map((_, i) => profile.hue + i * 14),
    [publicUrls, profile.hue],
  );
  const privateCount = canViewPrivateAlbum ? privateUrls.length : (profile.privateAlbum ?? []).length;
  const privatePhotos = useMemo(
    () => Array.from({ length: privateCount }, (_, i) => profile.hue + i * 21),
    [privateCount, profile.hue],
  );
  const likesLeft = Math.max(0, FREE_LIKE_LIMIT - likesUsedToday);

  async function handleUpload(kind: "public" | "private", files: FileList | null) {
    if (!files?.length || !user) return;
    setUploading(true);
    try {
      const paths = await uploadAlbumPhotos(user.id, kind, Array.from(files));
      const existing = (kind === "public" ? profile.publicAlbum : profile.privateAlbum) ?? [];
      updateCurrentAlbums(kind, [...paths, ...existing]);
      toast.success(paths.length > 1 ? "Fotos enviadas" : "Foto enviada");
    } catch {
      toast.error("Não foi possível enviar a foto");
    } finally {
      setUploading(false);
    }
  }


  const bio = `${profile.bio} ${profile.age} anos. Curtimos drinks 🍸, música boa 🎶, viagens ✈️ e encontros com respeito e discrição. Sem julgamentos, sem pressa — a conexão acontece naturalmente. Chamem no privado para trocar uma ideia.`;
  const bioShort = bio.slice(0, 120);

  const info: Array<[typeof MapPin, string]> = [
    [UserRound, profile.type.startsWith("Casal") ? "Casal · Bissexual" : "Heterossexual"],
    [Home, profile.city],
    [Cake, `${profile.age} anos`],
    [Signpost, `+ de ${profile.distanceKm} km`],
    [Search, "Busca: Homens, Casais"],
    [CalendarDays, `Desde ${stats.memberMonth}/${stats.memberYear}`],
    [Circle, `Online há ${stats.onlineHours} h`],
  ];

  return (
    <>
      {/* HEADER */}
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/85 px-3 py-2 backdrop-blur md:rounded-t-2xl">
        <button
          onClick={() => navigate({ to: isOwner ? "/feed" : "/explorar" })}
          aria-label="Voltar"
          className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">@{profile.nick.toLowerCase().replace(/\s|&/g, "")}</p>

        {isOwner ? (
          <button
            onClick={() => toast(isVip ? "Compositor aberto: você pode publicar fotos e vídeos" : "Compositor aberto: Free pode publicar fotos; vídeos são exclusivos VIP")}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-neon"
          >
            <PenSquare className="h-3.5 w-3.5" /> Postar
          </button>
        ) : (
          <button
            onClick={() => {
              if (!following && !tryUseLike()) return;
              void social.toggleFollow(profile.id, profile.nick);
              toast.success(following ? "Você deixou de seguir" : `Agora você segue ${profile.nick}`);
            }}

            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
              following
                ? "border border-primary/60 bg-transparent text-primary-glow"
                : "bg-gradient-primary text-primary-foreground shadow-neon"
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${following ? "fill-current" : ""}`} /> {following ? "Seguindo" : "Seguir"}
          </button>
        )}

        <button
          type="button"
          onClick={() => (isVip ? navigate({ to: "/chat" }) : openVipModal())}
          aria-label="Bate-papo"
          className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface-2"
        >
          {isVip || isOwner ? <MessageSquare className="h-5 w-5" /> : <Lock className="h-5 w-5 text-gold" />}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger aria-label="Mais opções" className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface-2">
            <MoreVertical className="h-5 w-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 border-border bg-surface">
            <DropdownMenuItem onClick={() => (isVip ? navigate({ to: "/chat" }) : openVipModal())}>
              <MessageSquare className="mr-2 h-4 w-4" /> Mensagem privada
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                const value = window.prompt(`Escreva sua mensagem para o mural de ${profile.nick}`);
                if (!value || !value.trim()) return;

                createPost({
                  text: value.trim(),
                  authorId: profile.id,
                });

                toast.success(`Publicação adicionada ao mural de ${profile.nick}`);
              }}
            >
              <PenSquare className="mr-2 h-4 w-4" /> Postar no mural
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { blockProfile(profile.id); toast.success(`${profile.nick} bloqueado`); navigate({ to: "/explorar" }); }}>
              <Ban className="mr-2 h-4 w-4" /> Bloquear
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast.success("Denúncia enviada para moderação")}>
              <Flag className="mr-2 h-4 w-4" /> Denunciar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: isOwner ? "/feed" : "/explorar" })}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* BANNER + AVATAR */}
      <div className="relative">
        <MediaBlock
          hue={profile.hue}
          src={profile.cover}
          alt={`Capa ilustrada de ${profile.nick}`}
          className="h-40 w-full"
        />
        <div className="absolute inset-x-0 -bottom-10 grid place-items-center">
          <span className={`rounded-full p-[3px] ${vip ? "bg-gradient-gold shadow-gold" : "bg-surface-2"}`}>
            <span className="block rounded-full bg-background p-[3px]">
              <AvatarOrb profile={{ nick: profile.nick, hue: profile.hue, vip, avatar: profile.avatar }} size={92} ring={false} />
            </span>
          </span>
        </div>
      </div>

      <div className="px-4 pt-12 text-center md:px-0">
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-xl font-semibold">{profile.nick}</h1>
          {vip && <VipBadge />}
        </div>
        <div className="mt-2 flex justify-center">
          <TypeBadge type={profile.type} />
        </div>

        {/* MÉTRICAS */}
        <div className="mt-4 grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-surface py-3">
          <div>
            <p className="text-base font-semibold">{nf(stats.views)}</p>
            <p className="text-[11px] text-muted-foreground">visualizações</p>
          </div>
          {([
            [nf(followingIds.length), "seguindo", "following"],
            [nf(followersIds.length), "seguidores", "followers"],
          ] as const).map(([value, label, view]) => (

            <button
              key={label}
              type="button"
              onClick={() => {
                if (!isVip) {
                  openVipModal();
                  return;
                }
                setConnectionsView(view);
              }}
              className="px-1 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={`${label} de ${profile.nick}`}
            >
              <p className="text-base font-semibold">{value}</p>
              <p className="text-[11px] text-muted-foreground">{label}</p>
            </button>
          ))}
        </div>

        <Dialog open={connectionsView !== null} onOpenChange={(open) => !open && setConnectionsView(null)}>
          <DialogContent className="max-h-[85vh] overflow-y-auto border-border bg-surface sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{connectionsView === "followers" ? "Seguidores" : "Seguindo"}</DialogTitle>
            </DialogHeader>
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              {connectionProfiles.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate({ to: "/perfil/$id", params: { id: item.id } })}
                  className="flex w-full items-center gap-3 bg-surface px-3 py-3 text-left hover:bg-surface-2"
                >
                  <AvatarOrb profile={item} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{item.nick}</span>
                    <span className="block truncate text-xs text-muted-foreground">{item.city}</span>
                  </span>
                  {item.vip && <VipBadge />}
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* QUEM VISITOU O SEU PERFIL — exclusivo VIP */}
        {isOwner && (
          <section className="mt-4 rounded-xl border border-gold/30 bg-surface p-3 text-left">
            <div className="flex items-center justify-between gap-2">
              <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
                <Crown className="h-4 w-4 text-gold" /> Quem visitou seu perfil
              </p>
              <span className="text-[11px] text-muted-foreground">{visitors.length} nas últimas 24h</span>
            </div>
            <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
              {visitors.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => (isVip ? navigate({ to: "/perfil/$id", params: { id: item.id } }) : openVipModal())}
                  className="flex w-16 shrink-0 flex-col items-center gap-1"
                >
                  <span className={isVip ? "" : "blur-[6px]"}>
                    <AvatarOrb profile={item} size={48} />
                  </span>
                  <span className={`w-full truncate text-center text-[11px] text-muted-foreground ${isVip ? "" : "blur-[4px]"}`}>
                    {item.nick}
                  </span>
                </button>
              ))}
            </div>
            {!isVip && (
              <button
                onClick={openVipModal}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-gold py-2.5 text-xs font-semibold text-gold-foreground shadow-gold"
              >
                <Lock className="h-3.5 w-3.5" /> Ver todos que visitaram seu perfil com o VIP
              </button>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground">
              {isVip
                ? "Curtidas ilimitadas ativas e prioridade nas buscas."
                : `Plano Free: ${likesLeft} curtida(s) restante(s) hoje.`}
            </p>
          </section>
        )}


        {/* INFOS RÁPIDAS */}
        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-left">
          {info.map(([Icon, label]) => (
            <p key={label} className="flex items-center gap-2 text-xs text-muted-foreground">
              <Icon className={`h-3.5 w-3.5 shrink-0 ${label.startsWith("Online") ? "fill-emerald-400 text-emerald-400" : "text-primary-glow"}`} />
              <span className="truncate">{label}</span>
            </p>
          ))}
        </div>

        {/* BIO */}
        <p className="mt-4 text-left text-sm leading-relaxed text-foreground/90">
          {expanded ? bio : `${bioShort}…`}{" "}
          <button onClick={() => setExpanded((e) => !e)} className="font-medium text-primary-glow hover:underline">
            {expanded ? "ver menos" : "ver mais"}
          </button>
        </p>

        {isOwner && pendingRequests.length > 0 && (
          <section className="mt-5 rounded-xl border border-primary/30 bg-surface p-4 text-left">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary-glow" />
              <h2 className="text-sm font-semibold">Pedidos de acesso ao álbum privado</h2>
            </div>
            <div className="mt-3 space-y-2">
              {pendingRequests.map((req) => {
                const asker = profiles.find((p) => p.id === req.requester_id);
                return (
                  <div key={req.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-2.5">
                    {asker && <AvatarOrb profile={asker} size={36} />}
                    <span className="min-w-0 flex-1 truncate text-sm">{asker?.nick ?? "Alguém"}</span>
                    <button
                      onClick={() => {
                        void social.respondAlbumRequest(req.id, "approved");
                        toast.success("Acesso liberado");
                      }}
                      className="rounded-full bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                    >
                      Liberar
                    </button>
                    <button
                      onClick={() => {
                        void social.respondAlbumRequest(req.id, "rejected");
                        toast("Pedido recusado");
                      }}
                      className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground"
                    >
                      Recusar
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* TABS */}
        <Tabs defaultValue="principal" className="mt-6 text-left">
          <TabsList className="w-full bg-surface">
            <TabsTrigger value="principal" className="flex-1">Principal</TabsTrigger>
            <TabsTrigger value="albuns" className="flex-1">Álbuns</TabsTrigger>
          </TabsList>

          <TabsContent value="principal">
            <div className="space-y-3 pb-6">
              {timeline.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma publicação ainda.</p>
              )}
              {timeline.map((post) => (
                <article key={post.id} className="overflow-hidden rounded-2xl border border-border bg-surface">
                  <div className="flex items-center gap-2 p-3">
                    <AvatarOrb profile={{ nick: profile.nick, hue: profile.hue, vip, avatar: profile.avatar }} size={34} />
                    <div>
                      <p className="text-sm font-medium">{profile.nick}</p>
                      <p className="text-[11px] text-muted-foreground">{post.time}</p>
                    </div>
                  </div>
                  <p className="px-3 pb-3 text-sm text-foreground/90">{post.text}</p>
                  <div className="relative">
                    <MediaBlock
                      hue={profile.hue + 18}
                      src={post.image}
                      alt={`Ilustração do post de ${profile.nick}`}
                      className="aspect-[4/3] w-full"
                    />
                    {post.media === "video" && (
                      <>
                        <button
                          aria-label="Reproduzir vídeo"
                          onClick={() => toast("Reproduzindo vídeo")}
                          className="absolute inset-0 grid place-items-center"
                        >
                          <span className="grid h-12 w-12 place-items-center rounded-full bg-background/70 backdrop-blur">
                            <Play className="h-5 w-5 fill-current" />
                          </span>
                        </button>
                        {vip && <VipBadge className="absolute right-2 top-2 opacity-90" />}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-4 p-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {post.likes}</span>
                    <span className="inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {post.comments}</span>
                  </div>
                </article>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="albuns">
            <Tabs defaultValue="publico" className="mt-3">
              <TabsList className="w-full bg-surface-2">
                <TabsTrigger value="publico" className="flex-1">Álbum Público</TabsTrigger>
                <TabsTrigger value="privado" className="flex-1">Álbum Privado</TabsTrigger>
              </TabsList>

              <TabsContent value="publico">
                {isOwner && (
                  <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface py-3 text-sm text-muted-foreground hover:text-foreground">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        void handleUpload("public", e.target.files);
                        e.target.value = "";
                      }}
                    />
                    {uploading ? "Enviando…" : "Enviar fotos para o álbum público"}
                  </label>
                )}
                <div className="mt-3 grid grid-cols-3 gap-2 pb-6">
                  {publicPhotos.map((h, i) => (
                    <div key={i} className="group relative overflow-hidden rounded-xl">
                      <button
                        type="button"
                        onClick={() => setLightbox({ photos: publicPhotos, index: i, album: "public" })}
                        aria-label={`Abrir foto ${i + 1}`}
                        className="block w-full overflow-hidden rounded-xl"
                      >
                        <MediaBlock hue={h} src={publicUrls[i]} alt={`Foto pública de ${profile.nick}`} className="aspect-square w-full" />
                      </button>

                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label={`Mais opções da foto ${i + 1}`}
                          className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full border border-border/60 bg-background/70 text-foreground backdrop-blur transition-opacity hover:bg-background/90"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 border-border bg-surface">
                          <DropdownMenuItem onClick={() => setLightbox({ photos: publicPhotos, index: i, album: "public" })}>
                            <Eye className="mr-2 h-4 w-4" /> Ver publicação
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate({ to: "/perfil/$id", params: { id: profile.id } })}>
                            <UserRound className="mr-2 h-4 w-4" /> Visitar perfil
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.success("Foto denunciada")}>
                            <Flag className="mr-2 h-4 w-4" /> Denunciar foto
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                  {publicPhotos.length === 0 && (
                    <p className="col-span-3 py-6 text-center text-sm text-muted-foreground">Nenhuma foto ainda.</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="privado">
                {isOwner && (
                  <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gold/40 bg-gold/5 py-3 text-sm text-gold">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        void handleUpload("private", e.target.files);
                        e.target.value = "";
                      }}
                    />
                    {uploading ? "Enviando…" : "Enviar fotos para o álbum privado"}
                  </label>
                )}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {privatePhotos.map((h, i) => (
                    <div key={i} className="relative aspect-square overflow-hidden rounded-xl">
                      <MediaBlock
                        hue={h}
                        src={canViewPrivateAlbum ? privateUrls[i] : undefined}
                        alt={canViewPrivateAlbum ? `Foto privada de ${profile.nick}` : "Foto privada bloqueada"}
                        className={`h-full w-full ${canViewPrivateAlbum ? "" : "blur-lg"}`}
                      />
                      {!canViewPrivateAlbum && (
                        <div className="absolute inset-0 grid place-items-center bg-background/40">
                          <Lock className="h-5 w-5 text-gold" />
                        </div>
                      )}
                    </div>
                  ))}
                  {privatePhotos.length === 0 && (
                    <p className="col-span-3 py-6 text-center text-sm text-muted-foreground">Nenhuma foto ainda.</p>
                  )}
                </div>
                {!isOwner && (
                  <button
                    onClick={() => {
                      if (access === "none" || access === "rejected") {
                        void social.requestAlbumAccess(profile.id, profile.nick);
                        toast.success("Solicitação enviada ao dono do álbum");
                      }
                    }}
                    disabled={access === "pending" || access === "approved"}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-gold/45 bg-gold/5 py-3 text-sm font-medium text-gold hover:bg-gold/10 disabled:cursor-default disabled:opacity-70"
                  >
                    <Lock className="h-4 w-4" />
                    {access === "approved"
                      ? "Acesso liberado"
                      : access === "pending"
                        ? "Aguardando autorização do dono"
                        : "Solicitar Acesso ao Álbum Privado"}
                  </button>
                )}
                {!isVip && !isOwner && (
                  <button
                    onClick={openVipModal}
                    className="mt-2 mb-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-gold py-3 text-sm font-semibold text-gold-foreground shadow-gold"
                  >
                    <Crown className="h-4 w-4" /> Ver com VIP
                  </button>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={lightbox !== null} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-md border-border bg-surface p-3">
          <DialogHeader>
            <DialogTitle className="text-sm">Foto de {profile.nick}</DialogTitle>
          </DialogHeader>
          {lightbox !== null && (
            <div className="space-y-3">
              <div className="relative">
                <MediaBlock
                  hue={lightbox.photos[lightbox.index] ?? 0}
                  src={publicUrls[lightbox.index]}
                  alt={`Foto ${lightbox.index + 1} de ${profile.nick}`}
                  className="aspect-square w-full rounded-xl"
                />
                <button
                  onClick={() =>
                    setLightbox((current) =>
                      current
                        ? { ...current, index: (current.index - 1 + current.photos.length) % current.photos.length }
                        : null,
                    )
                  }
                  aria-label="Foto anterior"
                  className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-background/75 text-foreground backdrop-blur transition-colors hover:bg-background"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() =>
                    setLightbox((current) =>
                      current
                        ? { ...current, index: (current.index + 1) % current.photos.length }
                        : null,
                    )
                  }
                  aria-label="Próxima foto"
                  className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-background/75 text-foreground backdrop-blur transition-colors hover:bg-background"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-background/75 px-2.5 py-1 text-[11px] text-foreground backdrop-blur">
                  {lightbox.index + 1} / {lightbox.photos.length}
                </span>
              </div>

              <LikeAndCommentsRow
                likes={galleryLikes[lightbox.index] ?? 0}
                comments={galleryComments[lightbox.index] ?? 0}
                liked={galleryLiked[lightbox.index] ?? false}
                onLike={() => {
                  const currentlyLiked = galleryLiked[lightbox.index] ?? false;
                  setGalleryLiked((current) => ({ ...current, [lightbox.index]: !currentlyLiked }));
                  setGalleryLikes((current) => ({
                    ...current,
                    [lightbox.index]: Math.max(0, (current[lightbox.index] ?? 0) + (currentlyLiked ? -1 : 1)),
                  }));
                }}
                onOpenLikes={() => setLikesModalOpen(true)}
                onOpenComments={() => setCommentsModalOpen(true)}
              />
            </div>
          )}
        
        </DialogContent>
      </Dialog>

      <Dialog open={likesModalOpen} onOpenChange={setLikesModalOpen}>
        <DialogContent className="max-w-sm border-border bg-surface">
          <DialogHeader>
            <DialogTitle>Pessoas que curtiram</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2 text-sm text-muted-foreground">
            {profiles.slice(0, 5).map((person) => (
              <div key={person.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-2 py-2">
                <AvatarOrb profile={person} size={28} />
                <span className="font-medium text-foreground">{person.nick}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={commentsModalOpen} onOpenChange={setCommentsModalOpen}>
        <DialogContent className="max-w-sm border-border bg-surface">
          <DialogHeader>
            <DialogTitle>Comentários</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            {[
              { user: "Lia", text: "Foto incrível, muito boa!" },
              { user: "Mika", text: "Perfeita essa composição." },
              { user: "Dani", text: "To curtindo demais." },
            ].map((comment) => (
              <div key={comment.user} className="rounded-xl border border-border bg-surface-2 p-3">
                <p className="font-medium text-foreground">{comment.user}</p>
                <p className="mt-1 text-muted-foreground">{comment.text}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
