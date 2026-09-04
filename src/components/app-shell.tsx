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
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useVip } from "@/context/vip";
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

function PostButton() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="inline-flex items-center gap-1.5 rounded-full bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-neon">
          <PenSquare className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Postar</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova publicação</DialogTitle>
          <DialogDescription>Compartilhe algo com a comunidade.</DialogDescription>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="O que você quer contar?"
          rows={4}
          aria-label="Texto da publicação"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setOpen(false)}
            className="rounded-full border border-border px-4 py-2 text-xs text-muted-foreground"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (!text.trim()) {
                toast.error("Escreva algo antes de publicar");
                return;
              }
              setText("");
              setOpen(false);
              toast.success("Publicação criada (protótipo)");
            }}
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
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:px-4">
          <Logo />
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
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
              <Icon className="h-4.5 w-4.5" />
              {label}
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
              className="flex flex-col items-center gap-1 py-2.5 text-[10px] text-muted-foreground"
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
