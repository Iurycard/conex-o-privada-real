import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Shield,
  EyeOff,
  Lock,
  Crown,
  Zap,
  ArrowRight,
  Sparkles,
  Heart,
  Calendar,
  MessageCircle,
} from "lucide-react";

import heroImage from "@/assets/hero-landing.jpg";
import phonesImage from "@/assets/app-phones.jpg";
import logoImg from "@/assets/logo.png";
import { AgeGate } from "@/components/age-gate";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Conexão Privada — Rede social discreta para casais e solteiros" },
      {
        name: "description",
        content:
          "Rede social premium +18 com feed, eventos e chat para casais e solteiros. Privacidade, discrição e álbuns protegidos por solicitação.",
      },
      { property: "og:title", content: "Conexão Privada — rede social discreta +18" },
      {
        property: "og:description",
        content: "Feed, eventos e chat em um ambiente privado e elegante para casais e solteiros.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://cosmic-link-ui.lovable.app/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://cosmic-link-ui.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Conexão Privada",
          url: "https://cosmic-link-ui.lovable.app/",
          description:
            "Rede social premium +18 com feed, eventos e chat privado para casais e solteiros.",
        }),
      },
    ],
  }),
  component: Landing,
});

const trustBadges = [
  { label: "Maiores de 18 anos", dot: "bg-primary-glow" },
  { label: "Verificação de perfil", dot: "bg-gold" },
  { label: "Dados criptografados", dot: "bg-primary" },
];

const pillars = [
  { icon: EyeOff, title: "Perfil discreto", text: "Você escolhe o que é público e o que fica protegido." },
  { icon: Lock, title: "Álbum privado", text: "Miniaturas desfocadas e acesso apenas por solicitação." },
  { icon: Zap, title: "Saída rápida", text: "Um toque e a tela some — presente em todas as páginas." },
];

const mobileFeatures = [
  {
    icon: Heart,
    title: "Feed curado",
    text: "Descubra casais e solteiros próximos com total controle de visibilidade.",
  },
  {
    icon: Calendar,
    title: "Eventos & baladas",
    text: "Festas, lounges e encontros selecionados com lista de presenças em tempo real.",
  },
  {
    icon: MessageCircle,
    title: "Chat privado",
    text: "Converse quando quiser. Conteúdo de vídeo e novas conversas são liberados para VIPs.",
  },
];

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <AgeGate />

      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-primary/25 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[380px] w-[380px] rounded-full bg-primary-glow/15 blur-[130px]" />

      <header className="relative mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-lg bg-gradient-primary shadow-neon">
            <img src={logoImg} alt="Logo Conexão Privada" className="h-full w-full object-cover" />
          </span>
          <span className="font-display text-sm font-semibold">
            Conexão <span className="text-primary-glow">Privada</span>
          </span>
        </div>
        <Link to="/feed" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-neon transition-all hover:opacity-90 hover:shadow-lg sm:w-auto">
          Entrar
        </Link>
      </header>

      <main className="relative mx-auto max-w-6xl px-5 pb-24">
        <section className="grid items-center gap-12 pt-12 md:grid-cols-[1.05fr_1fr] md:pt-20">
          <div className="animate-in fade-in slide-in-from-bottom-4 text-center duration-700 md:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-3 py-1 text-[11px] text-gold">
              <Crown className="h-3 w-3" /> Comunidade selecionada · +18
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              Encontros, eventos e conversas
              <span className="block text-gradient-gold">com total discrição</span>
            </h1>
            <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-muted-foreground md:mx-0">
              Uma rede social privada para casais e solteiros. Feed, festas e chat em um ambiente
              elegante, onde privacidade vem antes de tudo.
            </p>

            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row md:justify-start">
              <Link
                to="/cadastro"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-neon transition-all hover:opacity-90 hover:shadow-lg sm:w-auto"
              >
                Criar Perfil Discreto <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/feed"
                className="inline-flex w-full items-center justify-center rounded-full border border-border bg-surface px-7 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-2 sm:w-auto"
              >
                Já tenho conta
              </Link>
            </div>

            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 md:justify-start">
              {trustBadges.map(({ label, dot }) => (
                <li key={label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative animate-in fade-in zoom-in-95 duration-1000">
            <div className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-primary/20 blur-3xl" />
            <img
              src={heroImage}
              alt="Arte abstrata em tons de vinho e violeta representando conexões privadas"
              width={1600}
              height={1000}
              className="relative aspect-[16/10] w-full rounded-3xl border border-border/70 object-cover shadow-2xl"
            />
            <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full border border-gold/30 bg-background/80 px-3 py-1.5 text-[11px] text-gold backdrop-blur-md">
              <Sparkles className="h-3 w-3" /> Ambiente moderado e discreto
            </div>
          </div>
        </section>

        <section className="mt-24">
          <div className="grid gap-4 md:grid-cols-3">
            {pillars.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-2xl border border-border bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-primary-glow">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-24 grid items-center gap-12 md:grid-cols-2">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-2xl font-semibold md:text-3xl">
              Tudo em um só lugar, <span className="text-gradient-gold">no seu celular</span>
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              Navegue pelo feed, descubra eventos próximos e converse sem sair da plataforma.
              Interface pensada para uso noturno, com modo escuro nativo e controles de privacidade
              sempre à mão.
            </p>

            <ul className="mt-8 space-y-6">
              {mobileFeatures.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 text-primary-glow">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-border bg-surface">
            <img
              src={phonesImage}
              alt="Três celulares exibindo o feed, os eventos e o chat do Conexão Privada em modo escuro"
              width={1200}
              height={900}
              loading="lazy"
              className="w-full object-cover"
            />
          </div>
        </section>

        <section className="mt-24 overflow-hidden rounded-2xl border border-gold/30 bg-surface p-6 md:p-8">
          <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-semibold">
                Camada <span className="text-gradient-gold">VIP</span>
              </h2>
              <p className="mt-1.5 max-w-lg text-sm text-muted-foreground">
                Vídeos liberados, chats iniciados por você, zero anúncios e destaque dourado no feed
                e no Explorar.
              </p>
            </div>
            <Link
              to="/feed"
              className="rounded-full bg-gradient-gold px-6 py-3 text-sm font-semibold text-gold-foreground shadow-gold transition-opacity hover:opacity-90"
            >
              Conhecer benefícios
            </Link>
          </div>
        </section>

        <section className="mt-24 text-center">
          <h2 className="text-2xl font-semibold md:text-3xl">Pronto para entrar?</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            Crie seu perfil discreto em poucos passos e comece a explorar a comunidade.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/cadastro"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-neon transition-all hover:opacity-90 sm:w-auto"
            >
              Criar Perfil Discreto <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/feed"
              className="inline-flex w-full items-center justify-center rounded-full border border-border bg-surface px-7 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-2 sm:w-auto"
            >
              Explorar como visitante
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        Protótipo visual · Conexão Privada · Conteúdo restrito a maiores de 18 anos
      </footer>
    </div>
  );
}
