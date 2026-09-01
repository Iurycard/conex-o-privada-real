# Conexão Privada — Protótipo de UI (Dark Mode)

Protótipo visual navegável, apenas frontend, com dados fictícios em memória. Sem banco de dados, sem login real, sem conteúdo adulto ou explícito — perfis, fotos e textos serão sóbrios e apropriados (estilo rede social premium de eventos e relacionamentos).

## Design system

- Fundos: `#0D0D11` (base) e `#16161E` (superfícies/cards)
- Ação principal: vinho/roxo neon (gradiente) para botões e destaques
- Dourado fosco: exclusivo para elementos VIP (selos, molduras, modal de assinatura)
- Tipografia moderna com display marcante para títulos e sans neutra para texto
- Todos os valores como tokens semânticos em `src/styles.css` (Tailwind v4 `@theme`)

## Telas e rotas

```text
/            Landing: privacidade e discrição, "Entrar" e "Criar Perfil Discreto"
/cadastro    Seletor de tipo de conta, localização, bio, upload simulado de mídia
/feed        Stories (moldura dourada = VIP), cards de post, banners de anúncio
/explorar    Grade de perfis próximos com filtros por tipo e distância
/eventos     Cards de festas/eventos: capa, local, data, tags, presenças, "Vou" / "Tenho Interesse"
/chat        Lista de conversas + thread, regras Free vs VIP
/perfil      Badge de categoria, selo VIP, abas Fotos Públicas / Álbum Privado (blur + cadeado)
```

## Componentes de navegação

- Cabeçalho fixo: logo discreto, sino de notificações com contador, botão de saída rápida (ícone de raio) que navega para uma página neutra
- Navegação fixa: barra inferior no mobile e lateral no desktop, com 5 itens (Feed, Explorar, Eventos, Chat, Perfil)

## Regras Free vs VIP (simuladas)

- Um alternador global de estado (Free/VIP) em contexto React, para demonstrar as duas experiências
- Free: botão de nova conversa bloqueado com o aviso sobre iniciar chats; anexo de vídeo com "🔒 Vídeo (VIP)"; anúncios visíveis no feed
- VIP: selo dourado, sem anúncios, chat e vídeo liberados, destaque no feed
- Álbum privado sempre desfocado com botão "Solicitar Acesso"

## Modal VIP

Modal elegante com borda dourada, lista de benefícios (vídeos, iniciar chats, zero anúncios, destaque), planos e checkout simulado via Pix com QR fictício e botão "Já paguei" que apenas alterna o estado para VIP.

## Detalhes técnicos

- TanStack Start com rotas em `src/routes/`, layout compartilhado no `__root.tsx`
- Estado mock em `src/lib/mock-data.ts` e contexto em `src/context/vip.tsx`
- Componentes shadcn existentes (dialog, tabs, badge, avatar, card) estilizados pelos tokens
- Imagens de capa/avatares geradas como assets locais, sem conteúdo sensível
- `head()` próprio por rota com título e descrição específicos
