import { Crown, Check, QrCode, Copy } from "lucide-react";
import { useVip } from "@/context/vip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const benefits = [
  "Chat privado — inicie um bate-papo privado com quem quiser",
  "Preferência nas pesquisas — assinantes aparecem antes dos usuários free",
  "Veja todos que visitaram o seu perfil",
  "Curta perfis de forma ilimitada",
  "Vídeos liberados no feed e no chat",
  "Zero anúncios em toda a plataforma",
  "Destaque dourado no feed e no Explorar",
];

const plans = [
  { id: "m", label: "Mensal", price: "R$ 39,90", note: "por mês" },
  { id: "t", label: "Trimestral", price: "R$ 99,90", note: "R$ 33,30/mês", best: true },
];

export function VipModal() {
  const { vipModalOpen, closeVipModal, setVip } = useVip();

  return (
    <Dialog open={vipModalOpen} onOpenChange={(o) => !o && closeVipModal()}>
      <DialogContent className="max-w-md border-gold/40 bg-surface p-0 overflow-hidden">
        <div className="h-1 w-full bg-gradient-gold" />
        <div className="p-6">
          <DialogHeader>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-gold shadow-gold">
              <Crown className="h-5 w-5 text-gold-foreground" />
            </div>
            <DialogTitle className="text-2xl">
              Assinatura <span className="text-gradient-gold">VIP</span>
            </DialogTitle>
            <DialogDescription>
              Experiência completa, sem anúncios e com liberdade total de contato.
            </DialogDescription>
          </DialogHeader>

          <ul className="mt-5 space-y-2.5">
            {benefits.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <span className="text-foreground/90">{b}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {plans.map((p) => (
              <div
                key={p.id}
                className={`rounded-xl border p-3 ${p.best ? "border-gold/60 bg-gold/5" : "border-border bg-surface-2"}`}
              >
                <p className="text-xs text-muted-foreground">{p.label}</p>
                <p className="mt-1 text-lg font-semibold">{p.price}</p>
                <p className="text-[11px] text-muted-foreground">{p.note}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-gold/30 bg-surface-2 p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-16 w-16 place-items-center rounded-lg bg-gradient-gold">
                <QrCode className="h-9 w-9 text-gold-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">Pagamento via Pix</p>
                <p className="truncate text-xs text-muted-foreground">
                  00020126&#8230;conexaoprivada&#8230;5204000053039865802BR
                </p>
                <button
                  type="button"
                  onClick={() => toast.success("Código Pix copiado (simulado)")}
                  className="mt-1 inline-flex items-center gap-1 text-xs text-gold hover:underline"
                >
                  <Copy className="h-3 w-3" /> Copiar código
                </button>
              </div>
            </div>
          </div>

          <Button
            className="mt-5 w-full bg-gradient-gold font-semibold text-gold-foreground hover:opacity-90"
            onClick={() => {
              setVip(true);
              closeVipModal();
              toast.success("Pagamento simulado confirmado — você agora é VIP 👑");
            }}
          >
            Já paguei — ativar VIP
          </Button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Protótipo visual: nenhum pagamento real é processado.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
