# UI totalmente navegável + perfis clicáveis e criação de perfil (mock)

Tudo continua sendo protótipo: nada é salvo em banco, os dados vivem em memória durante a sessão.

## 1. Perfis clicáveis em todo lugar

- Nova tela de perfil de outra pessoa em `/perfil/{id}`, reaproveitando o layout do meu perfil (capa, avatar, badge de tipo, selo VIP, bio, estatísticas, abas Fotos Públicas / Álbum Privado com blur).
- Ficam clicáveis e levam a esse perfil:
  - cards do Explorar (card inteiro)
  - stories do Feed
  - avatar e apelido do autor de cada post
  - cabeçalho e itens da lista de conversas no Chat
  - lista de presenças nos Eventos
- No perfil de outra pessoa: botões "Seguir" (alterna estado), "Mensagem" (vai para o Chat) e "Solicitar Acesso ao Álbum Privado". O álbum privado sempre aparece bloqueado, com opção de abrir o modal VIP.

## 2. Criar perfis de verdade (em memória)

- O cadastro passa a criar um perfil real na sessão: apelido, tipo de conta, cidade, bio e escolha de cor/capa (as mídias continuam simuladas).
- O perfil criado entra imediatamente na lista de perfis e aparece no Explorar, nos stories e como autor de uma publicação inicial no Feed.
- Botão "Criar novo perfil" no meu perfil e no Explorar, levando ao cadastro; é possível alternar qual perfil criado é "o meu".
- Validação simples: apelido obrigatório, com aviso visual.

## 3. Navegação completa

- Cabeçalho: sino de notificações abre um painel com notificações fictícias que apontam para perfis e eventos; logo volta ao feed; saída rápida mantém o comportamento atual.
- Perfil próprio: engrenagem abre menu com "Editar perfil", "Criar novo perfil", "Assinatura VIP" e "Sair" (volta à landing).
- Eventos: cada card abre um detalhe do evento (`/eventos/{id}`) com capa, descrição, presenças clicáveis e botões "Vou" / "Tenho Interesse"; eventos exclusivos abrem o modal VIP.
- Chat: clicar em uma conversa abre a thread correspondente; regras Free/VIP permanecem.
- Landing: "Entrar" vai ao feed, "Criar Perfil Discreto" ao cadastro.
- Toda ação sem tela dedicada (curtir, compartilhar, upload) mostra um aviso de protótipo, sem botão morto.

## Detalhes técnicos

- Novas rotas: `src/routes/perfil.$id.tsx`, `src/routes/eventos.$id.tsx`, `src/routes/chat.$id.tsx`; `perfil.tsx` vira o meu perfil.
- Um contexto `src/context/profiles.tsx` guarda os perfis (mock inicial + criados) e o perfil ativo, montado no `__root.tsx` junto do `VipProvider`.
- Navegação sempre com `<Link to params>` do TanStack Router; sem backend, sem banco, sem novos pacotes.
- Cada rota nova recebe `head()` próprio com título e descrição específicos.
