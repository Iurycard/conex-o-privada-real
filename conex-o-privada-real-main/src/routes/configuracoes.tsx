import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ChevronRight,
  Edit3,
  Eye,
  FileText,
  Image,
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
} from "lucide-react";
import { useState, type ComponentType } from "react";
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
import { Switch } from "@/components/ui/switch";
import { useVip } from "@/context/vip";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/configuracoes")({
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

const metrics = [
  { icon: Image, label: "Minhas fotos", value: "43" },
  { icon: Users, label: "Amigos e seguidores", value: "153" },
  { icon: Eye, label: "Visitas recebidas", value: "4.998" },
];

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
  const { openVipModal } = useVip();
  const [darkMode, setDarkMode] = useState(true);

  const showPrototype = (label: string) => toast(`${label}: recurso em demonstração`);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-0 md:py-8">
        <header className="mb-7">
          <p className="text-xs font-medium text-primary-glow">Sua conta</p>
          <h1 className="mt-1 text-2xl font-semibold">Configurações</h1>
        </header>

        <div className="space-y-6">
          <SettingsSection title="Métricas da conta">
            {metrics.map((item) => (
              <SettingsRow
                key={item.label}
                {...item}
                onClick={() => {
                  if (item.label === "Amigos e seguidores") {
                    navigate({ to: "/configuracoes/amigos" });
                    return;
                  }
                  showPrototype(item.label);
                }}
              />
            ))}
          </SettingsSection>

          <SettingsSection title="Configurações gerais">
            {general.map((item) => (
              <SettingsRow
                key={item.label}
                icon={item.icon}
                label={item.label}
                onClick={() => {
                  if (item.label === "Editar perfil") {
                    navigate({ to: "/cadastro" });
                    return;
                  }
                  if (item.vip) {
                    openVipModal();
                    return;
                  }
                  showPrototype(item.label);
                }}
              />
            ))}
          </SettingsSection>

          <SettingsSection title="Segurança e conta">
            {security.map((item) => (
              <SettingsRow key={item.label} {...item} onClick={() => showPrototype(item.label)} />
            ))}
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
            {others.map((item) => (
              <SettingsRow key={item.label} {...item} onClick={() => showPrototype(item.label)} />
            ))}
          </SettingsSection>

          <section aria-label="Ações da conta" className="space-y-3">
            <div className="overflow-hidden rounded-xl border border-destructive/25 bg-surface">
              <SettingsRow label="Sair" destructive onClick={() => navigate({ to: "/" })} />
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
    </AppShell>
  );
}