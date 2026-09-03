# De protótipo para app real: autenticação e perfis persistentes

Agora que o Lovable Cloud está ativo, o próximo passo é dar vida aos dados mockados: transformar os perfis fictícios em contas reais, com login, cadastro e banco de dados.

## O que será feito

1. **Autenticação**
   - Ativar login por e-mail/senha e Google no backend.
   - Criar tela de entrada (`/entrar`) com e-mail, senha, Google e link para cadastro.
   - Ajustar `/cadastro` para também criar conta com e-mail/senha e, depois, perfil.

2. **Banco de dados**
   - Criar tabela `public.profiles` vinculada ao `auth.users` 
   - Incluir GRANTs e RLS: usuários autenticados leem/alteram apenas seu próprio perfil; leitura pública limitada a nick, city, type, bio, vip, hue.

3. **Integração no app**
   - Substituir `ProfilesProvider` mock por leitura real do banco via Supabase.
   - `/perfil` passa a mostrar o perfil do usuário logado; `/perfil/$id` consulta um perfil real.
   - Rotas `/feed`, `/explorar`, `/eventos`, `/chat`, `/perfil` e `/configuracoes` ficam protegidas por layout `_authenticated`.

4. **UX mínima**
   - Loading state enquanto a sessão carrega.
   - Mensagens de erro de login/cadastro em português.
   - Botão "Sair" na tela de configurações encerra a sessão real.

## O que NÃO será feito neste passo

- Pagamentos reais (Pix/Stripe) — o modal VIP continua como protótipo visual.
- Chat em tempo real — as conversas continuam mockadas até nova etapa.

## Resultado esperado

Usuários conseguem criar conta, fazer login, ver e editar o próprio perfil, e navegar pelas rotas protegidas. O app deixa de depender exclusivamente de dados em memória.