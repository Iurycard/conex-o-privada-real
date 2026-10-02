import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin, Search, SlidersHorizontal } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MediaBlock, PageHeader, TypeBadge, VipBadge } from "@/components/bits";
import { accountTypes, type AccountType } from "@/lib/profile-options";
import { useProfiles, type Profile } from "@/context/profiles-context";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useVip } from "@/context/vip";

export const Route = createFileRoute("/_authenticated/explorar")({
  head: () => ({
    meta: [
      { title: "Explorar perfis — Conexão Privada" },
      {
        name: "description",
        content:
          "Descubra casais e solteiros próximos, com filtros por perfil, distância e idade.",
      },
      { property: "og:title", content: "Explorar perfis — Conexão Privada" },
      { property: "og:description", content: "Perfis próximos, com filtro por tipo, distância e idade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExplorePage,
});

const MAX_DISTANCE = 30;

function profileAge(birthDate: string | null) {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  ) {
    age -= 1;
  }
  return age;
}

function profileDistanceKm(profile: Profile, viewer: Profile | null) {
  if (profile.city && viewer?.city && profile.city.trim().toLowerCase() === viewer.city.trim().toLowerCase()) {
    return 0;
  }
  if (
    typeof profile.latitude !== "number" ||
    typeof profile.longitude !== "number" ||
    typeof viewer?.latitude !== "number" ||
    typeof viewer.longitude !== "number"
  ) {
    return null;
  }

  const radians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = radians(viewer.latitude - profile.latitude);
  const longitudeDelta = radians(viewer.longitude - profile.longitude);
  const latitudeOne = radians(profile.latitude);
  const latitudeTwo = radians(viewer.latitude);
  const arc =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeOne) * Math.cos(latitudeTwo) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc));
}

