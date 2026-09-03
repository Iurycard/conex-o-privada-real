# Landing page — seções finais conforme as imagens enviadas

Substituir todo o conteúdo da landing (`src/routes/index.tsx`) a partir dos botões "Criar Perfil Discreto" / "Já tenho conta", replicando o layout exato das imagens de referência, mantendo os tokens dark/gold/violeta existentes.

## O que muda

1. **Abaixo dos botões de CTA**
   - Linha de selos com pontos coloridos: "Maiores de 18 anos" (ponto violeta), "Verificação de perfil" (ponto dourado), "Dados criptografados" (ponto magenta).

2. **Cards de privacidade (grid de 3)**
   - "Perfil discreto" (EyeOff) — Você escolhe o que é público e o que fica protegido.
   - "Álbum privado" (Lock) — Miniaturas desfocadas e acesso apenas por solicitação.
   - "Saída rápida" (Zap) — Um toque e a tela some — presente em todas as páginas.
   - Estilo dos cards conforme imagem: fundo de superfície, ícone em círculo violeta, título em negrito.

3. **Seção "Tudo em um só lugar, no seu celular"** (título com destaque dourado em "no seu celular")
   - Coluna esquerda: parágrafo descritivo + lista de 3 features com ícones circulares:
     - Feed curado (Heart) — Descubra casais e solteiros próximos com total controle de visibilidade.
     - Eventos & baladas (Calendar) — Festas, lounges e encontros selecionados com lista de presenças em tempo real.
     - Chat privado (MessageCircle) — Converse quando quiser. Conteúdo de vídeo e novas conversas são liberados para VIPs.
   - Coluna direita: imagem gerada de mockup com 3 celulares exibindo telas dark do app (feed, eventos, chat), em card com borda arredondada — gerada via image generation, salva em `src/assets/app-phones.jpg`.

4. **Card "Camada VIP"**
   - Título com "VIP" em dourado, texto: "Vídeos liberados, chats iniciados por você, zero anúncios e destaque dourado no feed e no Explorar."
   - Botão dourado "Conhecer benefícios" (link para /feed).

5. **CTA final "Pronto para entrar?"**
   - Subtexto: "Crie seu perfil discreto em poucos passos e comece a explorar a comunidade."
   - Botão primário gradiente violeta "Criar Perfil Discreto" (→ /cadastro) e botão outline "Explorar como visitante" (→ /feed).
   - Remove a seção de stats atual (12k+, 180, 100%) e a seção de pilares antiga, substituídas pelo novo conteúdo.

## Detalhes técnicos
- Edição apenas em `src/routes/index.tsx` (+ 1 imagem gerada em `src/assets/app-phones.jpg`).
- Manter hero superior, AgeGate, header, footer, head()/SEO já existentes.
- Usar tokens semânticos (`bg-surface`, `text-gold`, `bg-gradient-primary`, `shadow-neon`) e lucide-react; responsivo (grid md:grid-cols).
- Verificar build e preview da landing após a edição.
