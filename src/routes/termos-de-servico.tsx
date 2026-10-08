import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/termos-de-servico")({
  head: () => ({
    meta: [
      { title: "Termos de Serviço — Conexão Privada" },
      { name: "description", content: "Termos de serviço e política de privacidade da Conexão Privada." },
      { property: "og:title", content: "Termos de Serviço — Conexão Privada" },
      { property: "og:description", content: "Termos de serviço e política de privacidade da Conexão Privada." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.conexaoprivada.site/termos-de-servico" },
    ],
    links: [{ rel: "canonical", href: "https://www.conexaoprivada.site/termos-de-servico" }],
  }),
  component: TermsPage,
});

 function TermsPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Cabeçalho */}
        <header className="border-b border-neutral-800 pb-6 text-center sm:text-left">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
            Termos de Serviço — Conexão Privada
          </h1>
          <p className="text-sm text-neutral-400">
            Última atualização: 29 de setembro de 2026
          </p>
        </header>

        {/* Conteúdo dos Termos */}
        <main className="space-y-8 text-neutral-300 leading-relaxed text-sm sm:text-base">
          
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white border-b border-neutral-800 pb-2">
              1. Introdução
            </h2>
            <p>Ao utilizar a plataforma Conexão Privada, você:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Concorda integralmente com os termos, normas e políticas descritas neste documento.</li>
              <li>Declara ter pelo menos 18 anos de idade, estando legalmente autorizado a acessar conteúdo adulto.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white border-b border-neutral-800 pb-2">
              2. Definições
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Usuário:</strong> pessoa com perfil ativo no Conexão Privada.</li>
              <li><strong>Assinante VIP:</strong> usuário com plano pago, tendo acesso a recursos exclusivos.</li>
              <li><strong>Anunciante:</strong> perfil com autorização expressa para realizar ações de marketing dentro do Conexão Privada.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white border-b border-neutral-800 pb-2">
              3. Regras Gerais de Conduta
            </h2>
            <p>É estritamente proibido:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Criar múltiplos perfis, exceto quando for um de casal e outro individual.</li>
              <li>Utilizar fotos falsas ou copiadas da internet.</li>
              <li>Criar perfis falsos com fins de engano, difamação ou má-fé.</li>
              <li>Publicar qualquer tipo de divulgação, conteúdo publicitário ou comercial sem autorização, seja de produtos ou serviços de qualquer natureza.</li>
              <li>Divulgar redes sociais, links externos ou captar seguidores para fora da plataforma.</li>
              <li>Ofender, difamar ou promover discursos de ódio.</li>
              <li>Praticar ou incentivar prostituição, mesmo de forma indireta (sugerir “presentinhos”, “mimos” ou ofertas de dinheiro).</li>
              <li>Publicar ou incentivar atividades ilícitas, tais como: pedofilia, zoofilia, mutilações, tortura, doenças, incesto, escatofilia/coprofilia.</li>
              <li>Consumo ou apologia ao uso de drogas, incluindo fotos fumando maconha ou símbolos relacionados.</li>
              <li>Porte ou exibição de armas, golpes, exposição de dados ou imagem de terceiros.</li>
              <li>Enviar mensagens repetitivas ou spam, tanto no feed/mural quanto em mensagens privadas.</li>
              <li>Divulgar no feed/mural ou biografia contatos como telefones e links de grupos (WhatsApp, Telegram, etc).</li>
              <li>Praticar discriminação de qualquer natureza.</li>
              <li>Solicitar ou oferecer dinheiro, organizar rifas, sorteios, divulgar sites de apostas, arrecadações ou ajuda financeira para qualquer finalidade.</li>
              <li>Utilizar ferramentas de Inteligência Artificial para gerar conteúdo (fotos ou textos).</li>
              <li>Utilizar ferramentas de automatização (web scraping, robôs de interação, etc).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white border-b border-neutral-800 pb-2">
              4. Publicação de Conteúdo (mensagens, comentários e mídias)
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Toda comunicação deve ser educada, cordial e respeitosa.</li>
              <li>O usuário é integralmente responsável por tudo que publicar.</li>
              <li>Proibido qualquer conteúdo que viole os princípios da plataforma.</li>
              <li>É vedado publicar fotos de terceiros sem autorização ou que contenham elementos ofensivos ou ilícitos.</li>
              <li>A plataforma não se responsabiliza pelos seus dados em caso de perda e não é um serviço de “backup”.</li>
            </ul>
          </section>

          <section id="privacidade" className="space-y-3">
            <h2 className="text-xl font-semibold text-white border-b border-neutral-800 pb-2">
              5. Privacidade e Proteção de Dados
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Nunca entraremos em contato com você sem permissão.</li>
              <li>A plataforma não realiza contatos telefônicos com usuários. Toda comunicação oficial é feita via mensagens internas ou e-mail.</li>
              <li>Informações sensíveis (senha, e-mail, IP, telefone, nome real, endereço) são protegidas e só serão divulgadas em casos legais/judiciais.</li>
              <li>Em casos de solicitação Policial ou Judicial, todas informações solicitadas pelos órgãos oficiais serão formalmente repassadas, inclusive informações que obtivermos de fornecedores bancários ou telemáticos. A plataforma cooperará integralmente com investigações legais ou judiciais, conforme exigido por autoridades competentes.</li>
              <li>A plataforma não se responsabiliza se alguma informação publicada por você for copiada por terceiros, seja publicação por texto ou foto.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white border-b border-neutral-800 pb-2">
              6. Perfis e Segurança
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Perfis podem ser bloqueados, banidos ou excluídos a qualquer momento, com base em denúncias, análises de conteúdo ou critérios administrativos.</li>
              <li>A plataforma pode bloquear IPs, e-mails, números de telefones e imagens usadas por perfis irregulares.</li>
              <li>Perfis bloqueados ou banidos ficam inacessíveis ao dono e invisíveis para demais usuários.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white border-b border-neutral-800 pb-2">
              7. Moderação (Arbitragem)
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>O Conexão Privada não é aberto ou público, é um site exclusivo para membros cadastrados, maiores de 18 anos.</li>
              <li>A moderação atua de maneira arbitrária, visando o respeito das regras e a segurança dos membros.</li>
              <li>As sanções aplicadas podem ser definidas por critérios objetivos (qualificados nas normas) ou por critérios subjetivos.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white border-b border-neutral-800 pb-2">
              8. Sanções Internas aplicadas pela Moderação
            </h2>
            <p>A equipe de moderação pode aplicar sem necessidade de advertência prévia:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Advertência por mensagem privada.</li>
              <li>Aviso publicado em seu perfil/feed.</li>
              <li>Bloqueio temporário.</li>
              <li>Banimento definitivo.</li>
              <li>Remoção de qualquer conteúdo (foto, texto ou símbolos).</li>
              <li>O Conexão Privada pode manter registro de e-mail ou telefone banidos no site, com a estrita finalidade de evitar que sejam reutilizados.</li>
              <li>Qualquer decisão poderá ser revista mediante solicitação por e-mail.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white border-b border-neutral-800 pb-2">
              9. Direitos de Reembolsos
            </h2>
            <p>Usuários têm direito a reembolso por arrependimento, desde que:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Não tenham sido bloqueados por uso comercial indevido.</li>
              <li>Seja o primeiro pedido por CPF (1 reembolso por CPF).</li>
              <li>Reembolsos não são concedidos por desacordo com regras ou termos.</li>
              <li>O valor do reembolso será: integral, se for feito em até 7 dias; proporcional, se for feito após 7 dias.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white border-b border-neutral-800 pb-2">
              10. Anunciantes
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Anunciantes têm autorização para divulgar seus serviços em seus próprios perfis/murais.</li>
              <li>Não é permitido anunciar em perfis de terceiros.</li>
              <li>Devem respeitar o intervalo mínimo entre publicações comerciais, conforme acordado.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white border-b border-neutral-800 pb-2">
              11. Encerramento de Conta
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>A conta poderá ser encerrada por descumprimento das normas ou por risco legal.</li>
              <li>Você pode encerrar sua conta a qualquer momento pelas configurações do perfil.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white border-b border-neutral-800 pb-2">
              12. Consentimento e Responsabilidade
            </h2>
            <p>
              Ao publicar conteúdo, o usuário declara possuir os direitos sobre as imagens e textos publicados e consente com sua exibição conforme as regras da plataforma. O Conexão Privada não se responsabiliza por violações de direitos autorais cometidas por usuários.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white border-b border-neutral-800 pb-2">
              13. Propriedade Intelectual
            </h2>
            <p>
              Todos os direitos relativos à marca, logotipo, identidade visual e demais elementos do Conexão Privada pertencem exclusivamente à plataforma. É vedado o uso desses elementos sem autorização expressa.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-white border-b border-neutral-800 pb-2">
              14. Considerações Finais
            </h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Os moderadores do Conexão Privada atuam como árbitros das regras aqui descritas.</li>
              <li>Este documento pode ser alterado a qualquer momento para manter a segurança e integridade da plataforma.</li>
              <li>O uso contínuo do site implica concordância com estas regras.</li>
              <li>Poderemos empregar ferramentas automatizadas de Inteligência Artificial para análise de conteúdo visando a detecção de comportamentos ilícitos ou violações graves das regras.</li>
            </ul>
          </section>

          <div className="p-4 bg-red-950/40 border border-red-800/50 rounded-lg text-red-200 font-bold text-center mt-6">
            O CONEXÃO PRIVADA SE RESERVA O DIREITO DE BLOQUEIO, BANIMENTO OU EXCLUSÃO DE PERFIS SEM AVISO PRÉVIO.
          </div>

        </main>
      </div>
    </div>
  );
}