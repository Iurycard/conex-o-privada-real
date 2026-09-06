import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type FollowRow = { follower_id: string; following_id: string };
export type LikeRow = { liker_id: string; liked_id: string };
export type VisitRow = { visitor_id: string; profile_id: string; visited_at: string };
export type NotificationRow = {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: string;
  body: string;
  read: boolean;
  created_at: string;
};
export type AlbumRequestRow = {
  id: string;
  requester_id: string;
  owner_id: string;
  status: string;
  created_at: string;
};

type SocialContextValue = {
  ready: boolean;
  follows: FollowRow[];
  likes: LikeRow[];
  visits: VisitRow[];
  notifications: NotificationRow[];
  albumRequests: AlbumRequestRow[];
  isFollowing: (id: string) => boolean;
  followerCount: (id: string) => number;
  followingCount: (id: string) => number;
  followersOf: (id: string) => string[];
  followingOf: (id: string) => string[];
  toggleFollow: (id: string, nick: string) => Promise<void>;
  hasLiked: (id: string) => boolean;
  likeCount: (id: string) => number;
  toggleLike: (id: string, nick: string) => Promise<boolean>;
  registerVisit: (id: string) => Promise<void>;
  unreadCount: number;
  markNotificationsRead: () => Promise<void>;
  albumAccess: (ownerId: string) => "none" | "pending" | "approved" | "rejected";
  requestAlbumAccess: (ownerId: string, nick: string) => Promise<void>;
  respondAlbumRequest: (requestId: string, status: "approved" | "rejected") => Promise<void>;
  refresh: () => Promise<void>;
};

const SocialContext = createContext<SocialContextValue | null>(null);

export function SocialProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const [ready, setReady] = useState(false);
  const [follows, setFollows] = useState<FollowRow[]>([]);
  const [likes, setLikes] = useState<LikeRow[]>([]);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [albumRequests, setAlbumRequests] = useState<AlbumRequestRow[]>([]);

  const refresh = useCallback(async () => {
    if (!uid) {
      setFollows([]);
      setLikes([]);
      setVisits([]);
      setNotifications([]);
      setAlbumRequests([]);
      setReady(false);
      return;
    }
    const [f, l, v, n, r] = await Promise.all([
      supabase.from("follows").select("follower_id, following_id"),
      supabase.from("profile_likes").select("liker_id, liked_id"),
      supabase.from("profile_visits").select("visitor_id, profile_id, visited_at").order("visited_at", { ascending: false }),
      supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("album_access_requests").select("*").order("created_at", { ascending: false }),
    ]);
    setFollows((f.data ?? []) as FollowRow[]);
    setLikes((l.data ?? []) as LikeRow[]);
    setVisits((v.data ?? []) as VisitRow[]);
    setNotifications((n.data ?? []) as NotificationRow[]);
    setAlbumRequests((r.data ?? []) as AlbumRequestRow[]);
    setReady(true);
  }, [uid]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!uid) return;
    const channel = supabase
      .channel("social-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "album_access_requests" },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [uid, refresh]);

  const notify = useCallback(
    async (targetId: string, type: string, body: string) => {
      if (!uid || targetId === uid) return;
      await supabase.from("notifications").insert({ user_id: targetId, actor_id: uid, type, body });
    },
    [uid],
  );

  const value = useMemo<SocialContextValue>(() => {
    const isFollowing = (id: string) =>
      !!uid && follows.some((f) => f.follower_id === uid && f.following_id === id);
    const hasLiked = (id: string) => !!uid && likes.some((l) => l.liker_id === uid && l.liked_id === id);

    return {
      ready,
      follows,
      likes,
      visits,
      notifications,
      albumRequests,
      isFollowing,
      followerCount: (id) => follows.filter((f) => f.following_id === id).length,
      followingCount: (id) => follows.filter((f) => f.follower_id === id).length,
      followersOf: (id) => follows.filter((f) => f.following_id === id).map((f) => f.follower_id),
      followingOf: (id) => follows.filter((f) => f.follower_id === id).map((f) => f.following_id),
      toggleFollow: async (id, nick) => {
        if (!uid || id === uid) return;
        if (isFollowing(id)) {
          setFollows((list) => list.filter((f) => !(f.follower_id === uid && f.following_id === id)));
          await supabase.from("follows").delete().eq("follower_id", uid).eq("following_id", id);
          return;
        }
        setFollows((list) => [...list, { follower_id: uid, following_id: id }]);
        await supabase.from("follows").insert({ follower_id: uid, following_id: id });
        await notify(id, "follow", `começou a seguir você`);
        void nick;
      },
      hasLiked,
      likeCount: (id) => likes.filter((l) => l.liked_id === id).length,
      toggleLike: async (id, nick) => {
        if (!uid || id === uid) return false;
        if (hasLiked(id)) {
          setLikes((list) => list.filter((l) => !(l.liker_id === uid && l.liked_id === id)));
          await supabase.from("profile_likes").delete().eq("liker_id", uid).eq("liked_id", id);
          return false;
        }
        setLikes((list) => [...list, { liker_id: uid, liked_id: id }]);
        await supabase.from("profile_likes").insert({ liker_id: uid, liked_id: id });
        await notify(id, "like", "curtiu o seu perfil");
        void nick;
        return true;
      },
      registerVisit: async (id) => {
        if (!uid || id === uid) return;
        await supabase.from("profile_visits").insert({ visitor_id: uid, profile_id: id });
        void refresh();
      },
      unreadCount: notifications.filter((n) => !n.read).length,
      markNotificationsRead: async () => {
        if (!uid) return;
        setNotifications((list) => list.map((n) => ({ ...n, read: true })));
        await supabase.from("notifications").update({ read: true }).eq("user_id", uid).eq("read", false);
      },
      albumAccess: (ownerId) => {
        if (!uid) return "none";
        if (ownerId === uid) return "approved";
        const req = albumRequests.find((r) => r.requester_id === uid && r.owner_id === ownerId);
        return (req?.status as "pending" | "approved" | "rejected" | undefined) ?? "none";
      },
      requestAlbumAccess: async (ownerId, nick) => {
        if (!uid || ownerId === uid) return;
        const { data } = await supabase
          .from("album_access_requests")
          .insert({ requester_id: uid, owner_id: ownerId })
          .select("*")
          .single();
        if (data) setAlbumRequests((list) => [data as AlbumRequestRow, ...list]);
        await notify(ownerId, "album_request", "pediu acesso ao seu álbum privado");
        void nick;
      },
      respondAlbumRequest: async (requestId, status) => {
        const req = albumRequests.find((r) => r.id === requestId);
        setAlbumRequests((list) => list.map((r) => (r.id === requestId ? { ...r, status } : r)));
        await supabase.from("album_access_requests").update({ status }).eq("id", requestId);
        if (req) {
          await notify(
            req.requester_id,
            "album_response",
            status === "approved"
              ? "liberou o acesso ao álbum privado"
              : "recusou o acesso ao álbum privado",
          );
        }
      },
      refresh,
    };
  }, [ready, follows, likes, visits, notifications, albumRequests, uid, notify, refresh]);

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}

export function useSocial() {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error("useSocial precisa estar dentro de SocialProvider");
  return ctx;
}
