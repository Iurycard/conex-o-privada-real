import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  BadgeCheck,
  Check,
  CircleDollarSign,
  FileImage,
  Flag,
  Gauge,
  ImageOff,
  LifeBuoy,
  ShieldAlert,
  UserRoundX,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminDashboard,
});

type AdminView = "overview" | "reports" | "users" | "media" | "verification" | "support" | "monetization";

type AdminReport = {
  id: string;
  reporter_id: string;
  reporter_name: string | null;
  reported_profile_id: string | null;
  reported_name: string | null;
  post_id: string | null;
  post_author_id: string | null;
  post_text: string | null;
  post_image: string | null;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
};

type AdminUser = {
  id: string;
  email: string;
  nick: string | null;
  username: string | null;
  avatar: string | null;
  vip: number;
  account_status: "active" | "suspended";
  suspension_reason: string | null;
  suspended_until: string | null;
  verified: number;
  created_at: string;
};

type AdminMedia = {
  profile_id: string;
  nick: string;
  kind: "public" | "private";
  key: string;
  created_at: string;
};

type VerificationRequest = {
  id: string;
  user_id: string;
  evidence_key: string;
  status: string;
  created_at: string;
  nick: string;
  username: string;
  avatar: string | null;
};

type SupportReply = {
  id: string;
  author_role: string;
  body: string;
  created_at: string;
};

type SupportTicket = {
  id: string;
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  created_at: string;
  replies: SupportReply[];
};

type AdminData = {
  stats: { users: number; reports: number; posts: number; suspended: number; vip: number; free: number };
  reports: AdminReport[];
  users: AdminUser[];
  media: AdminMedia[];
  verificationRequests: VerificationRequest[];
  tickets: SupportTicket[];
  audit: { id: string; actor_id: string | null; action: string; target_type: string; target_id: string | null; details: string; created_at: string }[];
  adsEnabled: boolean;
};

const navigation: { id: AdminView; label: string; icon: typeof Gauge }[] = [
  { id: "overview", label: "Visão geral", icon: Gauge },
  { id: "reports", label: "Denúncias", icon: ShieldAlert },
  { id: "users", label: "Usuários", icon: Users },
  { id: "media", label: "Auditoria de mídias", icon: FileImage },
  { id: "verification", label: "Verificações", icon: BadgeCheck },
  { id: "support", label: "Suporte", icon: LifeBuoy },
  { id: "monetization", label: "Monetização", icon: CircleDollarSign },
];

function mediaUrl(value: string | null) {
  if (!value) return null;
  if (/^(https?:|data:|\/)/.test(value)) return value;
  return `/api/media?key=${encodeURIComponent(value)}`;
}

function canDeleteR2AlbumPhoto(key: string) {
  return /^[^/]+\/(public|private)\/r2\/[a-zA-Z0-9-]+\.webp$/i.test(key);
}

function formatDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("pt-BR");
}

function AdminDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [activeView, setActiveView] = useState<AdminView>("overview");
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    const response = await fetch("/api/admin/dashboard", { credentials: "same-origin" });
    const payload = await response.json() as AdminData & { error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar o painel");
    setData(payload);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/entrar", replace: true });
      return;
    }
    if (user.app_metadata.role !== "admin") {
      toast.error("Acesso restrito à administração");
      navigate({ to: "/", replace: true });
      return;
    }
    let active = true;
    void loadDashboard()
      .catch((error: unknown) => {
        console.error("Erro ao carregar painel administrativo:", error);
        if (active) toast.error(error instanceof Error ? error.message : "Não foi possível carregar o painel");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authLoading, loadDashboard, navigate, user]);

  const runAction = async (action: Record<string, unknown>, successMessage: string) => {
    setBusy(String(action["ticketId"] ?? action["reportId"] ?? action["userId"] ?? action["key"] ?? action["action"]));
    try {
      const response = await fetch("/api/admin/action", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(action),
      });
      const payload = await response.json() as {
        error?: string;
        emailError?: string | null;
        cleanupError?: string | null;
        emailSent?: boolean;
      };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível executar a ação");
      if (payload.cleanupError) {
        toast.error(`A alteração foi salva, mas a limpeza do arquivo falhou: ${payload.cleanupError}`);
      } else if (payload.emailError) {
        if (typeof action["ticketId"] === "string" && typeof action["reply"] === "string") {
          setReplyDrafts((current) => ({ ...current, [String(action["ticketId"])]: "" }));
        }
        toast.error(`Alteração salva, mas o e-mail de resposta falhou: ${payload.emailError}`);
      } else {
        if (typeof action["ticketId"] === "string" && typeof action["reply"] === "string") {
          setReplyDrafts((current) => ({ ...current, [String(action["ticketId"])]: "" }));
        }
        toast.success(successMessage);
      }
      await loadDashboard();
    } catch (error) {
      console.error("Erro em ação administrativa:", error);
      toast.error(error instanceof Error ? error.message : "Não foi possível executar a ação");
    } finally {
      setBusy(null);
    }
  };

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase();
    return (data?.users ?? []).filter((item) =>
      `${item.nick ?? ""} ${item.username ?? ""} ${item.email}`.toLocaleLowerCase().includes(query),
    );
  }, [data?.users, searchTerm]);

  if (authLoading || loading) {
    return <main className="mx-auto max-w-7xl p-6 text-sm text-slate-400">Carregando painel administrativo…</main>;
  }
  if (!data) {
    return (
      <main className="mx-auto max-w-3xl p-6 text-slate-100">
        <h1 className="text-xl font-semibold">Não foi possível carregar o painel</h1>
        <button type="button" onClick={() => { setLoading(true); void loadDashboard().catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Falha ao carregar")).finally(() => setLoading(false)); }} className="mt-4 rounded-lg bg-slate-700 px-4 py-2 text-sm">
          Tentar novamente
        </button>
      </main>
    );
  }

  const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: number; icon: typeof Gauge; color: string }) => (
    <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800 p-4">
      <div>
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <p className={`mt-1 text-2xl font-bold ${color}`}>{value.toLocaleString("pt-BR")}</p>
      </div>
      <Icon className={`h-6 w-6 ${color}`} />
    </div>
  );

  const heading = navigation.find((item) => item.id === activeView)?.label ?? "Visão geral";

  return (
    <main className="mx-auto max-w-[1440px] space-y-6 p-4 text-slate-100 sm:p-6">
      <header>
        <p className="text-xs font-medium uppercase tracking-wide text-rose-300">Administração</p>
        <h1 className="mt-1 text-2xl font-bold text-white">Painel de administração e moderação</h1>
        <p className="mt-1 text-sm text-slate-400">Ações protegidas no Worker e persistidas no D1.</p>
      </header>

      <section aria-label="Indicadores" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Usuários cadastrados" value={data.stats.users} icon={Users} color="text-sky-300" />
        <StatCard label="Denúncias na fila" value={data.stats.reports} icon={ShieldAlert} color="text-amber-300" />
        <StatCard label="Publicações ativas" value={data.stats.posts} icon={FileImage} color="text-emerald-300" />
        <StatCard label="Perfis suspensos" value={data.stats.suspended} icon={UserRoundX} color="text-rose-300" />
      </section>

      <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Seções administrativas" className="flex gap-2 overflow-x-auto rounded-xl border border-slate-700 bg-slate-800/70 p-2 md:flex-col md:overflow-visible md:self-start">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveView(id)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                activeView === id ? "bg-rose-500/15 text-rose-200" : "text-slate-300 hover:bg-slate-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {id === "reports" && data.stats.reports > 0 && <span className="ml-auto rounded-full bg-amber-400/15 px-2 py-0.5 text-xs text-amber-200">{data.stats.reports}</span>}
              {id === "support" && data.tickets.filter((ticket) => ticket.status === "open" || ticket.status === "in_progress").length > 0 && (
                <span className="ml-auto rounded-full bg-sky-400/15 px-2 py-0.5 text-xs text-sky-200">
                  {data.tickets.filter((ticket) => ticket.status === "open" || ticket.status === "in_progress").length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <section className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">{heading}</h2>
            <button type="button" onClick={() => void loadDashboard().catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Falha ao atualizar"))} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800">
              Atualizar dados
            </button>
          </div>

          {activeView === "overview" && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <StatCard label="Assinantes VIP (protótipo)" value={data.stats.vip} icon={CircleDollarSign} color="text-amber-300" />
                <StatCard label="Contas Free" value={data.stats.free} icon={Users} color="text-slate-200" />
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
                <h3 className="font-medium text-white">Acompanhamento</h3>
                <p className="mt-2 text-sm text-slate-400">
                  {data.stats.reports} denúncias aguardam ação; {data.tickets.filter((ticket) => ticket.status === "open" || ticket.status === "in_progress").length} solicitações de suporte estão abertas.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setActiveView("reports")} className="rounded-lg bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600">Abrir moderação</button>
                  <button type="button" onClick={() => setActiveView("support")} className="rounded-lg bg-slate-700 px-3 py-2 text-sm hover:bg-slate-600">Abrir suporte</button>
                </div>
              </div>
            </>
          )}

          {activeView === "reports" && (
            <div className="space-y-3">
              {data.reports.map((report) => (
                <article key={report.id} className="space-y-3 rounded-xl border border-slate-700 bg-slate-800/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-amber-200">{report.reason}</p>
                      <p className="mt-1 text-xs text-slate-400">Por {report.reporter_name ?? report.reporter_id} · {formatDate(report.created_at)} · {report.status}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {report.status === "pending" && (
                        <button type="button" disabled={busy === report.id} onClick={() => void runAction({ action: "report_status", reportId: report.id, status: "in_review" }, "Denúncia marcada em análise")} className="rounded-md bg-slate-700 px-2.5 py-1.5 text-xs hover:bg-slate-600">Analisar</button>
                      )}
                      {report.post_id && (
                        <button type="button" disabled={busy === report.id} onClick={() => {
                          if (window.confirm("Excluir permanentemente a publicação denunciada?")) {
                            void runAction({ action: "delete_reported_post", reportId: report.id }, "Publicação removida e denúncia resolvida");
                          }
                        }} className="rounded-md bg-rose-500/15 px-2.5 py-1.5 text-xs text-rose-200 hover:bg-rose-500/25">Excluir publicação</button>
                      )}
                      {report.reported_profile_id && (
                        <button type="button" disabled={busy === report.id} onClick={() => {
                          const reason = window.prompt("Motivo da suspensão (mínimo 5 caracteres):");
                          if (reason !== null) {
                            void runAction({ action: "account_status", userId: report.reported_profile_id, status: "suspended", reason, durationDays: 30, reportId: report.id }, "Conta suspensa por 30 dias; denúncia resolvida");
                          }
                        }} className="rounded-md bg-rose-500/15 px-2.5 py-1.5 text-xs text-rose-200 hover:bg-rose-500/25">Suspender 30 dias</button>
                      )}
                      <button type="button" disabled={busy === report.id} onClick={() => void runAction({ action: "report_status", reportId: report.id, status: "dismissed" }, "Denúncia arquivada")} className="rounded-md border border-slate-600 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700">Ignorar</button>
                      <button type="button" disabled={busy === report.id} onClick={() => void runAction({ action: "report_status", reportId: report.id, status: "resolved" }, "Denúncia resolvida")} aria-label="Resolver denúncia" className="rounded-md border border-emerald-500/30 p-1.5 text-emerald-300 hover:bg-emerald-500/10"><Check className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300">{report.details || "Sem detalhes adicionais."}</p>
                  <div className="rounded-lg bg-slate-900/70 p-3 text-sm">
                    {report.post_id ? (
                      <>
                        <p className="text-xs text-slate-500">Publicação de {report.post_author_id ?? "usuário"}</p>
                        {report.post_text && <p className="mt-1 whitespace-pre-wrap">{report.post_text}</p>}
                        {report.post_image && <img src={mediaUrl(report.post_image) ?? undefined} alt="Mídia da publicação denunciada" className="mt-3 max-h-64 rounded-lg object-contain" />}
                      </>
                    ) : (
                      <p>Perfil denunciado: {report.reported_name ?? report.reported_profile_id ?? "não identificado"}</p>
                    )}
                    {report.reported_profile_id && (
                      <Link to="/perfil/$id" params={{ id: report.reported_profile_id }} className="mt-2 inline-block text-xs text-sky-300 underline">Abrir perfil denunciado</Link>
                    )}
                  </div>
                </article>
              ))}
              {data.reports.length === 0 && <p className="rounded-xl border border-slate-700 bg-slate-800/50 p-8 text-center text-sm text-slate-400">Nenhuma denúncia pendente ou em análise.</p>}
            </div>
          )}

          {activeView === "users" && (
            <div className="space-y-3">
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar por nome, usuário ou e-mail" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-rose-400" />
              <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800/60">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="text-xs text-slate-400">
                    <tr className="border-b border-slate-700">
                      <th className="p-3">Usuário</th><th className="p-3">Conta</th><th className="p-3">Plano</th><th className="p-3">Verificação</th><th className="p-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((item) => (
                      <tr key={item.id} className="border-b border-slate-700/60 align-top">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {item.avatar ? <img src={mediaUrl(item.avatar) ?? undefined} alt="" className="h-9 w-9 rounded-full object-cover" /> : <span className="h-9 w-9 rounded-full bg-slate-700" />}
                            <div><p className="font-medium">{item.nick ?? "Perfil incompleto"}</p><p className="text-xs text-slate-400">{item.username ? `@${item.username}` : item.email}</p></div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={item.account_status === "suspended" ? "text-rose-300" : "text-emerald-300"}>{item.account_status === "suspended" ? "Suspenso" : "Ativo"}</span>
                          {item.suspension_reason && <p className="mt-1 max-w-48 text-xs text-slate-500">{item.suspension_reason}</p>}
                        </td>
                        <td className="p-3">
                          <button type="button" disabled={busy === item.id || item.account_status === "suspended"} onClick={() => void runAction({ action: "set_vip", userId: item.id, vip: !item.vip }, item.vip ? "VIP removido" : "VIP de protótipo concedido")} className="rounded-md border border-slate-600 px-2 py-1 text-xs hover:bg-slate-700 disabled:opacity-40">
                            {item.vip ? "VIP — remover" : "Free — conceder VIP"}
                          </button>
                        </td>
                        <td className="p-3">
                          <button type="button" disabled={busy === item.id} onClick={() => void runAction({ action: "set_verified", userId: item.id, verified: !item.verified }, item.verified ? "Selo de verificação removido" : "Perfil verificado")} className="rounded-md border border-slate-600 px-2 py-1 text-xs hover:bg-slate-700 disabled:opacity-40">
                            {item.verified ? "Verificado — remover" : "Não verificado"}
                          </button>
                        </td>
                        <td className="p-3">
                          {item.account_status === "suspended" ? (
                            <button type="button" disabled={busy === item.id} onClick={() => void runAction({ action: "account_status", userId: item.id, status: "active" }, "Conta reativada")} className="rounded-md bg-emerald-500/15 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-500/25">Reativar</button>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              <button type="button" disabled={busy === item.id} onClick={() => {
                                const reason = window.prompt("Motivo da suspensão (mínimo 5 caracteres):");
                                if (reason !== null) void runAction({ action: "account_status", userId: item.id, status: "suspended", reason, durationDays: 30 }, "Conta suspensa por 30 dias");
                              }} className="rounded-md bg-rose-500/15 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/25">Suspender 30d</button>
                              <button type="button" disabled={busy === item.id} onClick={() => {
                                const reason = window.prompt("Motivo da suspensão permanente (mínimo 5 caracteres):");
                                if (reason !== null) void runAction({ action: "account_status", userId: item.id, status: "suspended", reason, durationDays: null }, "Conta suspensa permanentemente");
                              }} className="rounded-md border border-rose-500/30 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/10">Permanente</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredUsers.length === 0 && <p className="p-6 text-center text-sm text-slate-400">Nenhum usuário encontrado.</p>}
                <p className="border-t border-slate-700 px-3 py-2 text-xs text-slate-500">Exibindo até 500 contas mais recentes.</p>
              </div>
            </div>
          )}

          {activeView === "media" && (
            <>
              <p className="text-xs text-slate-400">Fotos mais recentes dos álbuns públicos e privados. A remoção apaga o registro do álbum e o objeto R2 correspondente.</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {data.media.map((item) => (
                  <article key={`${item.profile_id}-${item.kind}-${item.key}`} className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
                    <img src={mediaUrl(item.key) ?? undefined} alt={`Foto de álbum de ${item.nick}`} loading="lazy" className="aspect-square w-full object-cover" />
                    <div className="flex items-center justify-between gap-2 p-3">
                      <div className="min-w-0"><p className="truncate text-sm">{item.nick}</p><p className="text-xs text-slate-400">Álbum {item.kind === "private" ? "privado" : "público"}</p></div>
                      <button type="button" disabled={busy === item.key || !canDeleteR2AlbumPhoto(item.key)} onClick={() => {
                        if (window.confirm(`Remover esta foto do álbum de ${item.nick}?`)) {
                          void runAction({ action: "delete_media", profileId: item.profile_id, kind: item.kind, key: item.key }, "Foto removida");
                        }
                      }} aria-label="Remover foto" title={canDeleteR2AlbumPhoto(item.key) ? "Remover foto" : "Mídia antiga externa: remoção automática indisponível"} className="rounded-md p-2 text-rose-300 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40"><ImageOff className="h-4 w-4" /></button>
                    </div>
                  </article>
                ))}
              </div>
              {data.media.length === 0 && <p className="rounded-xl border border-slate-700 bg-slate-800/50 p-8 text-center text-sm text-slate-400">Nenhuma foto de álbum encontrada.</p>}
            </>
          )}

          {activeView === "verification" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">A evidência é privada e removida do R2 quando a análise termina.</p>
              {data.verificationRequests.map((item) => (
                <article key={item.id} className="grid gap-4 rounded-xl border border-slate-700 bg-slate-800/70 p-4 sm:grid-cols-[1fr_1fr_auto]">
                  <div>
                    <p className="text-sm font-medium">{item.nick} <span className="text-xs text-slate-400">@{item.username}</span></p>
                    <p className="mt-1 text-xs text-slate-400">Solicitado em {formatDate(item.created_at)}</p>
                    {item.avatar && <img src={mediaUrl(item.avatar) ?? undefined} alt="Foto atual do perfil" className="mt-3 h-40 w-40 rounded-lg object-cover" />}
                    <p className="mt-1 text-xs text-slate-500">Foto atual do perfil</p>
                  </div>
                  <div>
                    <img src={mediaUrl(item.evidence_key) ?? undefined} alt="Foto enviada para verificação" className="h-40 w-40 rounded-lg object-cover" />
                    <p className="mt-1 text-xs text-slate-500">Foto de verificação privada</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:items-end">
                    <button type="button" disabled={busy === item.id} onClick={() => void runAction({ action: "review_verification", requestId: item.id, decision: "approved" }, "Perfil verificado")} className="rounded-md bg-emerald-500/15 px-3 py-2 text-xs text-emerald-200 hover:bg-emerald-500/25">Aprovar e conceder selo</button>
                    <button type="button" disabled={busy === item.id} onClick={() => {
                      const note = window.prompt("Motivo da recusa (opcional):");
                      if (note !== null) {
                        void runAction({ action: "review_verification", requestId: item.id, decision: "rejected", note }, "Solicitação recusada");
                      }
                    }} className="rounded-md bg-rose-500/15 px-3 py-2 text-xs text-rose-200 hover:bg-rose-500/25">Recusar solicitação</button>
                  </div>
                </article>
              ))}
              {data.verificationRequests.length === 0 && <p className="rounded-xl border border-slate-700 bg-slate-800/50 p-8 text-center text-sm text-slate-400">Nenhuma solicitação de verificação pendente.</p>}
            </div>
          )}

          {activeView === "support" && (
            <div className="space-y-3">
              {data.tickets.map((ticket) => (
                <article key={ticket.id} className="space-y-3 rounded-xl border border-slate-700 bg-slate-800/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="font-medium">{ticket.subject}</p><p className="mt-1 text-xs text-slate-400">{ticket.name} · {ticket.email} · {ticket.category} · {formatDate(ticket.created_at)}</p></div>
                    <span className="rounded-full bg-slate-700 px-2.5 py-1 text-xs">{ticket.status} · {ticket.priority}</span>
                  </div>
                  <p className="whitespace-pre-wrap rounded-lg bg-slate-900/70 p-3 text-sm text-slate-300">{ticket.message}</p>
                  {ticket.replies.map((reply) => <p key={reply.id} className="whitespace-pre-wrap border-l-2 border-sky-400/40 pl-3 text-sm text-slate-300">Resposta enviada · {formatDate(reply.created_at)}<br />{reply.body}</p>)}
                  <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                    <select value={ticket.status} onChange={(event) => void runAction({ action: "support_ticket", ticketId: ticket.id, status: event.target.value, priority: ticket.priority }, "Status atualizado")} className="rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-xs">
                      <option value="open">Aberto</option><option value="in_progress">Em andamento</option><option value="resolved">Resolvido</option><option value="closed">Fechado</option>
                    </select>
                    <select value={ticket.priority} onChange={(event) => void runAction({ action: "support_ticket", ticketId: ticket.id, status: ticket.status, priority: event.target.value }, "Prioridade atualizada")} className="rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-xs">
                      <option value="low">Baixa</option><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option>
                    </select>
                    <span className="self-center text-xs text-slate-500">Protocolo {ticket.id.slice(0, 8)}</span>
                  </div>
                  <div className="space-y-2">
                    <textarea value={replyDrafts[ticket.id] ?? ""} onChange={(event) => setReplyDrafts((current) => ({ ...current, [ticket.id]: event.target.value }))} rows={3} maxLength={4000} placeholder="Escreva uma resposta — será salva no ticket e enviada pelo Resend" className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-400" />
                    <button type="button" disabled={busy === ticket.id || !replyDrafts[ticket.id]?.trim()} onClick={() => void runAction({ action: "support_ticket", ticketId: ticket.id, status: ticket.status, priority: ticket.priority, reply: replyDrafts[ticket.id] }, "Resposta registrada e enviada")} className="rounded-md bg-sky-500/15 px-3 py-2 text-xs text-sky-200 hover:bg-sky-500/25 disabled:opacity-40">Enviar resposta por e-mail</button>
                  </div>
                </article>
              ))}
              {data.tickets.length === 0 && <p className="rounded-xl border border-slate-700 bg-slate-800/50 p-8 text-center text-sm text-slate-400">Nenhuma solicitação de suporte registrada.</p>}
            </div>
          )}

          {activeView === "monetization" && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <StatCard label="Assinaturas VIP (protótipo)" value={data.stats.vip} icon={CircleDollarSign} color="text-amber-300" />
                <StatCard label="Contas Free" value={data.stats.free} icon={Users} color="text-slate-200" />
              </div>
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
                <h3 className="font-medium text-amber-100">Monetização ainda em protótipo</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  Estes totais vêm do campo VIP/Free dos perfis. O acesso VIP pode ser concedido ou removido manualmente na gestão de usuários. Não há checkout conectado nem pagamentos processados; por isso o painel não calcula faturamento ou receita.
                </p>
                <button type="button" onClick={() => setActiveView("users")} className="mt-3 rounded-lg border border-amber-300/30 px-3 py-2 text-xs text-amber-100 hover:bg-amber-300/10">Gerenciar acessos VIP</button>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-medium">Controle de anúncios</h3>
                    <p className="mt-1 text-xs text-slate-400">Não existe integração de AdMob/anúncios ativa no app; este estado não altera exibição atualmente.</p>
                  </div>
                  <button type="button" disabled className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-500" aria-pressed={data.adsEnabled}>Indisponível</button>
                </div>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
                <h3 className="mb-3 text-sm font-medium">Histórico de ações administrativas</h3>
                <div className="space-y-2">
                  {data.audit.map((entry) => (
                    <div key={entry.id} className="flex flex-wrap justify-between gap-2 border-b border-slate-700/60 pb-2 text-xs">
                      <span className="text-slate-200">{entry.action} · {entry.target_type}{entry.target_id ? ` ${entry.target_id}` : ""}</span>
                      <time className="text-slate-500">{formatDate(entry.created_at)}</time>
                    </div>
                  ))}
                  {data.audit.length === 0 && <p className="text-xs text-slate-500">Nenhuma ação administrativa registrada.</p>}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
