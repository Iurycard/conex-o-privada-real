import { Crown, Check, QrCode, Copy } from "lucide-react";
import { useState } from "react";
import { useVip } from "@/context/vip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const benefits = [
  "Chat privado — inicie um bate-papo privado com quem quiser",
  "Preferência nas pesquisas — assinantes aparecem antes dos usuários free",
  "Veja todos que visitaram o seu perfil",
  "Curta perfis de forma ilimitada",
  "Acesse álbuns privados quando o dono autorizar",
  "Zero anúncios em toda a plataforma",
  "Destaque dourado no feed e no Explorar",
];

const plans = [
  { id: "m", label: "Mensal", price: "R$ 39,90", note: "por mês" },
  { id: "t", label: "Trimestral", price: "R$ 99,90", note: "R$ 33,30/mês", best: true },
];

export function VipModal() {
  const { vipModalOpen, closeVipModal, setVip } = useVip();
  const [activating, setActivating] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("pix");

  const handleActivatePrototypeVip = async () => {
    setActivating(true);
    try {
      const response = await fetch("/api/vip/activate", {
        method: "POST",
        credentials: "same-origin",
      });
      const payload = await response.json() as { error?: string; data?: { vip?: boolean }; simulated?: boolean };
      if (!response.ok || !payload.data?.vip || !payload.simulated) {
        throw new Error(payload.error ?? "Não foi possível ativar o VIP de teste");
      }
      setVip(true);
      closeVipModal();
      toast.success("VIP de teste ativado. Nenhum pagamento real foi processado.");
    } catch (error) {
      console.error("Erro ao ativar VIP de teste:", error);
      toast.error(error instanceof Error ? error.message : "Não foi possível ativar o VIP de teste");
    } finally {
      setActivating(false);
    }
  };

  return (
    <Dialog open={vipModalOpen} onOpenChange={(o) => !o && closeVipModal()}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] !w-[calc(100%-1rem)] max-w-md overflow-y-auto overscroll-contain border-gold/40 bg-surface p-0 sm:max-h-[calc(100dvh-2rem)]">
        <div className="h-1 w-full bg-gradient-gold" />
        <div className="p-4 sm:p-6">
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

          <div className="mt-5 grid grid-cols-2 gap-2" aria-label="Forma de pagamento">
            <button
              type="button"
              aria-pressed={paymentMethod === "pix"}
              onClick={() => setPaymentMethod("pix")}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                paymentMethod === "pix" ? "border-gold bg-gold/10 text-gold" : "border-border text-muted-foreground hover:bg-surface-2"
              }`}
            >
              Pix
            </button>
            <button
              type="button"
              aria-pressed={paymentMethod === "card"}
              onClick={() => setPaymentMethod("card")}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                paymentMethod === "card" ? "border-gold bg-gold/10 text-gold" : "border-border text-muted-foreground hover:bg-surface-2"
              }`}
            >
              Cartão de crédito
            </button>
          </div>

          {paymentMethod === "pix" ? (
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
          ) : (
            <fieldset className="mt-5 space-y-3 rounded-xl border border-gold/30 bg-surface-2 p-4" disabled>
              <legend className="px-1 text-sm font-medium">Cartão de crédito — demonstração</legend>
              <label className="block space-y-1 text-xs text-muted-foreground">
                Número do cartão
                <input
                  disabled
                  placeholder="Disponível após integração de pagamento"
                  className="w-full rounded-lg border border-border bg-background/70 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                />
              </label>
              <label className="block space-y-1 text-xs text-muted-foreground">
                Nome impresso no cartão
                <input
                  disabled
                  placeholder="Checkout ainda não conectado"
                  className="w-full rounded-lg border border-border bg-background/70 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1 text-xs text-muted-foreground">
                  Validade
                  <input
                    disabled
                    placeholder="MM/AA"
                    className="w-full rounded-lg border border-border bg-background/70 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                  />
                </label>
                <label className="block space-y-1 text-xs text-muted-foreground">
                  CVV
                  <input
                    disabled
                    placeholder="•••"
                    className="w-full rounded-lg border border-border bg-background/70 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                  />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Demonstração: não informe dados reais. O cartão não é processado nem armazenado.
              </p>
            </fieldset>
          )}

          <Button
            className="mt-5 w-full bg-gradient-gold font-semibold text-gold-foreground hover:opacity-90"
            onClick={() => void handleActivatePrototypeVip()}
            disabled={activating}
          >
            {activating ? "Ativando VIP de teste..." : "Já paguei — ativar VIP"}
          </Button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Protótipo visual: nenhum pagamento real é processado.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
