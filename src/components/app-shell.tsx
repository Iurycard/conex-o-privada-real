import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Settings,
  Home,
  Compass,
  MessageCircle,
  User,
  Crown,
  Shield,
  UserPlus,
  PenSquare,
  Image as ImageIcon,
  Lock,
  Video,
  X,
} from "lucide-react";
import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { useVip } from "@/context/vip";
import { useProfiles } from "@/context/profiles-context";
import { useSocial } from "@/hooks/use-social";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import logoimg from "@/assets/logo.png";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function openPostComposer(album: "public" | "private" = "public") {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("conexao-privada:open-post-composer", { detail: { album } }));
  }
}

function PostButton() {
  const { isVip, openVipModal } = useVip();
  const { createPost } = useProfiles();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    const handleOpenComposer = (event: Event) => {
      const album = (event as CustomEvent<{ album?: "public" | "private" }>).detail?.album;
      if (album) setVisibility(album);
      setOpen(true);
    };
    window.addEventListener("conexao-privada:open-post-composer", handleOpenComposer);
    return () => window.removeEventListener("conexao-privada:open-post-composer", handleOpenComposer);
  }, []);

  const resetDraft = () => {
    setText("");
    setMediaUrl(null);
    setMediaType(null);
    setVisibility("public");
    setSelectedFile(null);
  };

  const handleMediaChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    if (isVideo && !isVip) {
      event.target.value = "";
      openVipModal();
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setMediaUrl(reader.result);
        setMediaType(isVideo ? "video" : "image");
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handlePublish = async () => {
    const hasContent = text.trim().length > 0 || !!mediaUrl;
    if (!hasContent) {
      toast.error("Adicione texto ou uma mídia antes de publicar");
      return;
    }

    if (mediaType === "video" && !isVip) {
      openVipModal();
      return;
    }

    const saved = await createPost({
      text,
      mediaType: mediaType ?? (mediaUrl ? "image" : undefined),
      mediaUrl: mediaUrl ?? undefined,
      album: visibility,
      mediaFile: selectedFile ?? undefined,
    });

    if (!saved) {
      toast.error("Não foi possível salvar a publicação");
      return;
    }

    resetDraft();
    setOpen(false);
    toast.success("Publicação criada");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Criar nova publicação"
          title="Postar"
          className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-gradient-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground shadow-neon sm:text-xs"
        >
          <PenSquare className="h-3.5 w-3.5" />
          <span>Postar</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto p-4 sm:max-h-[calc(100dvh-2rem)] sm:max-w-md sm:p-6">
        <DialogHeader>
          <DialogTitle>Nova publicação</DialogTitle>
          <DialogDescription>Compartilhe algo com a comunidade.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-2">
          <span className="text-sm font-medium text-foreground">Compartilhe seus desejos...</span>
          <span className="flex items-center gap-2 rounded-full border border-border bg-surface-2 px-2 py-1 text-[10px] text-muted-foreground">
            {visibility === "public" ? "Público" : "Privado"}
          </span>
        </div>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Compartilhe seus desejos..."
          rows={4}
          aria-label="Texto da publicação"
        />

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
              <ImageIcon className="h-4 w-4" />
              Foto
              <input type="file" accept="image/*" className="sr-only" onChange={handleMediaChange} />
            </label>

            <label
              className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-xs ${
                isVip
                  ? "border-border bg-surface text-muted-foreground hover:text-foreground"
                  : "border-gold/40 text-gold"
              }`}
            >
              {isVip ? <Video className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
              {isVip ? "Vídeo" : "Vídeo (VIP)"}
              <input type="file" accept="video/*" className="sr-only" onChange={handleMediaChange} />
            </label>
          </div>

          {mediaUrl && (
            <div className="relative h-20 overflow-hidden rounded-xl border border-border bg-surface sm:h-28">
              {mediaType === "video" ? (
                <video src={mediaUrl} controls className="h-full w-full object-contain" />
              ) : (
                <img src={mediaUrl} alt="Mídia anexada" className="h-full w-full object-contain" />
              )}

              <button
                type="button"
                onClick={() => {
                  setMediaUrl(null);
                  setMediaType(null);
                  setSelectedFile(null);
                }}
                className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white"
                aria-label="Remover mídia"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface-2 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Visibilidade</p>
            <div className="inline-flex rounded-full border border-border bg-background p-1">
              <button
                type="button"
                onClick={() => setVisibility("public")}
                className={`rounded-full px-3 py-1 text-xs font-medium ${visibility === "public" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                Público
              </button>
              <button
                type="button"
                onClick={() => setVisibility("private")}
                className={`rounded-full px-3 py-1 text-xs font-medium ${visibility === "private" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                Privado
              </button>
            </div>
          </div>

          <p className="text-sm text-foreground">
            {visibility === "public" ? "Público (todos podem ver)" : "Privado (apenas você e perfis aprovados)"}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-foreground/90">
          <p className="mb-2 font-medium">Não são permitidas postagens com:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Menores de idade</li>
            <li>• Crimes sexuais</li>
            <li>• Venda de conteúdo</li>
            <li>• Drogas, remédios ou armas</li>
            <li>• Número de telefone</li>
          </ul>
        </div>

        <div className="sticky bottom-0 -mx-4 -mb-4 flex justify-end gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:mb-0 sm:border-t-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
          <button
            onClick={() => {
              resetDraft();
              setOpen(false);
            }}
            className="rounded-full border border-border px-4 py-2 text-xs text-muted-foreground"
          >
            Cancelar
          </button>
          <button
            onClick={handlePublish}
            className="rounded-full bg-gradient-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            Publicar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const navItems = [
  { to: "/feed", label: "Feed", icon: Home },
  { to: "/explorar", label: "Explorar", icon: Compass },
  { to: "/notificacoes", label: "Notificações", icon: Bell },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;


function Logo() {
  return (
    <Link to="/feed" className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary shadow-neon">
        <img
        src={logoimg}
        alt="logo"
        className="h-full w-full object-cover"
      />
      </span>
      <span className="hidden font-display text-sm font-semibold tracking-tight min-[381px]:inline">
        Conexão <span className="text-primary-glow">Privada</span>
      </span>
    </Link>
  );
}




export function AppShell({ children }: { children: ReactNode }) {
  const { isVip, toggleVip, openVipModal } = useVip();
  const { unreadCount } = useSocial();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:px-4">
          <Logo />
          <div className="ml-auto flex min-w-0 items-center justify-end gap-1.5 sm:gap-2">
            <label className="hidden items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 sm:flex">
              <span className="text-[11px] text-muted-foreground">Modo</span>
              <Switch checked={isVip} onCheckedChange={toggleVip} aria-label="Alternar Free/VIP" />
              <span className={`text-[11px] font-semibold ${isVip ? "text-gold" : "text-muted-foreground"}`}>
                {isVip ? "VIP" : "Free"}
              </span>
            </label>

            {!isVip && (
              <button
                onClick={openVipModal}
                className="hidden items-center gap-1.5 rounded-full border border-gold/40 px-3 py-1.5 text-xs font-medium text-gold hover:bg-gold/10 sm:inline-flex"
              >
                <Crown className="h-3.5 w-3.5" /> Seja VIP
              </button>
            )}

            <PostButton />


            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => navigate({ to: "/configuracoes" })}
              className="h-10 w-10 shrink-0 rounded-full border-border bg-surface text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              aria-label="Abrir configurações"
              title="Configurações"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-0 pt-14 md:px-4">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 flex-col gap-1 border-r border-border/60 py-6 pr-3 md:flex">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeProps={{ className: "bg-surface text-foreground border-border" }}
              className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-surface/70 hover:text-foreground"
            >
              <span className="relative">
                <Icon className="h-4.5 w-4.5" />
                {to === "/notificacoes" && unreadCount > 0 && (
                  <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </span>
              <span>{label}</span>
            </Link>
          ))}
          <Link
            to="/cadastro"
            className="mt-2 flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <UserPlus className="h-4 w-4" /> Criar novo perfil
          </Link>
          <button
            onClick={openVipModal}
            className="mt-2 flex items-center gap-2 rounded-xl border border-gold/40 px-3 py-2.5 text-sm font-medium text-gold hover:bg-gold/10"
          >
            <Crown className="h-4 w-4" /> Assinatura VIP
          </button>
        </aside>

        <main className="min-w-0 flex-1 pb-24 md:pb-10">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeProps={{ className: "text-primary-glow" }}
              className="relative flex flex-col items-center gap-1 py-2.5 text-[10px] text-muted-foreground"
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
                {to === "/notificacoes" && unreadCount > 0 && (
                  <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </span>
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
