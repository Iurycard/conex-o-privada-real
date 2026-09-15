import {
  type AccountType,
  type Profile,
} from "@/lib/mock-data";

export type ProfileRow = {
  id: string;
  nick: string;
  type: string;
  city: string;
  bio: string;
  gender: string | null;
  orientation?: string | null;
  birth_date: string | null;
  hue: number;
  avatar: string | null;
  cover: string | null;
  vip: boolean;
  looking_for: string[];
  public_album: string[];
  private_album: string[];
  latitude?: number | null;
  longitude?: number | null;
};

function ageFrom(birthDate: string | null): number {
  if (!birthDate) return 30;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return 30;
  const diff = Date.now() - birth.getTime();
  return Math.max(18, Math.floor(diff / (365.25 * 24 * 3600 * 1000)));
}

export function rowToProfile(row: ProfileRow): Profile {

  return {
    id: row.id,
    nick: row.nick,
    type: (row.type as AccountType) || "personal",
    distance: "0 km",
    distanceKm: 0,
    city: row.city || "",
    age: ageFrom(row.birth_date),
    vip: row.vip,
    hue: row.hue ?? 0,
    bio: row.bio || "Perfil recém-criado.",
    ...(row.gender ? { gender: row.gender } : {}),
    ...(row.orientation ? { orientation: row.orientation } : {}),
    ...(row.birth_date ? { birthDate: row.birth_date } : {}),
    ...(typeof row.latitude === "number" ? { latitude: row.latitude } : {}),
    ...(typeof row.longitude === "number" ? { longitude: row.longitude } : {}),
    avatar: row.avatar ?? "",
    cover: row.cover ?? "",
    lookingFor: (row.looking_for ?? []) as AccountType[],
    publicAlbum: row.public_album ?? [],
    privateAlbum: row.private_album ?? [],
  };
}
