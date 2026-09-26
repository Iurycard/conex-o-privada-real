import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/blog")({
  component: BlogPage,
});

function BlogPage() {
  return (
    <main className="min-h-screen bg-background px-5 py-16 text-foreground">
      <div className="mx-auto max-w-4xl">
        <Link to="/" className="text-sm text-primary-glow underline underline-offset-4">Voltar ao início</Link>
        <h1 className="mt-8 text-3xl font-semibold">Blog</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Ideias, novidades e conversas sobre relacionamentos, privacidade e conexões com respeito.
        </p>
        <section className="mt-10 border-y border-border py-8">
          <h2 className="text-lg font-semibold">Novidades em breve</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Este espaço será atualizado com artigos e notícias da comunidade.
          </p>
        </section>
      </div>
    </main>
  );
}