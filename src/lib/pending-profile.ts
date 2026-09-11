import type { AccountType } from "@/lib/mock-data";

export type PendingProfile = {
  nick: string;
  type: AccountType;
  city: string;
  bio: string;
  hue: number;
  lookingFor: AccountType[];
  orientation?: string;
  latitude?: number;
  longitude?: number;
};

const KEY = "conexao-privada:perfil-pendente";

export function savePendingProfile(profile: PendingProfile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    /* armazenamento indisponível */
  }
}

export function readPendingProfile(): PendingProfile | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingProfile) : null;
  } catch {
    return null;
  }
}

export function clearPendingProfile() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* armazenamento indisponível */
  }
}
