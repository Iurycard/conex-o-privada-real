# Próximos passos: o que ainda não tem função real

Hoje o app é um protótipo completo no visual, mas os dados vivem só na memória do navegador (somem ao recarregar). Abaixo o mapa do que existe e o que falta.

## Telas que já funcionam (com dados fictícios)
- Início (landing), Feed, Explorar (com filtros e busca), Eventos, Chat, Perfil próprio e de outros, Editar perfil, Cadastro, Configurações (amigos, bloqueados), Notificações, Saída rápida.

## Telas que faltam existir
- **Entrar / login**: o botão "Entrar" da página inicial e "Já tenho conta" levam para o Feed. Não existe tela de login.
- **Recuperar senha**.
- **Página de cada evento**: os cards de evento não abrem detalhe (descrição, local, lista de presenças, confirmar presença).
- **Conversa individual do chat**: hoje só a lista/tela geral, sem página por conversa.
- **Painel de administração/moderação** (denúncias, gestão de usuários, auditoria de mídias) — já rascunhado antes, nunca construído.
- **Termos de uso e Privacidade** (esperado num app +18).

## Funções que são só visuais hoje
- Cadastro e perfil não criam conta de verdade: nada persiste depois de recarregar.
- Fotos e vídeos não têm envio real (upload) — usam imagens fixas.
- Álbum privado: o botão "Solicitar acesso" não gera pedido nem aprovação.
- Curtidas, seguir, presenças em eventos e mensagens não são salvos.
- Notificações e "quem visitou seu perfil" são listas fixas.
- VIP: o modal é uma vitrine; não há pagamento.
- Denúncias e bloqueios não vão para lugar algum.

## Ordem recomendada
1. **Base de contas e dados** (o desbloqueio de quase tudo): login/cadastro reais, perfis salvos, sessões, telas protegidas. Sem isso, curtidas, seguidores, mensagens e álbuns não podem ser guardados.
2. **Perfis e álbuns de verdade**: envio de fotos, álbum público/privado, pedidos de acesso com aprovação.
3. **Interações sociais**: seguir, curtir, visitas ao perfil, notificações reais.
4. **Chat**: conversas salvas e mensagens em tempo real, com a regra VIP para iniciar conversas.
5. **Eventos**: página de cada evento e confirmação de presença.
6. **VIP com pagamento** (Pix/cartão) e liberação automática dos benefícios.
7. **Moderação**: denúncias, painel de administração, bloqueios efetivos.

## Detalhes técnicos

- Novas rotas previstas: `/entrar`, `/recuperar-senha`, `/eventos/$id`, `/chat/$id`, `/admin`, `/termos`, `/privacidade`, e um grupo protegido para as telas que exigem login.
- O passo 6 usa Stripe (ou Pix via provedor) com webhook para marcar VIP.

## Sugestão para começar
Começar pelo passo 1 (contas e dados reais). Diga se prefere isso ou se quer priorizar outro item da lista.
