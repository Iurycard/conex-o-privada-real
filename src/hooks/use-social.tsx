import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { d1 } from "@/lib/d1-client"
import { useAuth } from "@/hooks/use-auth";
import { useVip } from "@/context/vip";

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
  followCounts: Record<string, { followers: number; following: number }>;
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
  const { isVip } = useVip();
  const uid = user?.id ?? null;
  const [ready, setReady] = useState(false);
  const [follows, setFollows] = useState<FollowRow[]>([]);
  const [likes, setLikes] = useState<LikeRow[]>([]);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [albumRequests, setAlbumRequests] = useState<AlbumRequestRow[]>([]);
  const [followCounts, setFollowCounts] = useState<Record<string, { followers: number; following: number }>>({});

  const refresh = useCallback(async () => {
    if (!uid) {
      setFollows([]);
      setLikes([]);
      setVisits([]);
      setNotifications([]);
      setAlbumRequests([]);
      setFollowCounts({});
      setReady(false);
      return;
    }
    const [f, l, v, n, r, countsResponse] = await Promise.all([
      d1.from("follows").select("follower_id, following_id"),
      d1.from("profile_likes").select("liker_id, liked_id"),
      d1.from("profile_visits").select("visitor_id, profile_id, visited_at").order("visited_at", { ascending: false }),
      d1.from("notifications").select("*").order("created_at", { ascending: false }).limit(50),
      d1.from("album_access_requests").select("*").order("created_at", { ascending: false }),
      fetch("/api/social/follow-counts", { credentials: "same-origin" }),
    ]);
    const countsPayload = await countsResponse.json() as {
      counts?: { profile_id: string; followers: number; following: number }[];
      error?: string;
    };
    if (!countsResponse.ok) throw new Error(countsPayload.error ?? "Não foi possível carregar os totais de seguidores");
    setFollows((f.data ?? []) as FollowRow[]);
    setLikes((l.data ?? []) as LikeRow[]);
    setVisits((v.data ?? []) as VisitRow[]);
    setNotifications((n.data ?? []) as NotificationRow[]);
    setAlbumRequests((r.data ?? []) as AlbumRequestRow[]);
    setFollowCounts(Object.fromEntries((countsPayload.counts ?? []).map((row) => [
      row.profile_id,
      { followers: row.followers, following: row.following },
    ])));
    setReady(true);
  }, [uid, isVip]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!uid) return;
    const interval = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(interval);
  }, [uid, refresh]);

  const notify = useCallback(
    async (targetId: string, type: string, body: string) => {
      if (!uid || targetId === uid) return;
      await d1.from("notifications").insert({ user_id: targetId, actor_id: uid, type, body });
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
      followCounts,
      isFollowing,
      followerCount: (id) => followCounts[id]?.followers ?? 0,
      followingCount: (id) => followCounts[id]?.following ?? 0,
      followersOf: (id) => follows.filter((f) => f.following_id === id).map((f) => f.follower_id),
      followingOf: (id) => follows.filter((f) => f.follower_id === id).map((f) => f.following_id),
      toggleFollow: async (id, nick) => {
        if (!uid || id === uid) return;
        if (isFollowing(id)) {
          setFollows((list) => list.filter((f) => !(f.follower_id === uid && f.following_id === id)));
          setFollowCounts((counts) => ({
            ...counts,
            [id]: { ...counts[id], followers: Math.max(0, (counts[id]?.followers ?? 0) - 1) },
            [uid]: { ...counts[uid], following: Math.max(0, (counts[uid]?.following ?? 0) - 1) },
          }));
          await d1.from("follows").delete().eq("follower_id", uid).eq("following_id", id);
          return;
        }
        setFollows((list) => [...list, { follower_id: uid, following_id: id }]);
        setFollowCounts((counts) => ({
          ...counts,
          [id]: { ...counts[id], followers: (counts[id]?.followers ?? 0) + 1 },
          [uid]: { ...counts[uid], following: (counts[uid]?.following ?? 0) + 1 },
        }));
        await d1.from("follows").insert({ follower_id: uid, following_id: id });
        await notify(id, "follow", `começou a seguir você`);
        void nick;
      },
      hasLiked,
      likeCount: (id) => likes.filter((l) => l.liked_id === id).length,
      toggleLike: async (id, nick) => {
        if (!uid || id === uid) return false;
        if (hasLiked(id)) {
          setLikes((list) => list.filter((l) => !(l.liker_id === uid && l.liked_id === id)));
          await d1.from("profile_likes").delete().eq("liker_id", uid).eq("liked_id", id);
          return false;
        }
        setLikes((list) => [...list, { liker_id: uid, liked_id: id }]);
        await d1.from("profile_likes").insert({ liker_id: uid, liked_id: id });
        await notify(id, "like", "curtiu o seu perfil");
        void nick;
        return true;
      },
      registerVisit: async (id) => {
        if (!uid || id === uid) return;
        await d1
          .from("profile_visits")
          .upsert({ visitor_id: uid, profile_id: id }, { onConflict: "visitor_id,profile_id", ignoreDuplicates: true });
        await notify(id, "visit", "visitou seu perfil");
        void refresh();
      },
      unreadCount: notifications.filter((n) => !n.read).length,
      markNotificationsRead: async () => {
        if (!uid) return;
        setNotifications((list) => list.map((n) => ({ ...n, read: true })));
        await d1.from("notifications").update({ read: true }).eq("user_id", uid).eq("read", false);
      },
      albumAccess: (ownerId) => {
        if (!uid) return "none";
        if (ownerId === uid) return "approved";
        const req = albumRequests.find((r) => r.requester_id === uid && r.owner_id === ownerId);
        return (req?.status as "pending" | "approved" | "rejected" | undefined) ?? "none";
      },
      requestAlbumAccess: async (ownerId, nick) => {
        if (!uid || ownerId === uid) return;
        const { data } = await d1
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
        await d1.from("album_access_requests").update({ status }).eq("id", requestId);
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
  }, [ready, follows, likes, visits, notifications, albumRequests, followCounts, uid, notify, refresh]);

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}

export function useSocial() {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error("useSocial precisa estar dentro de SocialProvider");
  return ctx;
}
