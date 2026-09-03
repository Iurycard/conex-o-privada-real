import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  posts as seedPosts,
  profiles as seedProfiles,
  randomAvatar,
  randomCover,
  randomPostImage,
  randomPublicAlbum,
  randomPrivateAlbum,
  type AccountType,
  type Post,
  type Profile,
} from "@/lib/mock-data";

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
  addProfile: (input: NewProfileInput) => string;
  isFollowing: (id: string) => boolean;
  toggleFollow: (id: string) => void;
};

const ProfilesContext = createContext<ProfilesContextValue | null>(null);

export function ProfilesProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>(seedProfiles);
  const [posts, setPosts] = useState<Post[]>(seedPosts);
  const [currentId, setCurrentId] = useState<string>(seedProfiles[0]!.id);
  const [following, setFollowing] = useState<Record<string, boolean>>({});

  const value = useMemo<ProfilesContextValue>(() => {
    const getProfile = (id: string) => profiles.find((p) => p.id === id);

    return {
      profiles,
      posts,
      currentId,
      current: getProfile(currentId) ?? profiles[0]!,
      setCurrentId,
      getProfile,
      addProfile: (input) => {
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
          bio: input.bio.trim() || "Perfil recém-criado neste protótipo.",
          lookingFor: input.lookingFor ?? [],
          publicAlbum: randomPublicAlbum(),
          privateAlbum: randomPrivateAlbum(),
        };
        setProfiles((list) => [profile, ...list]);
        setPosts((list) => [
          {
            id: `post-${id}`,
            authorId: id,
            time: "agora",
            text: `${profile.nick} acabou de entrar na comunidade. Diga oi!`,
            likes: 0,
            comments: 0,
            media: "foto",
            image: randomPostImage(),
          },
          ...list,
        ]);
        setCurrentId(id);
        return id;
      },
      isFollowing: (id: string) => !!following[id],
      toggleFollow: (id: string) => setFollowing((f) => ({ ...f, [id]: !f[id] })),
    };
  }, [profiles, posts, currentId, following]);

  return <ProfilesContext.Provider value={value}>{children}</ProfilesContext.Provider>;
}

export function useProfiles() {
  const ctx = useContext(ProfilesContext);
  if (!ctx) throw new Error("useProfiles precisa estar dentro de ProfilesProvider");
  return ctx;
}
