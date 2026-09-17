import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Tables } from "@/integrations/supabase/types";
import { rowToProfile, type ProfileRow } from "@/lib/profile-mapping";
import { clearPendingProfile, readPendingProfile } from "@/lib/pending-profile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type Profile = Tables<"profiles">;
export type Post = Tables<"posts"> & { profiles?: Profile };
export type AccountType = Profile["type"];
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
    changes: Partial<Pick<Profile, "nick" | "type" | "gender" | "orientation" | "birth_date" | "city" | "bio" | "looking_for" | "avatar">>,
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
  const [posts, setPosts] = useState<Post[]>([]);
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

  const loadData = useCallback(async () => {
    if (!user) {
      setDbProfiles([]);
      setPosts([]);
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
          latitude: pending.latitude ?? null,
          longitude: pending.longitude ?? null,
          looking_for: pending.lookingFor,
        });
      }
      clearPendingProfile();
    }

    // Busca perfis reais
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (profilesData) setDbProfiles((profilesData as ProfileRow[]).map(rowToProfile));

    // Busca posts reais relacionando os perfis
    const { data: postsData } = await supabase
      .from("posts")
      .select("*, profiles(*)")
      .order("created_at", { ascending: false });

    if (postsData) {
      setPosts(postsData as unknown as Post[]);
    }
  }, [user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const profiles = useMemo(() => {
    const dbIds = new Set(dbProfiles.map((p) => p.id));
    return [...dbProfiles, ...localProfiles.filter((p) => !dbIds.has(p.id))];
  }, [dbProfiles, localProfiles]);

  const currentId = user?.id || fallbackId;

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
            city: input.city.trim() || "",
            bio: input.bio.trim() || "",
            hue: input.hue,
            orientation: input.orientation ?? null,
            looking_for: input.lookingFor ?? [],
            vip: false,
            avatar: null,
            cover: null,
            birth_date: null,
            gender: null,
            created_at: new Date().toISOString(),
           } as Profile;
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
          orientation: input.orientation ?? null,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          looking_for: input.lookingFor ?? [],
        };
        const { data, error } = await supabase
          .from("profiles")
          .upsert(payload)
          .select("*")
          .single();
        if (error) throw error;
        const profile = rowToProfile(data as ProfileRow);
        setDbProfiles((list) => [profile, ...list.filter((p) => p.id !== profile.id)]);
        return profile.id;
      },
      createPost: ({ text, mediaType = "image", mediaUrl, authorId }) => {
        const message = text.trim();
        if (!message && !mediaUrl) return;

        const createdPost: Post = {
          id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          author_id: authorId ?? currentId ?? "",
          created_at: new Date().toISOString(),
          text: message,
          media: mediaType === "video" ? "video" : "foto",
          image: mediaUrl ?? null,
          likes: 0,
          comments: 0,
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
              ...(changes.birth_date !== undefined ? { birth_date: changes.birth_date || null } : {}),
              ...(changes.city !== undefined ? { city: changes.city } : {}),
              ...(changes.bio !== undefined ? { bio: changes.bio } : {}),
              ...(changes.looking_for !== undefined ? { looking_for: changes.looking_for } : {}),
              ...(changes.avatar !== undefined ? { avatar: changes.avatar } : {}),

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