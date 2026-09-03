import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export const FREE_LIKE_LIMIT = 10;

type VipContextValue = {
  isVip: boolean;
  setVip: (v: boolean) => void;
  toggleVip: () => void;
  vipModalOpen: boolean;
  openVipModal: () => void;
  closeVipModal: () => void;
  /** Curtidas usadas hoje (só conta para perfis Free) */
  likesUsed: number;
  likesLeft: number;
  /** Registra uma curtida. Retorna false e abre o modal VIP quando o limite Free acabou. */
  registerLike: () => boolean;
};

const VipContext = createContext<VipContextValue | null>(null);

export function VipProvider({ children }: { children: ReactNode }) {
  const [isVip, setVip] = useState(false);
  const [vipModalOpen, setVipModalOpen] = useState(false);
  const [likesUsed, setLikesUsed] = useState(0);

  const value = useMemo<VipContextValue>(
    () => ({
      isVip,
      setVip,
      toggleVip: () => setVip((v) => !v),
      vipModalOpen,
      openVipModal: () => setVipModalOpen(true),
      closeVipModal: () => setVipModalOpen(false),
      likesUsed,
      likesLeft: isVip ? Infinity : Math.max(0, FREE_LIKE_LIMIT - likesUsed),
      registerLike: () => {
        if (isVip) return true;
        if (likesUsed >= FREE_LIKE_LIMIT) {
          setVipModalOpen(true);
          return false;
        }
        setLikesUsed((n) => n + 1);
        return true;
      },
    }),
    [isVip, vipModalOpen, likesUsed],
  );

  return <VipContext.Provider value={value}>{children}</VipContext.Provider>;
}

export function useVip() {
  const ctx = useContext(VipContext);
  if (!ctx) throw new Error("useVip precisa estar dentro de VipProvider");
  return ctx;
}