function ExplorePage() {
  const { profiles, current, isBlocked } = useProfiles();
  const { isVip, openVipModal } = useVip();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string[]>([]);
  const [city, setCity] = useState("Todas");
  const [distance, setDistance] = useState<number[]>([MAX_DISTANCE]);
  const [ageRange, setAgeRange] = useState<number[]>([18, 65]);
  const [lookingFor, setLookingFor] = useState<string>("Todos");

  const list = profiles
    .filter((p) => {
      const age = profileAge(p.birth_date);
      const matchesAge = age === null
        ? ageRange[0] === 18 && ageRange[1] === 65
        : age >= (ageRange[0] ?? 18) && age <= (ageRange[1] ?? 65);

      return !isBlocked(p.id) &&
        (filter.length === 0 || filter.includes(p.type)) &&
        (city === "Todas" || p.city === city) &&
        (lookingFor === "Todos" || (p.looking_for ?? []).includes(lookingFor as AccountType)) &&
        matchesAge &&
        ((distance[0] ?? MAX_DISTANCE) >= MAX_DISTANCE ||
          (profileDistanceKm(p, current) ?? Number.POSITIVE_INFINITY) <= (distance[0] ?? MAX_DISTANCE)) &&
        p.nick.toLowerCase().includes(q.toLowerCase());
    })
    .sort((a, b) => Number(b.vip) - Number(a.vip));

  const activeFilters =
    (filter.length > 0 ? 1 : 0) +
    (city !== "Todas" ? 1 : 0) +
    (lookingFor !== "Todos" ? 1 : 0); 
    

  return (
    <AppShell>
      <PageHeader title="Explorar" subtitle="Perfis verificados perto de você" />

      <section className="space-y-3 px-4 md:px-0">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por apelido"
                aria-label="Buscar perfis por apelido"
                className="border-border bg-surface pl-9"
              />
            </div>

            <Dialog>
              <DialogTrigger className="relative inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm text-muted-foreground hover:text-foreground">
                <SlidersHorizontal className="h-4 w-4" /> Filtros
                {activeFilters > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-gradient-primary px-1 text-[10px] font-semibold text-primary-foreground">
                    {activeFilters}
                  </span>
                )}
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] overflow-y-auto border-border bg-surface sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Filtrar busca</DialogTitle>
                  <DialogDescription>Refine por tipo de perfil, distância e idade.</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-2">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Busca por perfil</p>
                    <div className="flex flex-wrap gap-2">
                      {accountTypes.map((t) => (
                        <button
                          key={t}
                          onClick={() =>
                            setFilter((current) =>
                              current.includes(t) ? current.filter((item) => item !== t) : [...current, t],
                            )
                          }
                          className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                            filter.includes(t)
                              ? "border-transparent bg-gradient-primary text-primary-foreground"
                              : "border-border bg-surface-2 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {filter.length > 0 ? `${filter.length} tipo(s) selecionado(s)` : "Todos os tipos"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="explore-city" className="text-xs font-medium text-muted-foreground">
                      Escolher cidade
                    </label>
                    <select
                      id="explore-city"
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                      className="h-10 w-full rounded-md border border-border bg-surface-2 px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="Todas">Todas as cidades</option>
                      {[...new Set(profiles.map((profile) => profile.city))].sort().map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Procurando por:</p>
                    <div className="flex flex-wrap gap-2">
                      {["Todos", ...accountTypes].map((t) => (
                        <button
                          key={t}
                          onClick={() => setLookingFor(t)}
                          className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                            lookingFor === t
                              ? "border-transparent bg-gradient-primary text-primary-foreground"
                              : "border-border bg-surface-2 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                      Distância máxima
                      <span className="text-foreground">
                        {distance[0]}
                        {distance[0]! >= MAX_DISTANCE ? "+" : ""} km
                      </span>
                    </p>
                    <Slider
                      value={distance}
                      onValueChange={setDistance}
                      min={1}
                      max={MAX_DISTANCE}
                      step={1}
                      aria-label="Distância máxima em quilômetros"
                    />
                    <p className="text-[11px] text-muted-foreground">Perfis até {distance[0]} km de distância</p>
                  </div>

                  <div className="space-y-3">
                    <p className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                      Faixa de idade
                      <span className="text-foreground">
                        {ageRange[0]} – {ageRange[1]} anos
                      </span>
                    </p>
                    <Slider
                      value={ageRange}
                      onValueChange={setAgeRange}
                      min={18}
                      max={65}
                      step={1}
                      aria-label="Faixa de idade"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Entre {ageRange[0]} e {ageRange[1]} anos
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setFilter([]);
                      setCity("Todas");
                      setLookingFor("Todos");
                      setDistance([MAX_DISTANCE]);
                      setAgeRange([18, 65]);
                    }}
                    className="w-full rounded-full border border-border bg-surface-2 py-2.5 text-sm text-muted-foreground hover:text-foreground"
                  >
                    Limpar filtros
                  </button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {!isVip && (
            <button
              type="button"
              onClick={openVipModal}
              className="w-full rounded-xl border border-gold/30 bg-gold/5 p-3 text-left text-xs text-foreground/90"
            >
              <span className="font-semibold text-gold">Perfis VIP aparecem primeiro.</span> Assine para destacar seu perfil e encontrar conexões com prioridade.
            </button>
          )}

          <div className="mt-1 grid grid-cols-2 gap-3 pb-6 md:grid-cols-3">
            {list.map((p) => (
              <Link
                key={p.id}
                to="/perfil/$id"
                params={{ id: p.id }}
                className={`block overflow-hidden rounded-xl border bg-surface p-3 transition-colors hover:border-primary/50 sm:p-4 ${
                  p.vip ? "border-gold/35" : "border-border"
                }`}
              >
                <div className="relative">
                  <MediaBlock
                    hue={p.hue}
                    src={p.avatar}
                    alt={`Foto de perfil de ${p.nick}`}
                    className="aspect-square w-full rounded-xl"
                  />
                  {p.vip && <VipBadge className="absolute right-2 top-2" />}
                </div>
                <p className="mt-3 truncate text-sm font-semibold">
                  {p.nick}
                  {profileAge(p.birth_date) !== null && (
                    <span className="text-muted-foreground"> · {profileAge(p.birth_date)} anos</span>
                  )}
                </p>
                <TypeBadge type={p.type} className="mt-1.5" />
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{p.bio}</p>
                <p className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {p.city}
                </p>
              </Link>
            ))}
            {list.length === 0 && (
              <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
                Nenhum perfil encontrado com esses filtros.
              </p>
            )}
          </div>
      </section>
    </AppShell>
  );
}
