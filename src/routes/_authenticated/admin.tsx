import { useState, useMemo, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FileText, ShieldAlert, Users } from "lucide-react";
import { toast } from "sonner";
import { d1 } from "@/lib/d1-client"
import type { Tables } from "@/lib/database-types";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute('/_authenticated/admin')({
  component: AdminUsersManagement,
})

function AdminUsersManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<Tables<"profiles">[]>([]);
  const [reports, setReports] = useState<Tables<"reports">[]>([]);
  const [postsCount, setPostsCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"reports" | "users">("reports");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function checkAdmin() {
      if (!user) {
        navigate({ to: "/entrar" });
        return;
      }
      if (user.app_metadata.role !== "admin") {
        toast.error("Acesso restrito à administração");
        navigate({ to: "/" });
        return;
      }

      const [profilesResult, reportsResult, postsResult] = await Promise.all([
        d1.from("profiles").select("*").order("created_at", { ascending: false }),
        d1.from("reports").select("*").eq("status", "pending").order("created_at", { ascending: false }),
        d1.from("posts").select("id", { count: "exact", head: true }),
      ]);

      if (profilesResult.error) toast.error("Não foi possível carregar os perfis");
      else setUsers(profilesResult.data ?? []);

      if (reportsResult.error) toast.error("Não foi possível carregar as denúncias");
      else setReports(reportsResult.data ?? []);

      if (postsResult.error) toast.error("Não foi possível carregar o total de publicações");
      else setPostsCount(postsResult.count ?? 0);

      setLoading(false);
    }
    checkAdmin();
  }, [navigate, user]);

  const handleResolveReport = async (reportId: string) => {
    const { error } = await d1.from("reports").update({ status: "resolved" }).eq("id", reportId);
    if (error) {
      toast.error("Não foi possível atualizar a denúncia");
      return;
    }
    setReports((current) => current.filter((report) => report.id !== reportId));
  }

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return users.filter((user) => {
      return user.nick.toLowerCase().includes(query) || user.username.toLowerCase().includes(query);
    })
  }, [users, searchTerm]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 text-slate-100">
      <div>
        <h1 className="text-2xl font-bold text-white">Painel de Administração e Moderação</h1>
        <p className="text-sm text-slate-400">Gerencie a plataforma e conteúdos.</p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Carregando dados do D1…</p>
      ) : (
        <>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Total de Usuários</p>
            <p className="text-2xl font-bold text-white mt-1">{users.length}</p>
          </div>
          <Users className="w-6 h-6 text-blue-400" />
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Denúncias Pendentes</p>
            <p className="mt-1 text-2xl font-bold text-amber-400">{reports.length}</p>
          </div>
          <ShieldAlert className="w-6 h-6 text-amber-400" />
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Publicações Ativas</p>
            <p className="mt-1 text-2xl font-bold text-emerald-400">{postsCount}</p>
          </div>
          <FileText className="w-6 h-6 text-emerald-400" />
        </div>
      </div>

      <div className="border-b border-slate-700 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === 'reports' ? 'border-rose-500 text-rose-400' : 'border-transparent text-slate-400'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Fila de Moderação ({reports.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === 'users' ? 'border-rose-500 text-rose-400' : 'border-transparent text-slate-400'
          }`}
        >
          <Users className="w-4 h-4" />
          Gestão de Usuários
        </button>
      </div>

      {activeTab === 'reports' && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <table className="w-full text-left text-sm text-slate-200">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400">
                <th className="py-2">Denunciante</th>
                <th className="py-2">Motivo</th>
                <th className="py-2">Detalhes</th>
                <th className="py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-b border-slate-700/50">
                  <td className="py-3">{users.find((user) => user.id === report.reporter_id)?.nick ?? report.reporter_id}</td>
                  <td className="py-3 text-amber-400">{report.reason}</td>
                  <td className="py-3">{report.details || "—"}</td>
                  <td className="py-3 text-right">
                    <button onClick={() => void handleResolveReport(report.id)} className="p-1 hover:text-emerald-400" aria-label="Resolver denúncia">
                      <ShieldAlert className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {reports.length === 0 && <p className="py-5 text-center text-sm text-slate-400">Nenhuma denúncia pendente.</p>}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex gap-4 bg-slate-800 p-4 rounded-xl border border-slate-700">
            <input
              type="text"
              placeholder="Buscar por nome ou usuário..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200"
            />
          </div>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <table className="w-full text-left text-sm text-slate-200">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="py-2">Usuário</th>
                  <th className="py-2">Assinatura</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-slate-700/50">
                    <td className="py-3 flex items-center gap-2">
                      {user.avatar ? <img src={user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" /> : <div className="h-8 w-8 rounded-full bg-slate-700" />}
                      <div>{user.nick} <span className="text-slate-400">@{user.username}</span></div>
                    </td>
                    <td className="py-3">{user.vip ? "VIP" : "Free"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
       )}
        </>
      )}
    </div>
  );
}

