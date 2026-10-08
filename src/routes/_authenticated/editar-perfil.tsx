import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { d1 } from "@/lib/d1-client";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { accountTypes, sexualOrientationOptions, type AccountType } from "@/lib/profile-options";
import { useAuth } from "@/hooks/use-auth";
import { ProfileAvatarPicker } from "@/components/profile-avatar-picker";
import { removeAlbumPhoto, resolveAlbumUrls, uploadAlbumPhotos } from "@/lib/album-storage";

export const Route = createFileRoute("/_authenticated/editar-perfil")({
  head: () => ({
    meta: [
      { title: "Editar perfil — Conexão Privada" },
      { name: "description", content: "Atualize as informações do seu perfil discreto." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EditProfilePage,
});

const genderOptions = ["Mulher", "Homem", "Não binário", "Casal"];

function EditProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [avatarPath, setAvatarPath] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [gender, setGender] = useState("");
  const [orientation, setOrientation] = useState("");
  const [nick, setNick] = useState("");
  const [username, setUsername] = useState("");
  const [type, setType] = useState<AccountType | "">("");
  const [birthDate, setBirthDate] = useState("");
  const [city, setCity] = useState("");
  const [selectedUf, setSelectedUf] = useState("");
  const [ufs, setUfs] = useState<{ sigla: string; nome: string }[]>([]);
  const [cidades, setCidades] = useState<{ id: number; nome: string }[]>([]); 
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [bio, setBio] = useState("");
  const [lookingFor, setLookingFor] = useState<AccountType[]>([]);

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

// Load the signed-in profile from D1.
useEffect(() => {
  async function loadProfile() {
    if (!user) return;

    const { data } = await d1
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (data && !Array.isArray(data)) {
      const row = data as Record<string, unknown>;
      const str = (key: string) => (typeof row[key] === "string" ? (row[key] as string) : "");
      setNick(str("nick"));
      setUsername(str("username"));
      setGender(str("gender"));
      setOrientation(str("orientation"));
      setType((row["type"] as AccountType) || "");
      setBio(str("bio"));
      setCity(str("city"));
      const storedAvatar = str("avatar");
      setAvatarPath(storedAvatar);
      const [resolvedAvatar] = await resolveAlbumUrls(storedAvatar ? [storedAvatar] : [], user.id);
      setAvatarUrl(resolvedAvatar ?? "");
      setLookingFor((row["looking_for"] as AccountType[]) || []);

      const cityValue = str("city");
      if (cityValue.includes(" - ")) {
        const parts = cityValue.split(" - ");
        setSelectedUf(parts[parts.length - 1] || "");
      }
    }
  }
  loadProfile();
}, [user]);

  const toggleLooking = (option: AccountType) => {
    setLookingFor((selected) => selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option]);
  };

const saveProfile = async () => {
  if (!nick.trim() || !username.trim()) {
    toast.error("Informe o nome do perfil e o usuário");
    return;
  }

  if (!user) {
    toast.error("Usuário não autenticado");
    return;
  }

  setSaving(true);
  let uploadedAvatarPath: string | null = null;
  let profileSaved = false;
  try {
    let finalAvatarPath = avatarPath;
    if (avatarFile) {
      const [path] = await uploadAlbumPhotos(user.id, "public", [avatarFile]);
      if (!path) throw new Error("Não foi possível enviar a foto");
      uploadedAvatarPath = path;
      finalAvatarPath = path;
    }

    const { error } = await d1
      .from("profiles")
      .update({
        nick: nick.trim(),
        username: username.trim().replace(/^@/, "").replace(/\s+/g, "_").toLowerCase(),
        gender,
        orientation,
        type,
        city,
        bio: bio.trim(),
        avatar: finalAvatarPath || null,
        looking_for: lookingFor,
      })
      .eq("id", user.id);

    if (error) throw new Error(error.message || "Erro ao atualizar perfil");
    profileSaved = true;

    if (uploadedAvatarPath && avatarPath && avatarPath !== uploadedAvatarPath) {
      try {
        await removeAlbumPhoto(avatarPath);
      } catch (error) {
        console.error("Perfil atualizado, mas não foi possível remover o avatar anterior:", error);
      }
    }
    toast.success("Perfil atualizado com sucesso!");
    navigate({ to: "/perfil" });
  } catch (error) {
    if (uploadedAvatarPath && !profileSaved) {
      try {
        await removeAlbumPhoto(uploadedAvatarPath);
      } catch (cleanupError) {
        console.error("Não foi possível remover o avatar após falha ao salvar o perfil:", cleanupError);
      }
    }
    console.error("Erro ao atualizar perfil:", error);
    toast.error(error instanceof Error ? error.message : "Erro ao atualizar perfil");
  } finally {
    setSaving(false);
  }
};

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/70 bg-background/85 px-4 backdrop-blur-xl">
        <Link to="/configuracoes" aria-label="Voltar" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-sm font-semibold">Editar perfil</h1>
      </header>

      <main className="mx-auto w-full max-w-lg px-4 pb-16 pt-6">
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-border bg-surface p-3 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 text-primary-glow" />
          Use um apelido. Sua identidade e seus dados pessoais permanecem protegidos.
        </div>

        <ProfileAvatarPicker avatarUrl={avatarUrl} nick={nick} file={avatarFile} onFileChange={setAvatarFile} disabled={saving} />

        <section className="mt-6 space-y-5">
          <div>
            <Label className="text-sm">Gênero</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {genderOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={gender === option}
                  onClick={() => setGender(option)}
                  className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${gender === option ? "border-primary/60 bg-primary/10 text-foreground shadow-neon" : "border-border bg-surface text-muted-foreground hover:text-foreground"}`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

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
            <Label htmlFor="profile-name" className="text-sm">Nome do perfil</Label>
            <Input id="profile-name" value={nick} onChange={(event) => setNick(event.target.value)} className="mt-2 border-border bg-surface" />
          </div>

          <div>
            <Label htmlFor="profile-username" className="text-sm">Usuário (@)</Label>
            <Input
              id="profile-username"
              value={username}
              onChange={(event) => setUsername(event.target.value.replace(/^@/, "").replace(/\s+/g, "_").toLowerCase())}
              placeholder="Ex.: casal_lm"
              className="mt-2 border-border bg-surface"
            />
          </div>

          <div>
            <Label className="text-sm">Tipo de perfil</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {accountTypes.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={type === option}
                  onClick={() => setType(option)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${type === option ? "border-transparent bg-gradient-primary text-primary-foreground" : "border-border bg-surface text-muted-foreground hover:text-foreground"}`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="birth-date" className="text-sm">Data de nascimento</Label>
            <Input id="birth-date" type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} className="mt-2 border-border bg-surface" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
</div>

          <div>
            <Label htmlFor="profile-description" className="text-sm">Descrição do perfil</Label>
            <Textarea id="profile-description" rows={5} value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Conte o essencial sobre vocês, seus interesses e o que procuram." className="mt-2 border-border bg-surface" />
          </div>

          <div>
            <Label className="text-sm">Perfis de interesse</Label>
            <p className="mt-1 text-xs text-muted-foreground">Selecione os tipos de perfil que deseja encontrar.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {accountTypes.map((option) => {
                const active = lookingFor.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleLooking(option)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${active ? "border-transparent bg-gradient-primary text-primary-foreground" : "border-border bg-surface text-muted-foreground hover:text-foreground"}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <Button type="button" onClick={() => void saveProfile()} disabled={saving} className="mt-8 h-12 w-full rounded-full bg-gradient-primary font-semibold text-primary-foreground shadow-neon hover:opacity-90">
          {saving ? "Salvando…" : "Salvar alterações"}
        </Button>
      </main>
    </div>
  );
}
