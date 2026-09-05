import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  posts as seedPosts,
  profiles as seedProfiles,
  randomAvatar,
  randomCover,
  randomPrivateAlbum,
  randomPublicAlbum,
  type AccountType,
  type Post,
  type Profile,
} from "@/lib/mock-data";
import { rowToProfile, type ProfileRow } from "@/lib/profile-mapping";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type NewProfileInput = {
  nick: string;
  type: AccountType;
  city: string;
  bio: string;
  hue: number;
  lookingFor?: AccountType[];
};

type ProfilesContextValue = {
  profiles: Profile[];
  posts: Post[];
  currentId: string;
  current: Profile;
  setCurrentId: (id: string) => void;
  getProfile: (id: string) => Profile | undefined;
  addProfile: (input: NewProfileInput) => Promise<string>;
  updateCurrentAlbums: (album: "public" | "private", photos: string[]) => void;
  updateCurrentProfile: (
    changes: Partial<Pick<Profile, "nick" | "type" | "gender" | "birthDate" | "city" | "bio" | "lookingFor" | "avatar">>,
  ) => void;
  blockedIds: string[];
  blockProfile: (id: string) => void;
  unblockProfile: (id: string) => void;
  isFollowing: (id: string) => boolean;
  toggleFollow: (id: string) => void;
};

const ProfilesContext = createContext<ProfilesContextValue | null>(null);

export function ProfilesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [dbProfiles, setDbProfiles] = useState<Profile[]>([]);
  const [localProfiles, setLocalProfiles] = useState<Profile[]>(seedProfiles);
  const [posts, setPosts] = useState<Post[]>(seedPosts);
  const [fallbackId, setFallbackId] = useState<string>(seedProfiles[0]!.id);
  const [following, setFollowing] = useState<Record<string, boolean>>({});
  const [blockedIds, setBlockedIds] = useState<string[]>([]);

  const loadProfiles = useCallback(async () => {
    if (!user) {
      setDbProfiles([]);
      return;
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

  const currentId = user && dbProfiles.some((p) => p.id === user.id) ? user.id : fallbackId;

  const value = useMemo<ProfilesContextValue>(() => {
    const getProfile = (id: string) => profiles.find((p) => p.id === id);

    const patchDbProfile = (id: string, changes: Partial<Profile>) =>
      setDbProfiles((list) => list.map((p) => (p.id === id ? { ...p, ...changes } : p)));

    return {
      profiles,
      posts,
      currentId,
      current: getProfile(currentId) ?? profiles[0]!,
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
      updateCurrentAlbums: (album, photos) => {
        const key = album === "public" ? "publicAlbum" : "privateAlbum";
        if (user && currentId === user.id) {
          patchDbProfile(currentId, { [key]: photos } as Partial<Profile>);
          void supabase
            .from("profiles")
            .update({ [album === "public" ? "public_album" : "private_album"]: photos })
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
              ...(changes.birthDate !== undefined ? { birth_date: changes.birthDate || null } : {}),
              ...(changes.city !== undefined ? { city: changes.city } : {}),
              ...(changes.bio !== undefined ? { bio: changes.bio } : {}),
              ...(changes.lookingFor !== undefined ? { looking_for: changes.lookingFor } : {}),
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
