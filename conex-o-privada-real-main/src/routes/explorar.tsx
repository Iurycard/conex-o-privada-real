import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin, Search, SlidersHorizontal, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AvatarOrb, PageHeader, TypeBadge, VipBadge } from "@/components/bits";
import { EventCard } from "@/components/event-card";
import { accountTypes, events, type AccountType } from "@/lib/mock-data";
import { useProfiles } from "@/context/profiles-context";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/explorar")({
  head: () => ({
    meta: [
      { title: "Explorar perfis e eventos — Conexão Privada" },
      {
        name: "description",
        content:
          "Descubra casais e solteiros próximos e a agenda de eventos, com filtro por perfil, distância e idade.",
      },
      { property: "og:title", content: "Explorar perfis e eventos — Conexão Privada" },
      { property: "og:description", content: "Perfis próximos e eventos, com filtro por tipo, distância e idade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExplorePage,
});

const MAX_DISTANCE = 30;

function ExplorePage() {
  const { profiles } = useProfiles();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("Todos");
  const [distance, setDistance] = useState<number[]>([MAX_DISTANCE]);
  const [ageRange, setAgeRange] = useState<number[]>([18, 65]);
  const [lookingFor, setLookingFor] = useState<string>("Todos");

  const list = profiles.filter(
    (p) =>
      (filter === "Todos" || p.type === filter) &&
      (lookingFor === "Todos" || (p.lookingFor ?? []).includes(lookingFor as AccountType)) &&
      p.nick.toLowerCase().includes(q.toLowerCase()) &&
      p.distanceKm <= distance[0]! &&
      p.age >= ageRange[0]! &&
      p.age <= ageRange[1]!,
  );

  const activeFilters =
    (filter !== "Todos" ? 1 : 0) +
    (lookingFor !== "Todos" ? 1 : 0) +
    (distance[0]! < MAX_DISTANCE ? 1 : 0) +
    (ageRange[0]! > 18 || ageRange[1]! < 65 ? 1 : 0);

  return (
    <AppShell>
      <PageHeader title="Explorar" subtitle="Perfis verificados e eventos perto de você" />

      <Tabs defaultValue="perfis" className="px-4 md:px-0">
        <TabsList className="w-full bg-surface">
          <TabsTrigger value="perfis" className="flex-1">
            Perfis
          </TabsTrigger>
          <TabsTrigger value="eventos" className="flex-1">
            Eventos & Baladas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="perfis" className="mt-4 space-y-3">
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
              <DialogTrigger className="relative inline-flex shrink-0 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm text-muted-foreground hover:text-foreground">
                <SlidersHorizontal className="h-4 w-4" /> Filtros
                {activeFilters > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-gradient-primary px-1 text-[10px] font-semibold text-primary-foreground">
                    {activeFilters}
                  </span>
                )}
              </DialogTrigger>
              <DialogContent className="border-border bg-surface sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Filtrar busca</DialogTitle>
                  <DialogDescription>Refine por tipo de perfil, distância e idade.</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-2">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Busca por perfil</p>
                    <div className="flex flex-wrap gap-2">
                      {["Todos", ...accountTypes].map((t) => (
                        <button
                          key={t}
                          onClick={() => setFilter(t)}
                          className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                            filter === t
                              ? "border-transparent bg-gradient-primary text-primary-foreground"
                              : "border-border bg-surface-2 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
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
                  </div>

                  <button
                    onClick={() => {
                      setFilter("Todos");
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

          <div className="mt-1 grid grid-cols-2 gap-3 pb-6 md:grid-cols-3">
            {list.map((p) => (
              <Link
                key={p.id}
                to="/perfil/$id"
                params={{ id: p.id }}
                className={`block overflow-hidden rounded-2xl border bg-surface p-4 transition-colors hover:border-primary/50 ${
                  p.vip ? "border-gold/35" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between">
                  <AvatarOrb profile={p} size={48} />
                  {p.vip && <VipBadge />}
                </div>
                <p className="mt-3 truncate text-sm font-semibold">
                  {p.nick} <span className="text-muted-foreground">· {p.age}</span>
                </p>
                <TypeBadge type={p.type} className="mt-1.5" />
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{p.bio}</p>
                <p className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {p.city} · {p.distance}
                </p>
              </Link>
            ))}
            {list.length === 0 && (
              <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
                Nenhum perfil encontrado com esses filtros.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="eventos" className="mt-4">
          <button
            onClick={() => toast("Área de produtores — protótipo visual")}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface py-3 text-sm text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-4 w-4" /> Sou produtor — divulgar evento
          </button>

          <div className="grid gap-4 pb-6 md:grid-cols-2">
            {events.map((e) => (
              <EventCard key={e.id} id={e.id} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
