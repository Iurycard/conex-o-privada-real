import {
  randomAvatar,
  randomCover,
  randomPrivateAlbum,
  randomPublicAlbum,
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
  birth_date: string | null;
  hue: number;
  avatar: string | null;
  cover: string | null;
  vip: boolean;
  looking_for: string[];
  public_album: string[];
  private_album: string[];
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
    type: row.type as AccountType,
    city: row.city || "Brasil",
    distance: "0 km",
    distanceKm: 0,
    age: ageFrom(row.birth_date),
    vip: row.vip,
    hue: row.hue,
    bio: row.bio || "Perfil recém-criado.",
    ...(row.gender ? { gender: row.gender } : {}),
    ...(row.birth_date ? { birthDate: row.birth_date } : {}),
    avatar: row.avatar ?? randomAvatar(),
    cover: row.cover ?? randomCover(),
    lookingFor: (row.looking_for ?? []) as AccountType[],
    publicAlbum: row.public_album?.length ? row.public_album : randomPublicAlbum(),
    privateAlbum: row.private_album?.length ? row.private_album : randomPrivateAlbum(),
  };
}
