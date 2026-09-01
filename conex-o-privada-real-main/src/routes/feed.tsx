import { createFileRoute } from "@tanstack/react-router";
import { Heart, MessageSquare, Share2, Play, Lock, Crown, Megaphone } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AvatarOrb, MediaBlock, VipBadge } from "@/components/bits";
import { ads, posts, profileById } from "@/lib/mock-data";
import { useVip } from "@/context/vip";
import { useProfiles } from "@/context/profiles-context";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Feed — Conexão Privada" },
      { name: "description", content: "Acompanhe publicações, stories de perfis próximos e eventos da comunidade." },
      { property: "og:title", content: "Feed — Conexão Privada" },
      { property: "og:description", content: "Publicações, stories e destaques da comunidade privada." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FeedPage,
});


function PostCard({ postId }: { postId: string }) {
  const post = posts.find((p) => p.id === postId)!;
  const author = profileById(post.authorId);
  const { isVip, openVipModal } = useVip();
  const [liked, setLiked] = useState(false);

  return (
    <article
      className={`overflow-hidden border-b border-border/60 bg-surface md:rounded-2xl md:border ${
        author.vip ? "md:border-gold/25" : ""
      }`}
    >
      <div className="flex items-center gap-3 p-4">
        <AvatarOrb profile={author} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold">{author.nick}</h2>
            {author.vip && <VipBadge />}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {author.type} · {author.city} · {post.time}
          </p>
        </div>
      </div>

      <p className="px-4 pb-3 text-sm text-foreground/90">{post.text}</p>

      <div className="relative">
        <MediaBlock
          hue={author.hue}
          src={post.image}
          alt={`Ilustração do post de ${author.nick}`}
          className="aspect-[4/3] w-full"
        />
        {post.media === "video" && (
          <div className="absolute inset-0 grid place-items-center">
            {isVip ? (
              <span className="grid h-14 w-14 place-items-center rounded-full bg-background/70 backdrop-blur">
                <Play className="h-6 w-6 text-foreground" />
              </span>
            ) : (
              <button
                onClick={openVipModal}
                className="flex flex-col items-center gap-2 rounded-2xl bg-background/70 px-6 py-4 backdrop-blur"
              >
                <Lock className="h-5 w-5 text-gold" />
                <span className="text-xs font-medium text-gold">Vídeo exclusivo para VIP</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-5 px-4 py-3">
        <button
          onClick={() => setLiked((v) => !v)}
          className={`flex items-center gap-1.5 text-sm ${liked ? "text-primary-glow" : "text-muted-foreground"}`}
        >
          <Heart className={`h-4.5 w-4.5 ${liked ? "fill-current" : ""}`} />
          {post.likes + (liked ? 1 : 0)}
        </button>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MessageSquare className="h-4.5 w-4.5" /> {post.comments}
        </span>
        <span className="ml-auto text-muted-foreground">
          <Share2 className="h-4.5 w-4.5" />
        </span>
      </div>
    </article>
  );
}

function AdCard({ index }: { index: number }) {
  const ad = ads[index % ads.length]!;
  const { openVipModal } = useVip();
  return (
    <div className="border-b border-border/60 bg-surface p-4 md:rounded-2xl md:border">
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          <Megaphone className="h-3 w-3" /> Anúncio local
        </span>
        <button onClick={openVipModal} className="text-[10px] text-gold hover:underline">
          VIPs não veem anúncios
        </button>
      </div>
      <div className="flex items-center gap-3">
        <MediaBlock hue={35} className="h-16 w-24 shrink-0 rounded-lg" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{ad.title}</p>
          <p className="truncate text-xs text-muted-foreground">{ad.tag}</p>
          <span className="mt-1 inline-block text-xs text-primary-glow">{ad.cta} →</span>
        </div>
      </div>
    </div>
  );
}

function FeedPage() {
  const { isVip, openVipModal } = useVip();
  const { isFollowing, getProfile } = useProfiles();
  const [tab, setTab] = useState<"seguindo" | "paravoce" | "todos">("todos");

  const visiblePosts = posts.filter((post) => {
    if (tab === "todos") return true;
    if (tab === "seguindo") return isFollowing(post.authorId);
    return getProfile(post.authorId)?.vip ?? false;
  });

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-xl">
      <h1 className="px-4 pt-5 text-2xl font-semibold md:px-0">Feed da comunidade</h1>
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="px-4 pt-4 md:px-0">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="seguindo">Seguindo</TabsTrigger>
          <TabsTrigger value="paravoce">Para você</TabsTrigger>
          <TabsTrigger value="todos">Todos</TabsTrigger>
        </TabsList>
      </Tabs>


      <div className="space-y-4 py-4 md:px-0">
        {!isVip && (
          <button
            onClick={openVipModal}
            className="mx-4 flex w-[calc(100%-2rem)] items-center gap-3 rounded-2xl border border-gold/35 bg-gold/5 p-4 text-left md:mx-0 md:w-full"
          >
            <Crown className="h-5 w-5 shrink-0 text-gold" />
            <span className="text-sm text-foreground/90">
              Destaque seu perfil no feed e navegue sem anúncios com o{" "}
              <span className="font-semibold text-gold">VIP</span>.
            </span>
          </button>
        )}

        {visiblePosts.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground md:px-0">
            Nada por aqui ainda nesta aba.
          </p>
        )}

        {visiblePosts.map((post, i) => (
          <div key={post.id} className="space-y-4">
            <PostCard postId={post.id} />
            {!isVip && (i + 1) % 2 === 0 && <AdCard index={i} />}
          </div>
        ))}
      </div>
      </div>
    </AppShell>
  );
}
