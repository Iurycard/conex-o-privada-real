import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { d1 } from "@/lib/d1-client"
import { useAuth } from "@/hooks/use-auth";

export type ReportTarget = {
  reportedProfileId?: string;
  postId?: string;
  details?: string;
};

type ReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ReportTarget | null;
};

const reasons = [
  "Assédio ou discurso de ódio",
  "Conteúdo sexual explícito",
  "Perfil falso ou golpe",
  "Conteúdo ilegal ou perigoso",
  "Outro",
];

export function ReportDialog({ open, onOpenChange, target }: ReportDialogProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReason("");
    setDetails(target?.details ?? "");
  }, [open, target?.details, target?.postId, target?.reportedProfileId]);

  const submitReport = async () => {
    if (!target || !reason || (!target.reportedProfileId && !target.postId)) return;
    if (!user) {
      toast.error("Entre na sua conta para enviar uma denúncia");
      return;
    }
    setSubmitting(true);
    const { error } = await d1.from("reports").insert({
      reporter_id: user.id,
      reported_profile_id: target.reportedProfileId ?? null,
      post_id: target.postId ?? null,
      reason,
      details: details.trim() || null,
      status: "pending",
    });
    setSubmitting(false);
    if (error) {
      toast.error("Não foi possível enviar a denúncia");
      return;
    }
    toast.success("Denúncia enviada para moderação");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-surface">
        <DialogHeader>
          <DialogTitle className="text-destructive">Denunciar</DialogTitle>
          <DialogDescription>Escolha um motivo para ajudar a equipe a analisar esta denúncia.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="report-reason" className="text-sm font-medium">Motivo</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="report-reason" aria-label="Motivo da denúncia">
                <SelectValue placeholder="Selecione um motivo" />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label htmlFor="report-details" className="text-sm font-medium">Detalhes (opcional)</label>
            <Textarea
              id="report-details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Conte o que aconteceu"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={() => void submitReport()} disabled={!reason || submitting}>
            {submitting ? "Enviando..." : "Enviar denúncia"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}