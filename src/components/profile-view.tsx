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
import { useMemo, useState } from "react";
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
import { useVip } from "@/context/vip";
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

export function ProfileView({ profile, isOwner }: { profile: Profile; isOwner: boolean }) {
  const navigate = useNavigate();
  const { profiles, posts, isFollowing, toggleFollow, blockProfile } = useProfiles();
  const { isVip, openVipModal, tryUseLike } = useVip();
  const [expanded, setExpanded] = useState(false);
  const [lightbox, setLightbox] = useState<{ photos: number[]; index: number } | null>(null);
  const [connectionsView, setConnectionsView] = useState<"following" | "followers" | null>(null);
  const [privateAccessRequested, setPrivateAccessRequested] = useState(false);

  const vip = isOwner ? isVip : profile.vip;
  const canViewPrivateAlbum = isOwner;
  const following = isFollowing(profile.id);

  const stats = useMemo(
    () => ({
      views: seeded(profile.id + "v", 8000, 60000),
      following: seeded(profile.id + "f", 60, 400),
      followers: seeded(profile.id + "s", 120, 1500),
      memberMonth: meses[seeded(profile.id + "m", 0, 11)]!,
      memberYear: 2021 + seeded(profile.id + "y", 0, 4),
      onlineHours: seeded(profile.id + "o", 1, 22),
    }),
    [profile.id],
  );

  const timeline = useMemo(() => posts.filter((p) => p.authorId === profile.id), [posts, profile.id]);
  const connectionProfiles = useMemo(
    () => profiles.filter((item) => item.id !== profile.id),
    [profiles, profile.id],
  );
  const publicPhotos = useMemo(() => [0, 1, 2, 3, 4, 5].map((i) => profile.hue + i * 14), [profile.hue]);
  const privatePhotos = useMemo(() => [0, 1, 2, 3].map((i) => profile.hue + i * 21), [profile.hue]);

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
              toggleFollow(profile.id);
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

        <Link
          to={isVip ? "/chat" : "/perfil/$id"}
          params={isVip ? undefined : { id: profile.id }}
          onClick={(event) => {
            if (!isVip) {
              event.preventDefault();
              openVipModal();
            }
          }}
          aria-label="Bate-papo"
          className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface-2"
        >
          {isVip || isOwner ? <MessageSquare className="h-5 w-5" /> : <Lock className="h-5 w-5 text-gold" />}
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger aria-label="Mais opções" className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface-2">
            <MoreVertical className="h-5 w-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 border-border bg-surface">
            <DropdownMenuItem onClick={() => (isVip ? navigate({ to: "/chat" }) : openVipModal())}>
              <MessageSquare className="mr-2 h-4 w-4" /> Mensagem privada
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast.success("Publicação no mural criada")}>
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
            [nf(stats.following), "seguindo", "following"],
            [nf(stats.followers), "seguidores", "followers"],
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

        {isOwner && (
          <section className="mt-5 rounded-xl border border-gold/30 bg-gold/5 p-4 text-left">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-gold" />
              <h2 className="text-sm font-semibold">Quem visitou seu perfil</h2>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {connectionProfiles.slice(0, 5).map((visitor) => (
                <div key={visitor.id} className={!isVip ? "blur-md" : ""}>
                  <AvatarOrb profile={visitor} size={38} />
                </div>
              ))}
            </div>
            {!isVip && (
              <button onClick={openVipModal} className="mt-3 text-xs font-medium text-gold hover:underline">
                Assine o VIP para ver quem visitou seu perfil
              </button>
            )}
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
                <div className="grid grid-cols-3 gap-2 pb-6">
                  {publicPhotos.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => setLightbox({ photos: publicPhotos, index: i })}
                      aria-label={`Abrir foto ${i + 1}`}
                      className="overflow-hidden rounded-xl"
                    >
                      <MediaBlock hue={h} src={profile.publicAlbum?.[i]} alt={`Foto pública de ${profile.nick}`} className="aspect-square w-full" />
                    </button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="privado">
                <div className="grid grid-cols-3 gap-2">
                  {privatePhotos.map((h, i) => (
                    <div key={i} className="relative aspect-square overflow-hidden rounded-xl">
                      <MediaBlock
                        hue={h}
                        src={profile.privateAlbum?.[i]}
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
                </div>
                <button
                  onClick={() => {
                    setPrivateAccessRequested(true);
                    toast.success("Solicitação enviada ao dono do álbum");
                  }}
                  disabled={privateAccessRequested}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-gold/45 bg-gold/5 py-3 text-sm font-medium text-gold hover:bg-gold/10 disabled:cursor-default disabled:opacity-70"
                >
                  <Lock className="h-4 w-4" />
                  {privateAccessRequested ? "Aguardando autorização do dono" : "Solicitar Acesso ao Álbum Privado"}
                </button>
                {!isVip && (
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
            <div className="relative">
              <MediaBlock
                hue={lightbox.photos[lightbox.index] ?? 0}
                src={profile.publicAlbum?.[lightbox.index]}
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
          )}
          <button
            onClick={() => setLightbox(null)}
            className="mx-auto inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-xs text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" /> Fechar
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
