import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/termos-de-servico")({
  component: TermsPage,
});

function TermsPage() {
  return (
    <main className="min-h-screen bg-background px-5 py-16 text-foreground">
      <article className="mx-auto max-w-3xl">
        <Link to="/" className="text-sm text-primary-glow underline underline-offset-4">Voltar ao início</Link>
        <h1 className="mt-8 text-3xl font-semibold">Termos de serviço</h1>
        <p className="mt-3 text-sm text-muted-foreground">Última atualização: 26 de setembro de 2026</p>
        <section className="mt-8 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">Uso da plataforma</h2>
          <p>A Conexão Privada é destinada a pessoas maiores de 18 anos. Ao utilizar a plataforma, você concorda em fornecer informações verdadeiras e tratar os demais membros com respeito.</p>
          <h2 className="pt-4 text-lg font-semibold text-foreground">Conduta e segurança</h2>
          <p>Não publique conteúdo ilegal, abusivo ou que viole os direitos de outras pessoas. A plataforma poderá analisar denúncias e adotar medidas para proteger a comunidade.</p>
          <h2 id="privacidade" className="scroll-mt-8 pt-4 text-lg font-semibold text-foreground">Privacidade</h2>
          <p>Use os controles disponíveis para decidir quais informações compartilhar. Os detalhes sobre coleta, uso e proteção de dados devem ser descritos na política de privacidade definitiva.</p>
          <h2 className="pt-4 text-lg font-semibold text-foreground">Documento em edição</h2>
          <p>Este texto é uma base informativa e deverá ser revisado e complementado antes da publicação como documento legal definitivo.</p>
        </section>
      </article>
    </main>
  );
}