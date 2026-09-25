import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Flag, Heart, MessageSquare, MoreHorizontal, Play, Lock, UserRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AvatarOrb, MediaBlock, VipBadge } from "@/components/bits";
import { useVip } from "@/context/vip";
import { useProfiles, type PostComment } from "@/context/profiles-context";
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
import { useAlbumUrls } from "@/lib/album-storage";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({
    meta: [
      { title: "Feed — Conexão Privada" },
      {
        name: "description",
        content: "Acompanhe publicações, stories de perfis próximos e eventos da comunidade.",
      },
    ],
  }),
  component: FeedPage,
});

function PostCard({ post }: { post: ReturnType<typeof useProfiles>["posts"][number] }) {
  const author = post.profiles;
  const { isVip, openVipModal } = useVip();
  const {
    currentId,
    likePost,
    isPostLiked,
    addComment,
    getPostLikes,
    getPostComments,
    updatePost,
    deletePost,
  } = useProfiles();
  const navigate = useNavigate();
  const [comment, setComment] = useState("");
  const [likes, setLikes] = useState<ReturnType<typeof useProfiles>["profiles"]>([]);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loadingLikes, setLoadingLikes] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editedText, setEditedText] = useState(post.text);
  const isOwnPost = currentId === post.author_id;

  const loadLikes = async () => {
    setLoadingLikes(true);
    setLikes(await getPostLikes(post.id));
    setLoadingLikes(false);
  };

  const loadComments = async () => {
    setLoadingComments(true);
    setComments(await getPostComments(post.id));
    setLoadingComments(false);
  };

  if (!author) return null;

  return (
    <article className="overflow-hidden border-b border-border/60 bg-surface md:rounded-xl md:border">
      <div className="relative flex items-center gap-3 p-4">
        <AvatarOrb profile={author} size={40} profileId={author.id} clickable />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              to="/perfil/$id"
              params={{ id: author.id }}
              className="truncate text-sm font-semibold hover:underline"
              aria-label={`Ver perfil de ${author.nick}`}
            >
              {author.nick}
            </Link>
            {author.vip && <VipBadge />}
          </div>
          <p className="text-[11px] text-muted-foreground">{author.city}</p>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>{new Date(post.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <Dialog open={optionsOpen} onOpenChange={setOptionsOpen}>
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
              {isOwnPost ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setOptionsOpen(false);
                      setEditedText(post.text);
                      setEditOpen(true);
                    }}
                    className="rounded-lg border border-border bg-surface-2 px-4 py-3 text-left text-sm hover:text-foreground"
                  >
                    Editar publicação
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const removed = await deletePost(post.id);
                      setOptionsOpen(false);
                      if (removed) toast.success("Publicação removida");
                      else toast.error("Não foi possível remover a publicação");
                    }}
                    className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-left text-sm text-destructive hover:bg-destructive/10"
                  >
                    Remover publicação
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => toast.success("Perfil denunciado (protótipo)")}
                  className="rounded-lg border border-border bg-surface-2 px-4 py-3 text-left text-sm hover:text-foreground"
                >
                  Denunciar
                </button>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar publicação</DialogTitle>
              <DialogDescription>Atualize o texto da sua publicação.</DialogDescription>
            </DialogHeader>
            <Textarea
              value={editedText}
              onChange={(event) => setEditedText(event.target.value)}
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="rounded-full border border-border px-4 py-2 text-xs text-muted-foreground"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const updated = await updatePost(post.id, editedText);
                  if (!updated) {
                    toast.error("Não foi possível editar a publicação");
                    return;
                  }
                  setEditOpen(false);
                  toast.success("Publicação atualizada");
                }}
                disabled={!editedText.trim()}
                className="rounded-full bg-gradient-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              >
                Salvar
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <p className="px-4 pb-3 text-sm text-foreground/90">{post.text}</p>

      {post.image && (
        <FeedPhotoLightbox
          post={post}
          author={author}
          isVip={isVip}
          openVipModal={openVipModal}
          isLiked={isPostLiked(post.id)}
          onLike={() => void likePost(post.id)}
          onOpenOptions={() => setOptionsOpen(true)}
          onOpenComments={() => {
            setCommentsOpen(true);
            void loadComments();
          }}
        />
      )}

      <div className="flex items-center gap-2 border-t border-border/60 px-4 py-2">
        <button
          type="button"
          onClick={() => likePost(post.id)}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-surface-2 hover:text-primary-glow"
          aria-label={`Curtir publicação de ${author.nick}`}
        >
          <Heart
            className={`h-4 w-4 ${isPostLiked(post.id) ? "fill-primary-glow text-primary-glow" : ""}`}
          />
          <span>{post.likes}</span>
        </button>

        <Dialog onOpenChange={(open) => open && void loadLikes()}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <span>ver curtidas</span>
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Curtidas</DialogTitle>
              <DialogDescription>Quem curtiu esta publicação.</DialogDescription>
            </DialogHeader>
            <div className="max-h-72 space-y-3 overflow-y-auto">
              {loadingLikes ? (
                <p className="text-sm text-muted-foreground">Carregando curtidas...</p>
              ) : likes.length ? (
                likes.map((profile) => (
                  <div key={profile.id} className="flex items-start gap-3">
                    <AvatarOrb profile={profile} size={36} />
                    <span className="text-sm font-medium">@{profile.nick}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Ainda não há curtidas.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={commentsOpen}
          onOpenChange={(open) => {
            setCommentsOpen(open);
            if (open) void loadComments();
          }}
        >
          <DialogTrigger asChild>
            <button
              type="button"
              onClick={() => setCommentsOpen(true)}
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <MessageSquare className="h-4 w-4" />
              <span>{post.comments} comentários</span>
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Comentários</DialogTitle>
              <DialogDescription>Conversa sobre esta publicação.</DialogDescription>
            </DialogHeader>
            <div className="max-h-72 space-y-4 overflow-y-auto">
              {loadingComments ? (
                <p className="text-sm text-muted-foreground">Carregando comentários...</p>
              ) : comments.length ? (
                comments.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    {item.profile ? (
                      <AvatarOrb profile={item.profile} size={32} ring={true} />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-surface-2" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <p className="min-w-0 flex-1 text-xs font-semibold">
                          @{item.profile?.nick ?? "usuário"}
                        </p>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            type="button"
                            aria-label={`Mais opções do comentário de ${item.profile?.nick ?? "usuário"}`}
                            className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-52 border-border bg-surface"
                          >
                            <DropdownMenuItem
                              onClick={() => {
                                if (item.profile)
                                  void navigate({
                                    to: "/perfil/$id",
                                    params: { id: item.profile.id },
                                  });
                              }}
                            >
                              <UserRound className="mr-2 h-4 w-4" /> Visitar @
                              {item.profile?.nick ?? "perfil"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                toast.info("As curtidas deste comentário aparecerão aqui.")
                              }
                            >
                              <Heart className="mr-2 h-4 w-4" /> Ver curtidas
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => toast.success("Comentário denunciado")}
                            >
                              <Flag className="mr-2 h-4 w-4" /> Denunciar comentário
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <p className="mt-1 text-sm text-foreground/90">{item.body}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Ainda não há comentários.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <form
        className="flex gap-2 px-4 pb-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const text = comment.trim();
          if (!text) return;
          await addComment(post.id, text);
          setComment("");
        }}
      >
        <input
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Escreva um comentário..."
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          aria-label={`Comentar na publicação de ${author.nick}`}
        />
        <button
          type="submit"
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          disabled={!comment.trim()}
        >
          Comentar
        </button>
      </form>
    </article>
  );
}

function FeedPhotoLightbox({
  post,
  author,
  isVip,
  openVipModal,
  isLiked,
  onLike,
  onOpenOptions,
  onOpenComments,
}: {
  post: ReturnType<typeof useProfiles>["posts"][number];
  author: NonNullable<ReturnType<typeof useProfiles>["posts"][number]["profiles"]>;
  isVip: boolean;
  openVipModal: () => void;
  isLiked: boolean;
  onLike: () => void;
  onOpenOptions: () => void;
  onOpenComments: () => void;
}) {
  const [open, setOpen] = useState(false);
  const photoUrls = useAlbumUrls(post.image ? [post.image] : [], `${author.id}/public`);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="relative block w-full text-left">
          <MediaBlock
            hue={author.hue}
            src={photoUrls[0] ?? null}
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
        </button>
      </DialogTrigger>
      <DialogContent className="!left-0 !top-0 !translate-x-0 !translate-y-0 inset-0 flex h-[100dvh] w-screen max-w-none flex-col gap-0 rounded-none border-0 bg-black p-0 text-white [&>button:last-child]:hidden">
        <header className="relative z-10 flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-black/90 px-4">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label="Fechar publicação"
          >
            <X className="h-5 w-5" />
          </button>
          <AvatarOrb profile={author} size={36} profileId={author.id} clickable />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onOpenOptions();
            }}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label={`Mais opções da postagem de ${author.nick}`}
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black p-3 sm:p-6">
          <div className="relative flex max-h-full max-w-full items-center justify-center">
            <MediaBlock
              hue={author.hue}
              src={photoUrls[0] ?? null}
              alt={`Foto de ${author.nick}`}
              className="h-[min(70vw,calc(100dvh-9rem))] w-[min(70vw,calc(100dvh-9rem))] max-w-full rounded-lg sm:rounded-xl"
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-5 border-t border-white/10 bg-black/90 px-5 py-4">
          <button
            type="button"
            onClick={onLike}
            className="inline-flex items-center gap-2 text-sm text-white transition-colors hover:text-primary-glow"
            aria-label={`Curtir publicação de ${author.nick}`}
          >
            <Heart className={`h-5 w-5 ${isLiked ? "fill-primary-glow text-primary-glow" : ""}`} />
            <span>{post.likes}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onOpenComments();
            }}
            className="inline-flex items-center gap-2 text-sm text-white transition-colors hover:text-primary-glow"
            aria-label={`Abrir comentários da publicação de ${author.nick}`}
          >
            <MessageSquare className="h-5 w-5" />
            <span>{post.comments}</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FeedPage() {
  const { posts, isBlocked, isFollowing } = useProfiles();
  const [tab, setTab] = useState("all");

  const visiblePosts = posts.filter((post) => {
    if (!post.profiles) return false;
    if (post.wall_profile_id) return false;
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
