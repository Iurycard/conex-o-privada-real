# Tela de Configurações

## O que será alterado

1. **Atalho no cabeçalho**
   - Trocar o botão de saída rápida com raio por um botão de engrenagem.
   - Navegar para `/configuracoes` ao clicar, preservando os demais controles do cabeçalho.

2. **Nova página de Configurações**
   - Criar uma página responsiva dentro do `AppShell`, com título, tema escuro e cards `rounded-xl`.
   - Organizar os itens em seis áreas: métricas, configurações gerais, segurança e conta, aparência, outros e ações da conta.
   - Usar os ícones Lucide solicitados, valores à direita e `ChevronRight` nas linhas navegáveis.

3. **Interações de protótipo**
   - “Editar perfil” navegará para o cadastro/edição existente.
   - “Minha assinatura” abrirá o modal VIP já existente.
   - O switch de modo de cores terá estado visual funcional, mantendo o app em Dark Mode conforme o escopo atual.
   - Itens ainda sem telas próprias mostrarão feedback de protótipo; “Sair” navegará para o landing (entrar/criar conta) e “Excluir conta” pedirá confirmação sem excluir dados reais.

4. **Rodapé e integração**
   - Incluir versão e copyright centralizados no fim da página.
   - Adicionar metadata própria para a nova rota e manter o sitemap sincronizado.

## Detalhes técnicos

- Nova rota: `src/routes/configuracoes.tsx`.
- Ajustes focados em `src/components/app-shell.tsx` e `src/routes/sitemap[.]xml.ts`.
- Reutilização de `Button`, `Switch`, `AlertDialog`, `AppShell`, `useVip` e tokens existentes; nenhum pacote novo e nenhuma persistência/backend.
