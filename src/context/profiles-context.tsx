import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Tables } from "@/integrations/supabase/types";
import { rowToProfile, type ProfileRow } from "@/lib/profile-mapping";
import { clearPendingProfile, readPendingProfile } from "@/lib/pending-profile";
import { uploadAlbumPhotos } from "@/lib/album-storage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type Profile = Tables<"profiles">;
export type Post = Tables<"posts"> & { profiles?: Profile };
export type PostComment = Tables<"post_comments"> & { profile: Profile | undefined };
export type AccountType = Profile["type"];
export type NewProfileInput = {
  nick: string;
  username: string;
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
  createPost: (input: {
    text: string;
    mediaType?: "image" | "video" | undefined;
    mediaUrl?: string | undefined;
    wallProfileId?: string | undefined;
    album?: "public" | "private";
    mediaFile?: File | undefined;
  }) => Promise<boolean>;
  updatePost: (postId: string, text: string) => Promise<boolean>;
  deletePost: (postId: string) => Promise<boolean>;
  updatePrivateAlbum: (photos: string[]) => void;
  updateCurrentProfile: (
    changes: Partial<Pick<Profile, "nick" | "type" | "gender" | "orientation" | "birth_date" | "city" | "bio" | "looking_for" | "avatar">>,
  ) => void;
  blockedIds: string[];
  blockProfile: (id: string) => void;
  unblockProfile: (id: string) => void;
  isBlocked: (id: string) => boolean;
  isFollowing: (id: string) => boolean;
  toggleFollow: (id: string) => void;
  likePost: (postId: string) => Promise<void>;
  isPostLiked: (postId: string) => boolean;
  addComment: (postId: string, text: string) => Promise<void>;
  getPostLikes: (postId: string) => Promise<Profile[]>;
  getPostComments: (postId: string) => Promise<PostComment[]>;
};

const ProfilesContext = createContext<ProfilesContextValue | null>(null);

