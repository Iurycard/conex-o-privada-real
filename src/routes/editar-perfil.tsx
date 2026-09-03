import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Camera, MapPin, ShieldCheck } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { AvatarOrb } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProfiles } from "@/context/profiles-context";
import { accountTypes, type AccountType } from "@/lib/mock-data";

export const Route = createFileRoute("/editar-perfil")({
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
  const { current, updateCurrentProfile } = useProfiles();
  const [avatar, setAvatar] = useState(current.avatar ?? "");
  const [gender, setGender] = useState(current.gender ?? "");
  const [nick, setNick] = useState(current.nick);
  const [type, setType] = useState<AccountType>(current.type);
  const [birthDate, setBirthDate] = useState(current.birthDate ?? "");
  const [city, setCity] = useState(current.city);
  const [bio, setBio] = useState(current.bio);
  const [lookingFor, setLookingFor] = useState<AccountType[]>(current.lookingFor ?? []);

  const toggleLooking = (option: AccountType) => {
    setLookingFor((selected) => selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option]);
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setAvatar(reader.result);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const saveProfile = () => {
    if (!nick.trim()) {
      toast.error("Informe um nome para o perfil");
      return;
    }
    if (!gender) {
      toast.error("Selecione o gênero do perfil");
      return;
    }
    updateCurrentProfile({
      avatar,
      gender,
      nick: nick.trim(),
      type,
      birthDate,
      city: city.trim(),
      bio: bio.trim(),
      lookingFor,
    });
    toast.success("Perfil atualizado");
    navigate({ to: "/configuracoes" });
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

        <section className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
          <div className="relative">
            {avatar ? (
              <img src={avatar} alt={`Imagem de perfil de ${nick}`} className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <AvatarOrb profile={current} size={80} ring={false} />
            )}
            <label className="absolute bottom-0 right-0 grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground shadow-lg">
              <Camera className="h-4 w-4" />
              <input type="file" accept="image/*" className="sr-only" onChange={handleAvatarChange} />
            </label>
          </div>
          <div>
            <p className="text-sm font-semibold">Imagem de perfil</p>
            <p className="mt-1 text-xs text-muted-foreground">Escolha uma foto que represente seu perfil.</p>
          </div>
        </section>

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
            <Label htmlFor="profile-name" className="text-sm">Nome do perfil</Label>
            <Input id="profile-name" value={nick} onChange={(event) => setNick(event.target.value)} className="mt-2 border-border bg-surface" />
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

          <div>
            <Label htmlFor="profile-location" className="text-sm">Localização</Label>
            <div className="relative mt-2">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Textarea id="profile-location" rows={2} value={city} onChange={(event) => setCity(event.target.value)} placeholder="Cidade, estado e região" className="border-border bg-surface pl-9" />
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

        <Button type="button" onClick={saveProfile} className="mt-8 h-12 w-full rounded-full bg-gradient-primary font-semibold text-primary-foreground shadow-neon hover:opacity-90">
          Salvar alterações
        </Button>
      </main>
    </div>
  );
}
