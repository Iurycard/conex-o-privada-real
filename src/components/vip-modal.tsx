import { Crown, Check, QrCode, Copy } from "lucide-react";
import { useEffect, useState } from "react";
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
  "veja quem segue você e quem você segue",
];

const plans = [
  { id: "mensal", label: "Mensal", price: "R$ 19,90", note: "30 dias" },
  { id: "trimestral", label: "Trimestral", price: "R$ 49,90", note: "90 dias", best: true },
];

export function VipModal() {
  const { vipModalOpen, closeVipModal, isVip, refreshVip } = useVip();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("pix");
  const [planType, setPlanType] = useState<"mensal" | "trimestral">("trimestral");
  const [qrCode, setQrCode] = useState("");
  const [qrCodeBase64, setQrCodeBase64] = useState("");

  useEffect(() => {
    if (!qrCode || isVip) return;
    const timer = window.setInterval(() => {
      void refreshVip().then((active) => {
        if (active) {
          setQrCode("");
          setQrCodeBase64("");
          closeVipModal();
          toast.success("Pagamento aprovado. Seu VIP está ativo!");
        }
      }).catch(() => {});
    }, 5000);
    return () => window.clearInterval(timer);
  }, [qrCode, isVip, refreshVip, closeVipModal]);

  const startCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const response = await fetch(paymentMethod === "pix" ? "/api/checkout-pix" : "/api/checkout-card", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planType }),
      });
      const payload = await response.json() as {
        error?: string;
        checkoutUrl?: string;
        qr_code?: string;
        qr_code_base64?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível iniciar o pagamento");
      if (paymentMethod === "card") {
        if (!payload.checkoutUrl) throw new Error("O Mercado Pago não retornou o link do checkout");
        window.location.assign(payload.checkoutUrl);
        return;
      }
      if (!payload.qr_code || !payload.qr_code_base64) {
        throw new Error("O Mercado Pago não retornou o QR Code PIX");
      }
      setQrCode(payload.qr_code);
      setQrCodeBase64(payload.qr_code_base64);
      toast.success("QR Code PIX gerado. Aguardando confirmação do pagamento.");
    } catch (error) {
      console.error("Erro ao iniciar checkout VIP:", error);
      toast.error(error instanceof Error ? error.message : "Não foi possível iniciar o pagamento");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const copyPixCode = async () => {
    try {
      await navigator.clipboard.writeText(qrCode);
      toast.success("Código PIX copiado");
    } catch (error) {
      console.error("Não foi possível copiar o código PIX:", error);
      toast.error("Não foi possível copiar automaticamente. Selecione e copie o código PIX.");
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
              <button
                key={p.id}
                type="button"
                aria-pressed={planType === p.id}
                onClick={() => {
                  setPlanType(p.id as "mensal" | "trimestral");
                  setQrCode("");
                  setQrCodeBase64("");
                }}
                className={`rounded-xl border p-3 text-left ${planType === p.id ? "border-gold/60 bg-gold/5" : "border-border bg-surface-2"}`}
              >
                <p className="text-xs text-muted-foreground">{p.label}</p>
                <p className="mt-1 text-lg font-semibold">{p.price}</p>
                <p className="text-[11px] text-muted-foreground">{p.note}</p>
              </button>
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
            {qrCode ? (
              <div className="space-y-3 text-center">
                <img
                  src={`data:image/png;base64,${qrCodeBase64}`}
                  alt="QR Code para pagamento PIX VIP"
                  className="mx-auto h-48 w-48 rounded-lg bg-white p-2"
                />
                <p className="text-sm font-medium">Escaneie o QR Code ou copie o código PIX</p>
                <textarea
                  readOnly
                  value={qrCode}
                  aria-label="Código PIX Copia e Cola"
                  className="min-h-20 w-full resize-y rounded-lg border border-border bg-background p-2 text-xs text-foreground"
                />
                <Button type="button" variant="outline" className="w-full" onClick={() => void copyPixCode()}>
                  <Copy className="mr-2 h-4 w-4" /> Copiar código PIX
                </Button>
                <p className="text-xs text-muted-foreground">Aguardando confirmação do Mercado Pago…</p>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="grid h-16 w-16 place-items-center rounded-lg bg-gradient-gold">
                  <QrCode className="h-9 w-9 text-gold-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">Pagamento via Pix</p>
                  <p className="text-xs text-muted-foreground">O QR Code será gerado pelo Mercado Pago.</p>
                </div>
              </div>
            )}
          </div>
          ) : (
            <div className="mt-5 rounded-xl border border-gold/30 bg-surface-2 p-4">
              <p className="text-sm font-medium">Pagamento seguro com cartão</p>
              <p className="text-xs text-muted-foreground">
                Você continuará no checkout hospedado do Mercado Pago. Os dados do cartão não passam pelo nosso site.
              </p>
            </div>
          )}

          <Button
            className="mt-5 w-full bg-gradient-gold font-semibold text-gold-foreground hover:opacity-90"
            onClick={() => void startCheckout()}
            disabled={checkoutLoading || Boolean(qrCode) || isVip}
          >
            {checkoutLoading
              ? "Conectando ao Mercado Pago…"
              : paymentMethod === "pix"
                ? qrCode ? "Aguardando pagamento PIX…" : "Gerar QR Code PIX"
                : "Pagar com cartão"}
          </Button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            O VIP será ativado após a confirmação segura do pagamento.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
