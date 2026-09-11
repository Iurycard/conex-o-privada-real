[PAINEL DE ADMINISTRAÇÃO E MODERAÇÃO - `/admin`]
1. ROTA E ACESSO:
- Crie uma rota `/admin` com um layout exclusivo de Dashboard (Barra lateral de navegação interna e área de conteúdo).
- Simule uma verificação de permissão: apenas perfis com `role: "admin"` no contexto podem acessar a rota (caso contrário, redirecione para a home).
2. MÉTROLOGIA E MÉTOCAS (CARDS DO TOPO):- 
Exiba 4 cards de estatísticas rápidas com ícones:
 * Total de Usuários Cadastrados * Denúncias Pendentes * Publicações Ativas * Perfis Suspensos/Bloqueados
3. TABS / SEÇÕES DO PAINEL:
- Tab 1: "Fila de Moderação (Denúncias)": 
* Tabela exibindo o denunciante, o tipo (Perfil ou Post), o motivo informado e o conteúdo denunciado. 
* Botões de ação em cada linha: "Excluir Conteúdo", "Banir Usuário" e "Ignorar Denúncia".
- Tab 2: "Gestão de Usuários": 
* Tabela com busca rápida de usuários cadastrados no `mock-data`. 
* Opções de alternar status do usuário (Ativo, Suspenso, Verificado).
- Tab 3: "Auditoria de Mídias": 
* Grid com as fotos/vídeos mais recentes dos álbuns com botão rápido de remoção imediata.
- Tab 4: "Solicitações de Verificação":
* Fila com fotos de verificação enviadas pelos usuários comparadas às fotos do perfil.
* Botões de ação: "Conceder Selo Verificado" ou "Rejeitar Solicitação".

-Tab 5: "Controle de Sistema e Monetização":
* Toggle global para ativar/desativar exibição de anúncios (AdMob).
* Atalhos de suporte: Dar/remover VIP manualmente a um usuário específico.
* Histórico de Ações Administrativas (Logs de moderação).