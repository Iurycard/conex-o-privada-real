import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  posts as seedPosts,
  profiles as seedProfiles,
  randomAvatar,
  randomCover,
  randomPostImage,
  randomPrivateAlbum,
  randomPublicAlbum,
  type AccountType,
  type Post,
  type Profile,
} from "@/lib/mock-data";
import { rowToProfile, type ProfileRow } from "@/lib/profile-mapping";
import { clearPendingProfile, readPendingProfile } from "@/lib/pending-profile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type NewProfileInput = {
  nick: string;
  type: AccountType;
  city: string;
  bio: string;
  hue: number;
  lookingFor?: AccountType[];
  orientation?: string | undefined;
  latitude?: number | null;
  longitude?: number | null;
};

const BLOCKED_STORAGE_KEY = "conexao-privada.blockedIds";
const POSTS_STORAGE_KEY = "conexao-privada.posts";

type ProfilesContextValue = {
  profiles: Profile[];
  posts: Post[];
  currentId: string | null;
  current: Profile | null;
  setCurrentId: (id: string) => void;
  getProfile: (id: string) => Profile | undefined;
  addProfile: (input: NewProfileInput) => Promise<string>;
  createPost: (input: { text: string; mediaType?: "image" | "video"; mediaUrl?: string; authorId?: string }) => void;
  updateCurrentAlbums: (album: "public" | "private", photos: string[]) => void;
  updateCurrentProfile: (
    changes: Partial<Pick<Profile, "nick" | "type" | "gender" | "orientation" | "birthDate" | "city" | "bio" | "lookingFor" | "avatar" | "latitude" | "longitude">>,
  ) => void;
  blockedIds: string[];
  blockProfile: (id: string) => void;
  unblockProfile: (id: string) => void;
  isBlocked: (id: string) => boolean;
  isFollowing: (id: string) => boolean;
  toggleFollow: (id: string) => void;
};

const ProfilesContext = createContext<ProfilesContextValue | null>(null);

