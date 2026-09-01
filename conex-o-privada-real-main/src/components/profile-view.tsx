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
  X,
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
  const { posts, isFollowing, toggleFollow } = useProfiles();
  const { isVip, openVipModal } = useVip();
  const [expanded, setExpanded] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const vip = isOwner ? isVip : profile.vip;
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
            onClick={() => toast("Abra o compositor de publicação no topo do app")}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-neon"
          >
            <PenSquare className="h-3.5 w-3.5" /> Postar
          </button>
        ) : (
          <button
            onClick={() => {
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
          to="/chat"
          aria-label="Bate-papo"
          className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface-2"
        >
          <MessageSquare className="h-5 w-5" />
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger aria-label="Mais opções" className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface-2">
            <MoreVertical className="h-5 w-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 border-border bg-surface">
            <DropdownMenuItem onClick={() => navigate({ to: "/chat" })}>
              <MessageSquare className="mr-2 h-4 w-4" /> Mensagem privada
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast.success("Publicação no mural criada")}>
              <PenSquare className="mr-2 h-4 w-4" /> Postar no mural
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast.success(`${profile.nick} bloqueado`)}>
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
        <div className="mt-4 grid grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-surface py-3">
          {[
            [nf(stats.views), "visualizações"],
            [nf(stats.following), "seguindo"],
            [nf(stats.followers), "seguidores"],
          ].map(([v, l]) => (
            <div key={l}>
              <p className="text-base font-semibold">{v}</p>
              <p className="text-[11px] text-muted-foreground">{l}</p>
            </div>
          ))}
        </div>

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
                      onClick={() => setLightbox(h)}
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
                      <MediaBlock hue={h} src={profile.privateAlbum?.[i]} alt="" className="h-full w-full blur-lg" />
                      <div className="absolute inset-0 grid place-items-center bg-background/40">
                        <Lock className="h-5 w-5 text-gold" />
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => toast.success("Solicitação de acesso enviada")}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-gold/45 bg-gold/5 py-3 text-sm font-medium text-gold hover:bg-gold/10"
                >
                  <Lock className="h-4 w-4" /> Solicitar Acesso ao Álbum Privado
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
            <MediaBlock
              hue={lightbox}
              src={profile.publicAlbum?.[publicPhotos.indexOf(lightbox)]}
              alt={`Foto de ${profile.nick}`}
              className="aspect-square w-full rounded-xl"
            />
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
