import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Heart, MessageSquare, MoreHorizontal, Play, Lock } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AvatarOrb, MediaBlock, VipBadge } from "@/components/bits";
import { useVip } from "@/context/vip";
import { useProfiles } from "@/context/profiles-context";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({
    meta: [
      { title: "Feed — Conexão Privada" },
      { name: "description", content: "Acompanhe publicações, stories de perfis próximos e eventos da comunidade." },
    ],
  }),
  component: FeedPage,
});

function PostCard({ post }: { post: ReturnType<typeof useProfiles>["posts"][number] }) {
  const author = post.profiles;
  const { isVip, openVipModal } = useVip();
  const { likePost } = useProfiles();
  const navigate = useNavigate();

  if (!author) return null;

  return (
    <article className="overflow-hidden border-b border-border/60 bg-surface md:rounded-xl md:border">
      <div className="relative flex items-center gap-3 p-4">
        <AvatarOrb profile={author} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold">{author.nick}</h2>
            {author.vip && <VipBadge />}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {author.city}
          </p>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>{new Date(post.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full hover:bg-surface-2 hover:text-foreground"
              aria-label={`Mais opções da postagem de ${author.nick}`}
              title="Mais opções"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Opções da postagem</DialogTitle>
              <DialogDescription>Escolha uma ação para esta publicação.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => navigate({ to: "/perfil/$id", params: { id: author.id } })}
                className="rounded-lg border border-border bg-surface-2 px-4 py-3 text-left text-sm hover:text-foreground"
              >
                Visitar @{author.nick}
              </button>
              <button
                type="button"
                onClick={() => toast.success("Perfil denunciado (protótipo)")}
                className="rounded-lg border border-border bg-surface-2 px-4 py-3 text-left text-sm hover:text-foreground"
              >
                Denunciar
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <p className="px-4 pb-3 text-sm text-foreground/90">{post.text}</p>

      {post.image && (
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
                  type="button"
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
      )}

      <div className="flex items-center gap-5 px-4 py-3">
        <button
          type="button"
          onClick={() => likePost(post.id)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary-glow"
        >
          <Heart className="h-4 w-4" />
          {post.likes}
        </button>

        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MessageSquare className="h-4 w-4" />
          0
        </span>
      </div>
    </article>
  );
}

function FeedPage() {
  const { posts, isBlocked, isFollowing } = useProfiles();
  const [tab, setTab] = useState("all");

  const visiblePosts = posts.filter((post) => {
    if (!post.profiles) return false;
    if (isBlocked(post.author_id)) return false;
    if (tab === "following" && !isFollowing(post.author_id)) return false;
    return true;
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="following">Seguindo</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-4">
          {visiblePosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}