export function ProfilesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [dbProfiles, setDbProfiles] = useState<Profile[]>([]);
  const [localProfiles, setLocalProfiles] = useState<Profile[]>([]);
  const [posts, setPosts] = useState<Post[]>(() => {
    if (typeof window === "undefined") return seedPosts;

    try {
      const raw = window.localStorage.getItem(POSTS_STORAGE_KEY);
      if (!raw) return seedPosts;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : seedPosts;
    } catch {
      return seedPosts;
    }
  });
  const [fallbackId, setFallbackId] = useState<string | null>(null);
  const [following, setFollowing] = useState<Record<string, boolean>>({});
  const [blockedIds, setBlockedIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];

    try {
      const raw = window.localStorage.getItem(BLOCKED_STORAGE_KEY);
      if (!raw) return [];

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((id): id is string => typeof id === "string")
        : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(BLOCKED_STORAGE_KEY, JSON.stringify(blockedIds));
    }
  }, [blockedIds]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts));
    }
  }, [posts]);

  const loadProfiles = useCallback(async () => {
    if (!user) {
      setDbProfiles([]);
      return;
    }

    const pending = readPendingProfile();
    if (pending) {
      const { data: mine } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
      if (!mine) {
        await supabase.from("profiles").insert({
          id: user.id,
          nick: pending.nick,
          type: pending.type,
          city: pending.city,
          bio: pending.bio,
          hue: pending.hue,
          orientation: pending.orientation ?? null,
          avatar: randomAvatar(),
          cover: randomCover(),
          latitude: pending.latitude ?? null,
          longitude: pending.longitude ?? null,
          looking_for: pending.lookingFor,
          public_album: randomPublicAlbum(),
          private_album: randomPrivateAlbum(),
        });
      }
      clearPendingProfile();
    }

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setDbProfiles((data as ProfileRow[]).map(rowToProfile));
  }, [user]);

  useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  const profiles = useMemo(() => {
    const dbIds = new Set(dbProfiles.map((p) => p.id));
    return [...dbProfiles, ...localProfiles.filter((p) => !dbIds.has(p.id))];
  }, [dbProfiles, localProfiles]);

  const currentId = user?.id || fallbackId;
  const current = profiles.find((p) => p.id === currentId) || null;

  const value = useMemo<ProfilesContextValue>(() => {
    const getProfile = (id: string) => profiles.find((p) => p.id === id);

    const patchDbProfile = (id: string, changes: Partial<Profile>) =>
      setDbProfiles((list) => list.map((p) => (p.id === id ? { ...p, ...changes } : p)));

    return {
      profiles,
      posts,
      currentId,
      current: currentId ? (getProfile(currentId) ?? null) : null,
      setCurrentId: setFallbackId,
      getProfile,
      addProfile: async (input) => {
        if (!user) {
          const id = `u${Date.now().toString(36)}`;
          const profile: Profile = {
            id,
            nick: input.nick.trim(),
            type: input.type,
            city: input.city.trim() || "São Paulo, SP",
            distance: "0 km",
            distanceKm: 0,
            age: 30,
            vip: false,
            avatar: randomAvatar(),
            cover: randomCover(),
            hue: input.hue,
            bio: input.bio.trim() || "Perfil recém-criado.",
            orientation: input.orientation,
            lookingFor: input.lookingFor ?? [],
            publicAlbum: randomPublicAlbum(),
            privateAlbum: randomPrivateAlbum(),
          };
          setLocalProfiles((list) => [profile, ...list]);
          setFallbackId(id);
          return id;
        }

        const payload = {
          id: user.id,
          nick: input.nick.trim(),
          type: input.type,
          city: input.city.trim(),
          bio: input.bio.trim(),
          hue: input.hue,
          avatar: randomAvatar(),
          cover: randomCover(),
          orientation: input.orientation ?? null,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          looking_for: input.lookingFor ?? [],
          public_album: randomPublicAlbum(),
          private_album: randomPrivateAlbum(),
        };
        const { data, error } = await supabase
          .from("profiles")
          .upsert(payload)
          .select("*")
          .single();
        if (error) throw error;
        const profile = rowToProfile(data as ProfileRow);
        setDbProfiles((list) => [profile, ...list.filter((p) => p.id !== profile.id)]);
        setPosts((list) => [
          {
            id: `post-${profile.id}`,
            authorId: profile.id,
            time: "agora",
            text: `${profile.nick} acabou de entrar na comunidade. Diga oi!`,
            likes: 0,
            comments: 0,
            media: "foto",
          },
          ...list,
        ]);
        return profile.id;
      },
      createPost: ({ text, mediaType = "image", mediaUrl, authorId }) => {
        const message = text.trim();
        if (!message && !mediaUrl) return;

        const createdPost: Post = {
          id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          authorId: authorId ?? currentId ?? "",
          time: "agora",
          text: message || "Nova publicação",
          likes: 0,
          comments: 0,
          media: mediaType === "video" ? "video" : "foto",
          image: mediaUrl ?? randomPostImage(),
        };

        setPosts((list) => [createdPost, ...list]);
      },
      updateCurrentAlbums: (album, photos) => {
        const key = album === "public" ? "publicAlbum" : "privateAlbum";
        if (user && currentId === user.id) {
          patchDbProfile(currentId, { [key]: photos } as Partial<Profile>);
          void supabase
            .from("profiles")
            .update(album === "public" ? { public_album: photos } : { private_album: photos })
            .eq("id", user.id);
          return;
        }
        setLocalProfiles((list) =>
          list.map((profile) => (profile.id === currentId ? { ...profile, [key]: photos } : profile)),
        );
      },
      updateCurrentProfile: (changes) => {
        if (user && currentId === user.id) {
          patchDbProfile(currentId, changes);
          void supabase
            .from("profiles")
            .update({
              ...(changes.nick !== undefined ? { nick: changes.nick } : {}),
              ...(changes.type !== undefined ? { type: changes.type } : {}),
              ...(changes.gender !== undefined ? { gender: changes.gender } : {}),
              ...(changes.orientation !== undefined ? { orientation: changes.orientation ?? null } : {}),
              ...(changes.birthDate !== undefined ? { birth_date: changes.birthDate || null } : {}),
              ...(changes.city !== undefined ? { city: changes.city } : {}),
              ...(changes.bio !== undefined ? { bio: changes.bio } : {}),
              ...(changes.lookingFor !== undefined ? { looking_for: changes.lookingFor } : {}),
              ...(changes.avatar !== undefined ? { avatar: changes.avatar } : {}),
              ...(changes.latitude !== undefined ? { latitude: changes.latitude ?? null } : {}),
              ...(changes.longitude !== undefined ? { longitude: changes.longitude ?? null } : {}),
            })
            .eq("id", user.id);
          return;
        }
        setLocalProfiles((list) =>
          list.map((profile) => (profile.id === currentId ? { ...profile, ...changes } : profile)),
        );
      },
      blockedIds,
      blockProfile: (id) => setBlockedIds((ids) => (ids.includes(id) ? ids : [...ids, id])),
      unblockProfile: (id) => setBlockedIds((ids) => ids.filter((blockedId) => blockedId !== id)),
      isBlocked: (id: string) => blockedIds.includes(id),
      isFollowing: (id: string) => !!following[id],
      toggleFollow: (id: string) => setFollowing((f) => ({ ...f, [id]: !f[id] })),
    };
  }, [profiles, posts, currentId, following, blockedIds, user]);

  return <ProfilesContext.Provider value={value}>{children}</ProfilesContext.Provider>;
}

export function useProfiles() {
  const ctx = useContext(ProfilesContext);
  if (!ctx) throw new Error("useProfiles precisa estar dentro de ProfilesProvider");
  return ctx;
}
