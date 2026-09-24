import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { supabase } from '@/integrations/supabase/client'
import { createFileRoute } from '@tanstack/react-router'
import { 
  Users,
  EyeOff,
  Image as ImageIcon,
  DollarSign,
  ShieldCheck,
  ExternalLink,
  FileText,
  Trash2,
  Search, 
  ShieldAlert, 
  UserCheck, 
  UserX, 
  Ban, 
  MoreVertical,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'

export const Route = createFileRoute('/_authenticated/admin')({
  component: AdminUsersManagement,
})

// Tipos de exemplo alinhados com o contexto do projeto
export type UserStatus = 'active' | 'suspended' | 'banned'

export interface MediaAuditItem { id: string 
  userName: string 
  userAvatar: string 
  mediaUrl: string 
  type: 'image' | 'video'
  createdAt: string 
  flaggedReason?: string
}
  // 2. Dados simulados para exibir na galeria// 
const INITIAL_MEDIA_ITEMS:
  MediaAuditItem[] = [ 
    { 
    id: 'med_1', 
    userName: 'Carlos Eduardo', 
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 
    mediaUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600', 
    type: 'image', 
    createdAt: 'Há 10 min', 
    flaggedReason: 'Possível conteúdo inadequado' 
  }, 
    { 
      id: 'med_2', 
      userName: 'Mariana Lima', 
      userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 
      mediaUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600', 
      type: 'image', 
      createdAt: 'Há 25 min'
     },
      { 
      id: 'med_3',
       userName: 'Ana Silva', 
       userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 
       mediaUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600', 
       type: 'image', createdAt: 'Há 1 hora'
       }
      ]

export interface AdminUser {
  id: string
  name: string
  email: string
  avatar: string
  status: UserStatus
  isVerified: boolean
  createdAt: string
  reportsCount: number
}

export interface ReportItem {
  id: string
  reporterName: string
  targetType: 'user' | 'post' | 'comment'
  targetId: string
  targetName: string
  reason: string
  createdAt: string
  contentPreview: string
}
 

function AdminUsersManagement() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate({ to: "/entrar" });
        return;
      }
      setLoading(false);
      // Carrega dados
      supabase.from('profiles').select('*').then(({ data }) => {
        if (data) setUsers(data.map((p: any) => ({
          id: p.id,
          name: p.nick || p.id,
          email: p.id,
          avatar: p.avatar || '',
          status: p.status || 'active',
          isVerified: p.is_verified || false,
          createdAt: p.created_at,
          reportsCount: 0
        })));
      });
    }
    checkAdmin();
  }, [navigate]);

  const [activeTab, setActiveTab] = useState<'users' | 'reports' | 'media' | 'verification' | 'system'>('reports')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [reports, setReports] = useState<ReportItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [mediaItems, setMediaItems] = useState<MediaAuditItem[]>(INITIAL_MEDIA_ITEMS)
  

  // Alterna o status do usuário diretamente na lista
  const handleStatusChange = (userId: string, newStatus: UserStatus) => {
    setUsers(prev => 
      prev.map(user => user.id === userId ? { ...user, status: newStatus } : user)
    )
  }

  //Função para remover uma midia da lista
  const handleRemoveMedia = (mediaId: string) => {
    setMediaItems(prev => prev.filter(item => item.id !== mediaId))
  }

  // Alterna o selo de verificação
  const handleToggleVerification = (userId: string) => {
    setUsers(prev => 
      prev.map(user => user.id === userId ? { ...user, isVerified: !user.isVerified } : user)
    )
  }

  const handleDismissReport = (reportId: string) => {
    setReports(prev => prev.filter(r => r.id !== reportId))
  }

  // Filtragem combinada por busca e status
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            user.email.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [users, searchTerm, statusFilter])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      <div>
        <h1 className="text-2xl font-bold text-white">Painel de Administração e Moderação</h1>
        <p className="text-sm text-slate-400">Gerencie a plataforma e conteúdos.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <p className="text-2xl font-bold text-amber-400 mt-1">{reports.length}</p>
          </div>
          <ShieldAlert className="w-6 h-6 text-amber-400" />
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Publicações Ativas</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">1,240</p>
          </div>
          <FileText className="w-6 h-6 text-emerald-400" />
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Perfis Suspensos</p>
            <p className="text-2xl font-bold text-rose-400 mt-1">{users.filter(u => u.status !== 'active').length}</p>
          </div>
          <UserX className="w-6 h-6 text-rose-400" />
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
        <button onClick={() => setActiveTab('media')} 
        className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${ 
          activeTab === 'media' ? 'border-rose-500 text-rose-400' : 'border-transparent text-slate-400' 
          }`}
          > 
          <ImageIcon className="w-4 h-4" /> 
          Auditoria de Mídias ({mediaItems.length})
          </button>
      </div>

      {activeTab === 'reports' && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
          <table className="w-full text-left text-sm text-slate-200">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400">
                <th className="py-2">Denunciante</th>
                <th className="py-2">Motivo</th>
                <th className="py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-b border-slate-700/50">
                  <td className="py-3">{report.reporterName}</td>
                  <td className="py-3 text-amber-400">{report.reason}</td>
                  <td className="py-3 text-right">
                    <button onClick={() => handleDismissReport(report.id)} className="p-1 hover:text-rose-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex gap-4 bg-slate-800 p-4 rounded-xl border border-slate-700">
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
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
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-slate-700/50">
                    <td className="py-3 flex items-center gap-2">
                      <img src={user.avatar} className="w-8 h-8 rounded-full" />
                      <div>{user.name}</div>
                    </td>
                    <td className="py-3">{user.status}</td>
                    <td className="py-3 text-right">
                      <button onClick={() => handleStatusChange(user.id, 'suspended')} className="p-1 hover:text-amber-400">
                        <AlertTriangle className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
       )}

        {activeTab === 'media' && (
  <div className="space-y-4">
    <div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700">
      <h2 className="text-lg font-semibold text-white">Galeria de Mídias Recentes</h2>
      <span className="text-xs text-slate-400">Total: {mediaItems.length} itens</span>
    </div>

    {mediaItems.length === 0 ? (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-8 text-center text-slate-400">
        Nenhuma mídia pendente de auditoria no momento.
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mediaItems.map((item) => (
          <div key={item.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col">
            <div className="p-3 flex items-center gap-3 border-b border-slate-700/50 bg-slate-800/80">
              <img src={item.userAvatar} alt={item.userName} className="w-8 h-8 rounded-full object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{item.userName}</p>
                <p className="text-xs text-slate-400">{item.createdAt}</p>
              </div>
            </div>

            <div className="relative aspect-video bg-slate-900 group">
              <img src={item.mediaUrl} alt="Mídia enviada" className="w-full h-full object-cover" />
              {item.flaggedReason && (
                <span className="absolute top-2 left-2 bg-rose-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                  {item.flaggedReason}
                </span>
              )}
            </div>

            <div className="p-3 flex items-center justify-between border-t border-slate-700/50 mt-auto">
              <a 
                href={item.mediaUrl} 
                target="_blank" 
                rel="noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Ver cheia
              </a>
              <button 
                onClick={() => handleRemoveMedia(item.id)}
                className="px-2.5 py-1 text-xs bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 rounded border border-rose-500/30 flex items-center gap-1 transition"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remover
              </button>
            </div>
          </div>
        ))}
      </div>
    )}

    </div>
        )
      }
    </div>
  )
}
function setUsers(arg0: { id: any; name: any; email: any; avatar: any; status: any; isVerified: any; createdAt: any; reportsCount: number }[]) {
  throw new Error('Function not implemented.')
}

