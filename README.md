# Conexão Privada UI

Crie o protótipo visual (interface/UI) de uma aplicação web e mobile responsiva em modo escuro (Dark Mode) para uma rede social privada de encontros e relacionamentos para casais e solteiros, chamada "Conexão Privada".

O design deve ser moderno e elegante (estilo rede social premium), usando fundo em tons de preto e grafite escuro (#0D0D11 e #16161E), detalhes em vinho/roxo neon nos botões principais e detalhes em dourado fosco exclusivamente para elementos VIP.

Crie os seguintes fluxos e telas navegáveis com alta fidelidade visual:

1. CABEÇALHO FIXO E NAVEGAÇÃO:

   - Topo fixo com logo discreto, ícone de notificações e um "Botão de Pânico/Sair Rápido" visível (ícone de raio/fechar).

   - Menu de navegação inferior/lateral fixo com 5 ícones: Feed, Explorar, Eventos, Chat e Perfil.

2. TELA DE ENTRADA (LANDING PAGE):

   - Modal/aviso obrigatório de confirmação de idade "+18 anos".

   - Apresentação elegante com foco em privacidade e botões de login / "Criar Perfil Discreto".

3. CADASTRO DE PERFIL:

   - Seletor de tipo de conta: "Casal (Ele/Ela)", "Casal (Ela/Ela)", "Casal (Ele/Ele)", "Mulher Solteira", "Homem Solteiro".

   - Campos de localização, bio e upload de mídias.

4. FEED PRINCIPAL (ESTILO REDE SOCIAL):

   - Carrossel superior com stories/perfis próximos. Perfis VIP possuem moldura em gradiente dourado.

   - Cards de publicação no feed com foto ou vídeo, área de curtidas e comentários.

   - Banners de anúncios locais discretos inseridos no feed a cada poucas postagens (com indicador visual de que usuários VIP não veem anúncios).

5. ABA "EVENTOS & BALADAS" (PARA PRODUTORES/CASAS LIBERAIS):

   - Seção para casas de swing e organizadores postarem festas.

   - Cards de evento com foto de capa, local, data, tags e contador de presenças em tempo real.

   - Botões interativos de confirmação: "[ Vou ]" e "[ Tenho Interesse ]".

6. PERFIL DO USUÁRIO E ÁLBUNS:

   - Perfil com badge da categoria e selo "👑 VIP" em dourado para assinantes.

   - Aba de "Fotos Públicas" e aba de "Álbum Privado" (com miniaturas totalmente desfocadas com efeito blur e ícone de cadeado).

   - Botão para "Solicitar Acesso ao Álbum Privado".

7. CHAT E REGRAS VISUAIS FREE vs. VIP:

   - Interface de conversas com identificação de mensagens VIP.

   - Para usuário Free: Botão de iniciar nova conversa bloqueado com aviso: "Apenas VIPs podem iniciar chats. Você pode responder mensagens recebidas de assinantes!".

   - Botão de anexo no chat: Envio de foto liberado, mas opção de envio de vídeo com ícone de cadeado "🔒 Vídeo (VIP)".

8. MODAL DE ASSINATURA VIP (CHECKOUT SIMULADO):

   - Pop-up elegante com detalhes em dourado destacando os benefícios VIP (vídeos liberados, iniciar chats, zero anúncios e destaque no feed) com opção de pagamento simulado via Pix.

Foque apenas na interface de usuário, componentes interativos de navegação e protótipo visual no frontend, sem criar banco de dados real.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://private-glow-connect.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d7a41caf-9ce0-4cb7-b803-ae0e6558b151).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
