import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, MapPin, ShieldCheck } from "lucide-react";
import { accountTypes, sexualOrientationOptions, type AccountType } from "@/lib/profile-options";
import { useProfiles } from "@/context/profiles-context";
import { useEffect } from "react";
import { useAuth, type AuthUser } from "@/hooks/use-auth";
import { authRequest } from "@/lib/d1-client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ProfileAvatarPicker } from "@/components/profile-avatar-picker";
import { d1 } from "@/lib/d1-client";
import { removeAlbumPhoto, uploadAlbumPhotos } from "@/lib/album-storage";
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
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("");
  const [selectedUf, setSelectedUf] = useState("");
  const [ufs, setUfs] = useState<{ sigla: string; nome: string }[]>([]);
  const [cidades, setCidades] = useState<{ id: number; nome: string }[]>([]); 
  const [orientation, setOrientation] = useState("heterossexual");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [lookingFor, setLookingFor] = useState<AccountType[]>([]);
  const [busy, setBusy] = useState(false);
  const { addProfile } = useProfiles();
  const { user, refresh } = useAuth();
  const navigate = useNavigate();

    // 1. Carrega os estados do Brasil ao abrir a tela
  useEffect(() => {
    fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome")
      .then((res) => res.json())
      .then((data) => setUfs(data))
      .catch(() => {});
  }, []);
  
  // 2. Carrega as cidades assim que o estado (UF) é selecionado
  useEffect(() => {
    if (!selectedUf) {
      setCidades([]);
      return;
    }
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedUf}/municipios?orderBy=nome`)
      .then((res) => res.json())
      .then((data) => setCidades(data))
      .catch(() => {});
  }, [selectedUf]);
  
  const toggleLooking = (t: AccountType) =>
    setLookingFor((list) => (list.includes(t) ? list.filter((x) => x !== t) : [...list, t]));

  const saveAvatar = async (profileId: string) => {
    if (!avatarFile) return;
    const [path] = await uploadAlbumPhotos(profileId, "public", [avatarFile]);
    if (!path) throw new Error("Não foi possível enviar a foto");

    const { error } = await d1.from("profiles").update({ avatar: path }).eq("id", profileId);
    if (error) {
      try {
        await removeAlbumPhoto(path);
      } catch (cleanupError) {
        console.error("Não foi possível remover o avatar após falha ao salvar o perfil:", cleanupError);
      }
      throw new Error(error.message || "Não foi possível salvar a foto no perfil");
    }
  };

  const handleSubmit = async () => {
    if (!nick.trim() || !username.trim()) {
      toast.error("Informe o nome do perfil e o usuário");
      return;
    }
  const payload = {
      nick,
      username: username.trim().replace(/^@/, "").replace(/\s+/g, "_").toLowerCase(),
      type,
      city,
      bio,
      hue: 300,
      lookingFor,
      orientation,
    };

    if (user) {
      setBusy(true);
      try {
        const profileId = await addProfile(payload);
        await saveAvatar(profileId);
        toast.success("Perfil criado");
        navigate({ to: "/feed" });
      } catch (error) {
        console.error("Erro ao criar perfil:", error);
        toast.error(error instanceof Error ? error.message : "Não foi possível salvar o perfil");
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!email.trim() || password.length < 12) {
      toast.error("Informe um e-mail e uma senha com pelo menos 12 caracteres");
      return;
    }

    setBusy(true);
    const { data: registeredUser, error } = await authRequest<AuthUser>("/api/auth/register", {
      email: email.trim(),
      password,
      profile: {
        ...payload,
        nick: payload.nick.trim(),
        username: payload.username.trim().replace(/^@/, "").replace(/\s+/g, "_").toLowerCase(),
        city: payload.city.trim(),
        bio: payload.bio.trim(),
      },
    });
    if (error || !registeredUser) {
      setBusy(false);
      toast.error(error?.message || "Não foi possível criar a conta. Tente novamente.");
      return;
    }

    let avatarError: unknown = null;
    if (avatarFile) {
      try {
        await saveAvatar(registeredUser.id);
      } catch (error) {
        console.error("Conta criada, mas não foi possível salvar o avatar:", error);
        avatarError = error;
      }
    }

    window.dispatchEvent(new Event("cp:auth-changed"));
    await refresh();
    setBusy(false);
    if (avatarError) {
      toast.error(
        avatarError instanceof Error
          ? `Conta criada, mas a foto não foi salva: ${avatarError.message}. Você pode adicioná-la em Editar perfil.`
          : "Conta criada, mas a foto não foi salva. Você pode adicioná-la em Editar perfil.",
      );
    } else {
      toast.success("Conta criada");
    }
    navigate({ to: "/feed" });
  };



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
            <Label htmlFor="username" className="text-sm">Usuário (@)</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/^@/, "").replace(/\s+/g, "_").toLowerCase())}
              placeholder="Ex.: casal_lm"
              className="mt-2 border-border bg-surface"
            />
          </div>
          <ProfileAvatarPicker nick={nick} file={avatarFile} onFileChange={setAvatarFile} disabled={busy} />

          {!user && (
            <>
              <div>
                <Label htmlFor="email" className="text-sm">E-mail</Label>
                <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" className="mt-2 border-border bg-surface" />
              </div>
              <div>
                <Label htmlFor="password" className="text-sm">Senha</Label>
                <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo de 12 caracteres" className="mt-2 border-border bg-surface" />
              </div>
            </>
          )}
                 <div>
            <Label htmlFor="loc" className="text-sm">Localização</Label>
            <div className="relative mt-2">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="loc"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              
                placeholder="Cidade, estado"
                className="border-border bg-surface pl-9"
              />
            
            </div>
          </div>
 {/* Select de Estado */}
  <div className="space-y-2">
    <Label htmlFor="uf">Estado (UF)</Label>
    <select
      id="uf"
      value={selectedUf}
      onChange={(e) => setSelectedUf(e.target.value)}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <option value="">Selecione o estado</option>
      {ufs.map((uf) => (
        <option key={uf.sigla} value={uf.sigla}>
          {uf.nome} ({uf.sigla})
        </option>
      ))}
    </select>
  </div>

  {/* Select de Cidade */}
  <div className="space-y-2">
    <Label htmlFor="city">Cidade</Label>
    <select
      id="city"
      disabled={!selectedUf}
      value={city.includes(" - ") ? city.split(" - ") : city}
      onChange={(e) => {
        if (e.target.value) {
          setCity(`${e.target.value} - ${selectedUf}`);
        }
      }}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <option value="">
        {selectedUf ? "Selecione a cidade" : "Escolha o estado primeiro"}
      </option>
      {cidades.map((cidade) => (
        <option key={cidade.id} value={cidade.nome}>
          {cidade.nome}
        </option>
      ))}
    </select>
  </div>
  </section>
          <div>
            <Label className="text-sm">Orientação sexual</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {sexualOrientationOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={orientation === option.value}
                  onClick={() => setOrientation(option.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${orientation === option.value ? "border-transparent bg-gradient-primary text-primary-foreground" : "border-border bg-surface text-muted-foreground hover:text-foreground"}`}
                >
                  {option.value}
                </button>
              ))}
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

        <button
          onClick={() => void handleSubmit()}
          disabled={busy}
          className="mt-8 w-full rounded-full bg-gradient-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-neon disabled:opacity-60"
        >
          {busy ? "Criando…" : "Concluir cadastro"}
        </button>

        <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
          Ao criar sua conta, você concorda com os{" "}
          <Link to="/termos-de-servico" className="font-medium text-primary-glow underline underline-offset-2">
            termos de serviço
          </Link>{" "}
          e afirma que possui 18 anos ou mais.
        </p>
        <Link
          to="/saida"
          className="mt-2 block text-center text-xs text-primary-glow underline underline-offset-2"
        >
          Tenho menos de 18 - Sair
        </Link>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link to="/entrar" className="font-semibold text-primary-glow">
            Entrar
</Link>
        </p>
      </main>
    </div>
  ); 
}
