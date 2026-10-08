import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { d1 } from "@/lib/d1-client"
import { useAuth } from "@/hooks/use-auth";

export const FREE_LIKE_LIMIT = 20;

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

type VipContextValue = {
  isVip: boolean;
  setVip: (v: boolean) => void;
  vipModalOpen: boolean;
  openVipModal: () => void;
  closeVipModal: () => void;
  likesUsedToday: number;
  tryUseLike: () => boolean;
};

const VipContext = createContext<VipContextValue | null>(null);

export function VipProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isVip, setVip] = useState(false);
  const [vipModalOpen, setVipModalOpen] = useState(false);
  const [likesUsedToday, setLikesUsedToday] = useState(0);
  const storageKey = `conexao-privada:likes:${user?.id ?? "guest"}:${todayKey()}`;

  useEffect(() => {
    let active = true;
    if (!user) {
      setVip(false);
      return () => {
        active = false;
      };
    }

    void d1
      .from("profiles")
      .select("vip")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (active && !error) setVip(Boolean((data as { vip?: boolean } | null)?.vip));
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    try {
      const stored = Number(window.localStorage.getItem(storageKey) ?? 0);
      setLikesUsedToday(Number.isFinite(stored) ? stored : 0);
    } catch {
      setLikesUsedToday(0);
    }
  }, [storageKey]);

  const value = useMemo<VipContextValue>(
    () => ({
      isVip,
      setVip,
      vipModalOpen,
      openVipModal: () => setVipModalOpen(true),
      closeVipModal: () => setVipModalOpen(false),
      likesUsedToday,
      tryUseLike: () => {
        if (isVip) return true;
        if (likesUsedToday >= FREE_LIKE_LIMIT) {
          setVipModalOpen(true);
          return false;
        }
        const nextCount = likesUsedToday + 1;
        setLikesUsedToday(nextCount);
        try {
          window.localStorage.setItem(storageKey, String(nextCount));
        } catch {
          // Keep the in-memory limit active when storage is unavailable.
        }
        return true;
      },
    }),
    [isVip, likesUsedToday, storageKey, vipModalOpen],
  );

  return <VipContext.Provider value={value}>{children}</VipContext.Provider>;
}

export function useVip() {
  const ctx = useContext(VipContext);
  if (!ctx) throw new Error("useVip precisa estar dentro de VipProvider");
  return ctx;
}
