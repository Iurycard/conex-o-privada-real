import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";

export const FREE_LIKE_LIMIT = 20;

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

type VipContextValue = {
  isVip: boolean;
  refreshVip: () => Promise<boolean>;
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

  const refreshVip = useCallback(async () => {
    if (!user?.id) {
      setVip(false);
      return false;
    }
    try {
      const response = await fetch("/api/vip/status", { credentials: "same-origin" });
      const payload = await response.json() as { isVip?: boolean; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível consultar o status VIP");
      setVip(payload.isVip === true);
      return payload.isVip === true;
    } catch (error) {
      console.error("Erro ao consultar o status VIP:", error);
      throw error;
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setVip(false);
      return;
    }
    void refreshVip().catch(() => {});
  }, [user?.id, refreshVip]);

  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("vip_payment") !== "1") return;

    let active = true;
    const checkPayment = async () => {
      try {
        if (await refreshVip()) {
          url.searchParams.delete("vip_payment");
          window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
          return false;
        }
      } catch {
        // Keep checking until Mercado Pago finishes notifying the Worker.
      }
      return true;
    };

    let timer: number;
    void checkPayment().then((shouldContinue) => {
      if (active && shouldContinue) {
        timer = window.setInterval(() => {
          void checkPayment().then((keepChecking) => {
            if (!keepChecking) window.clearInterval(timer);
          });
        }, 5000);
      }
    });
    return () => {
      active = false;
      if (timer !== undefined) window.clearInterval(timer);
    };
  }, [user?.id, refreshVip]);

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
      refreshVip,
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
    [isVip, likesUsedToday, storageKey, vipModalOpen, refreshVip],
  );

  return <VipContext.Provider value={value}>{children}</VipContext.Provider>;
}

export function useVip() {
  const ctx = useContext(VipContext);
  if (!ctx) throw new Error("useVip precisa estar dentro de VipProvider");
  return ctx;
}
