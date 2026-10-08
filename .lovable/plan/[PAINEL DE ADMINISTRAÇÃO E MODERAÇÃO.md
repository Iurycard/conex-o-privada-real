# Painel de administração e moderação — `/admin`

## Escopo implementado

O painel usa dados do D1 e ações autenticadas no Cloudflare Worker. A verificação de papel na interface é apenas uma proteção de navegação; cada endpoint administrativo também exige `admin` no servidor.

### Indicadores e navegação

- Cards de usuários cadastrados, denúncias na fila, publicações e contas suspensas.
- Navegação administrativa para visão geral, denúncias, usuários, auditoria de mídias, verificações, suporte e monetização.
- As consultas administrativas são feitas no Worker; a interface não recebe binding nem credenciais de D1/R2.

### Denúncias

- Fila com denunciante, perfil ou publicação denunciada, motivo, detalhes e contexto disponível do conteúdo.
- Estados: `pending`, `in_review`, `resolved` e `dismissed`.
- Ações para iniciar análise, resolver ou ignorar uma denúncia; publicações denunciadas podem ser removidas permanentemente; o perfil denunciado pode ser suspenso por 30 dias.
- A remoção de publicação conserva a denúncia para auditoria, removendo a referência à publicação antes da exclusão.

### Usuários e verificação

- Busca por nome, usuário ou e-mail, limitada às 500 contas mais recentes.
- VIP/Free pode ser alterado manualmente no protótipo. Cada alteração é registrada na auditoria.
- Suspensão por 30 dias ou permanente, com motivo obrigatório. A suspensão invalida sessões existentes e impede novos logins até reativação ou término do prazo. Contas de administrador não podem ser suspensas por esta interface.
- Uma pessoa pode solicitar verificação nas Configurações com uma foto privada. A equipe compara a evidência com o perfil; ao aprovar, concede o selo. A evidência privada é apagada do R2 ao concluir a análise.
- O selo de perfil verificado é apresentado no perfil público. A aprovação é uma revisão manual, não uma verificação de identidade automatizada.

### Auditoria de mídias

- Mostra até 100 fotos recentes presentes nos álbuns público e privado dos 200 perfis atualizados mais recentemente.
- Remoção disponível para objetos R2 que seguem o padrão de chave do app; mídia legada externa pode ser visualizada, mas não é removida automaticamente.
- Administradores podem visualizar a evidência privada de verificação somente através do endpoint autenticado.

### Suporte

- O formulário de contato cria um ticket no D1, com categoria, assunto, mensagem, e-mail, prioridade e estado; não depende do cliente de e-mail local.
- Limite de cinco tickets por endereço de e-mail por hora.
- O painel permite ajustar prioridade/estado e responder pelo Resend. As respostas ficam registradas no ticket. Se o envio por e-mail falhar, o painel informa que a resposta foi salva, mas não entregue.
- Para resposta por e-mail no Worker, configure `RESEND_API_KEY` e `EMAIL_FROM` com remetente verificado no Resend.

### Monetização e sistema

- A monetização é **somente protótipo VIP/Free**: o painel mostra contagens e permite conceder/remover VIP manualmente.
- Não há checkout ou pagamento processado. O painel não calcula receita, vendas ou valores recebidos.
- A integração AdMob/anúncios não existe no app; o controle é exibido como indisponível para não sugerir que um toggle sem integração alteraria a exibição.

### Auditoria

- Ações administrativas de moderação, conta, VIP, verificação, suporte e configuração são gravadas em `admin_audit_log`.
- O painel mostra as 50 ações mais recentes.

## Persistência e segurança

Tabelas novas em `schema_d1.sql`: `admin_account_status`, `verified_profiles`, `verification_requests`, `support_tickets`, `support_ticket_messages`, `platform_settings` e `admin_audit_log`.

Endpoints relevantes:

- `GET /api/admin/dashboard` — dados e contagens do painel.
- `POST /api/admin/action` — ações administrativas autorizadas e validadas no Worker.
- `POST /api/support/tickets` — criação pública de ticket com validação e limite de frequência.
- `GET/POST /api/verification/request` — status e envio privado de pedido de verificação.

## Ativação no Cloudflare

Após atualizar o código, aplique o esquema D1 antes do deploy:

```powershell
npm run db:init:local
npm run db:init
npm run build
npm run cf:deploy
```

`db:init:local` atua no D1 local; `db:init` aplica `schema_d1.sql` ao D1 remoto configurado no Wrangler. O esquema usa `CREATE TABLE IF NOT EXISTS`, permitindo reaplicação.