export function ProfilesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [dbProfiles, setDbProfiles] = useState<Profile[]>([]);
  const [localProfiles, setLocalProfiles] = useState<Profile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [fallbackId, setFallbackId] = useState<string | null>(null);
  const [following, setFollowing] = useState<Record<string, boolean>>({});
  const [blockedIds, setBlockedIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(BLOCKED_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((id: unknown): id is string => typeof id === "string")
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
      setLikedPostIds(new Set());
      return;
    }

    const pending = readPendingProfile();
    if (pending) {
      const { data: mine } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
      if (!mine) {
        await supabase.from("profiles").insert({
          id: user.id,
          nick: pending.nick,
          username: (pending.username || pending.nick).trim().replace(/^@/, "").replace(/\s+/g, "_").toLowerCase(),
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

    const { data: profilesData } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (profilesData) {
      setDbProfiles((profilesData as ProfileRow[]).map(rowToProfile) as unknown as Profile[]);
    }

    const { data: postsData } = await supabase
      .from("posts")
      .select("*, profiles!posts_author_id_fkey(*)")
      .order("created_at", { ascending: false });

    if (postsData) {
      const normalizedPosts = postsData as unknown as Post[];
      setPosts(normalizedPosts);
    }

    const { data: likesData } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", user.id);

    if (user) {
      const { data: followsData } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);
      if (followsData) {
        const followsRecord: Record<string, boolean> = {};
        followsData.forEach((row: { following_id: string }) => {
          followsRecord[row.following_id] = true;
        });
        setFollowing(followsRecord);
      }
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

  const notify = useCallback(
    async (targetId: string, type: string, body: string) => {
      if (!user || !targetId || targetId === user.id) return;
      await supabase.from("notifications").insert({
        user_id: targetId,
        actor_id: user.id,
        type,
        body,
      });
    },
    [user],
  );

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
            username: input.username.trim().toLowerCase(),
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
          username: input.username.trim().toLowerCase(),
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
        const profile = rowToProfile(data as ProfileRow) as unknown as Profile;
        setDbProfiles((list) => [profile, ...list.filter((p) => p.id !== profile.id)]);
        return profile.id;
      },
      createPost: async ({ text, mediaType = "image", mediaUrl, wallProfileId, album = "public", mediaFile }) => {
        const message = text.trim();
        if (!message && !mediaUrl && !mediaFile) return false;

        const targetAuthorId = currentId;
        if (!targetAuthorId) return false;

        let finalImage = mediaUrl ?? null;

        if (mediaFile) {
          const [path] = await uploadAlbumPhotos(targetAuthorId, album, [mediaFile]);
          if (!path) return false;

          if (album === "private") {
            const currentProfile = profiles.find((profile) => profile.id === targetAuthorId);
            const currentAlbum = currentProfile?.private_album ?? [];
            const nextAlbum = [...new Set([path, ...currentAlbum])];
            patchDbProfile(targetAuthorId, { private_album: nextAlbum });
            void supabase.from("profiles").update({ private_album: nextAlbum }).eq("id", targetAuthorId);
            return true;
          }

          finalImage = path;
        }

        if (!currentId) return false;

        const { data, error } = await supabase
          .from("posts")
          .insert({
            author_id: targetAuthorId,
            wall_profile_id: wallProfileId ?? null,
            text: message,
            media: mediaFile || mediaUrl ? (mediaType === "video" ? "video" : "foto") : null,
            image: finalImage ?? null,
          })
          .select("*, profiles!posts_author_id_fkey(*)")
          .single();

        if (error) {
          console.error("Erro ao salvar post:", error);
          return false;
        }

        if (data) {
          const nextPosts = [data as unknown as Post, ...posts];
          setPosts(nextPosts);
        }

        return true;
      },
      updatePost: async (postId, text) => {
        const message = text.trim();
        if (!message) return false;
        const authorId = currentId;
        if (!authorId) return false;

        const { data, error } = await supabase
          .from("posts")
          .update({ text: message })
          .eq("id", postId)
          .eq("author_id", authorId)
          .select("*, profiles!posts_author_id_fkey(*)")
          .single();

        if (error || !data) {
          console.error("Erro ao editar post:", error);
          return false;
        }

        setPosts((list) => list.map((post) => (post.id === postId ? (data as unknown as Post) : post)));
        return true;
      },
      deletePost: async (postId) => {
        const authorId = currentId;
        const post = posts.find((item) => item.id === postId);
        if (!authorId || !post || post.author_id !== authorId) return false;

        const { error } = await supabase
          .from("posts")
          .delete()
          .eq("id", postId)
          .eq("author_id", authorId);

        if (error) {
          console.error("Erro ao remover post:", error);
          return false;
        }

        const nextPosts = posts.filter((item) => item.id !== postId);
        setPosts(nextPosts);
        return true;
      },
      updatePrivateAlbum: (photos) => {
        if (user && currentId === user.id) {
          patchDbProfile(currentId, { private_album: photos });
          void supabase
            .from("profiles")
            .update({ private_album: photos })
            .eq("id", user.id)
            .then(({ error }) => {
              if (error) console.error("Erro ao salvar álbum:", error);
            });
          return;
        }
        setLocalProfiles((list) =>
          list.map((profile) =>
            profile.id === currentId
              ? { ...profile, private_album: photos }
              : profile,
          ),
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
      toggleFollow: async (id: string) => {
        const currentlyFollowing = !!following[id];
        setFollowing((f) => ({ ...f, [id]: !f[id] }));
        if (!user) return;
        if (currentlyFollowing) {
          await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", id);
        } else {
          await supabase.from("follows").insert({ follower_id: user.id, following_id: id });
        }
      },
      likePost: async (postId: string) => {
        const post = posts.find((p) => p.id === postId);
        if (!post || !user) return;
        const alreadyLiked = likedPostIds.has(postId);
        const interaction = alreadyLiked
          ? await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id)
          : await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
        if (interaction.error) return;
        const newLikes = Math.max(0, post.likes + (alreadyLiked ? -1 : 1));
        setLikedPostIds((ids) => {
          const next = new Set(ids);
          if (alreadyLiked) next.delete(postId);
          else next.add(postId);
          return next;
        });
        setPosts((list) => list.map((p) => (p.id === postId ? { ...p, likes: newLikes } : p)));

        if (!alreadyLiked && post.author_id !== user.id) {
          await notify(post.author_id, "like", "curtiu sua publicação");
        }
      },
      isPostLiked: (postId: string) => likedPostIds.has(postId),
      addComment: async (postId: string, text: string) => {
        const post = posts.find((p) => p.id === postId);
        const body = text.trim();
        if (!post || !body || !user) return;
        const { error: commentError } = await supabase
          .from("post_comments")
          .insert({ post_id: postId, user_id: user.id, body });
        if (commentError) return;
        const newComments = post.comments + 1;
        setPosts((list) => list.map((p) => (p.id === postId ? { ...p, comments: newComments } : p)));

        if (post.author_id !== user.id) {
          await notify(post.author_id, "comment", "comentou na sua publicação");
        }
      },
      getPostLikes: async (postId: string) => {
        const { data, error } = await supabase
          .from("post_likes")
          .select("user_id")
          .eq("post_id", postId);
        if (error) return [];

        const ids = new Set((data ?? []).map((like) => like.user_id));
        return profiles.filter((profile) => ids.has(profile.id));
      },
      getPostComments: async (postId: string) => {
        const { data, error } = await supabase
          .from("post_comments")
          .select("id, post_id, user_id, body, created_at")
          .eq("post_id", postId)
          .order("created_at", { ascending: true });
        if (error) return [];

        return (data ?? []).map((comment) => ({
          ...comment,
          profile: profiles.find((profile) => profile.id === comment.user_id),
        }));
      },
    };
  }, [profiles, posts, currentId, following, blockedIds, likedPostIds, user]);

  return <ProfilesContext.Provider value={value}>{children}</ProfilesContext.Provider>;
}

 export function useProfiles() {
  const ctx = useContext(ProfilesContext);
  if (!ctx) throw new Error("useProfiles precisa estar dentro de ProfilesProvider");
  return ctx;
}