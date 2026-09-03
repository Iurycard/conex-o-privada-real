import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ImagePlus, MapPin, ShieldCheck } from "lucide-react";
import { accountTypes, type AccountType } from "@/lib/mock-data";
import { useProfiles } from "@/context/profiles-context";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/cadastro")({
  head: () => ({
    meta: [
      { title: "Criar perfil discreto — Conexão Privada" },
      { name: "description", content: "Escolha o tipo de conta, defina localização, bio e mídias do seu perfil privado." },
      { property: "og:title", content: "Criar perfil discreto — Conexão Privada" },
      { property: "og:description", content: "Cadastro em poucos passos: tipo de conta, localização, bio e fotos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const [type, setType] = useState<AccountType>("Casal (Ele/Ela)");
  const [nick, setNick] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [lookingFor, setLookingFor] = useState<AccountType[]>([]);
  const { addProfile } = useProfiles();
  const navigate = useNavigate();

  const toggleLooking = (t: AccountType) =>
    setLookingFor((list) => (list.includes(t) ? list.filter((x) => x !== t) : [...list, t]));


  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/70 bg-background/85 px-4 backdrop-blur-xl">
        <Link to="/" aria-label="Voltar" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-sm font-semibold">Criar Perfil Discreto</h1>
      </header>

      <main className="mx-auto max-w-lg px-4 pb-16 pt-6">
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-border bg-surface p-3 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 text-primary-glow" />
          Seu apelido é o que aparece publicamente. Nada de nome real ou documentos.
        </div>

        <section>
          <Label className="text-sm">Tipo de conta</Label>
          <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
            {accountTypes.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                  type === t
                    ? "border-primary/60 bg-primary/10 text-foreground shadow-neon"
                    : "border-border bg-surface text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6 space-y-4">
          <div>
            <Label htmlFor="nick" className="text-sm">Apelido do perfil</Label>
            <Input id="nick" value={nick} onChange={(e) => setNick(e.target.value)} placeholder="Ex.: L&M" className="mt-2 border-border bg-surface" />
          </div>

          <div>
            <Label htmlFor="loc" className="text-sm">Localização</Label>
            <div className="relative mt-2">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="loc" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Cidade, estado" className="border-border bg-surface pl-9" />
            </div>
          </div>

          <div>
            <Label htmlFor="bio" className="text-sm">Bio</Label>
            <Textarea
              id="bio"
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Conte o essencial: interesses, o que procuram e o nível de discrição que preferem."
              className="mt-2 border-border bg-surface"
            />
          </div>

          <div>
            <Label className="text-sm">O que você está procurando?</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {accountTypes.map((t) => {
                const active = lookingFor.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleLooking(t)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                      active
                        ? "border-transparent bg-gradient-primary text-primary-foreground"
                        : "border-border bg-surface text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Selecione um ou mais perfis. Isso define quem encontra você na busca.
            </p>
          </div>

          <div>
            <Label className="text-sm">Mídias</Label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <button
                  key={i}
                  onClick={() => toast("Upload simulado neste protótipo")}
                  className="grid aspect-square place-items-center gap-1 rounded-xl border border-dashed border-border bg-surface text-muted-foreground hover:text-foreground"
                >
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-[10px]">{i === 0 ? "Capa" : "Foto"}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Fotos sensíveis podem ir direto para o álbum privado, com blur automático.
            </p>
          </div>
        </section>

        <button
          onClick={() => {
            if (!nick.trim()) {
              toast.error("Escolha um apelido para o perfil");
              return;
            }
            addProfile({ nick, type, city, bio, hue: 300, lookingFor });
            toast.success("Perfil criado (protótipo)");
            navigate({ to: "/feed" });
          }}
          className="mt-8 w-full rounded-full bg-gradient-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-neon"
        >
          Concluir cadastro
        </button>
      </main>
    </div>
  );
}
