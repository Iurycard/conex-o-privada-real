import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export const FREE_LIKE_LIMIT = 10;

type VipContextValue = {
  isVip: boolean;
  setVip: (v: boolean) => void;
  toggleVip: () => void;
  vipModalOpen: boolean;
  openVipModal: () => void;
  closeVipModal: () => void;
<<<<<<< HEAD:conex-o-privada-real-main/src/context/vip.tsx
  likesUsedToday: number;
  tryUseLike: () => boolean;
=======
  /** Curtidas usadas hoje (só conta para perfis Free) */
  likesUsed: number;
  likesLeft: number;
  /** Registra uma curtida. Retorna false e abre o modal VIP quando o limite Free acabou. */
  registerLike: () => boolean;
>>>>>>> 67c96239e64206001a38f86f51916abb4f68a57d:src/context/vip.tsx
};

const VipContext = createContext<VipContextValue | null>(null);

export function VipProvider({ children }: { children: ReactNode }) {
  const [isVip, setVip] = useState(false);
  const [vipModalOpen, setVipModalOpen] = useState(false);
<<<<<<< HEAD:conex-o-privada-real-main/src/context/vip.tsx
  const [likesUsedToday, setLikesUsedToday] = useState(0);
=======
  const [likesUsed, setLikesUsed] = useState(0);
>>>>>>> 67c96239e64206001a38f86f51916abb4f68a57d:src/context/vip.tsx

  const value = useMemo<VipContextValue>(
    () => ({
      isVip,
      setVip,
      toggleVip: () => setVip((v) => !v),
      vipModalOpen,
      openVipModal: () => setVipModalOpen(true),
      closeVipModal: () => setVipModalOpen(false),
<<<<<<< HEAD:conex-o-privada-real-main/src/context/vip.tsx
      likesUsedToday,
      tryUseLike: () => {
        if (isVip) return true;
        if (likesUsedToday >= 20) {
          setVipModalOpen(true);
          return false;
        }
        setLikesUsedToday((count) => count + 1);
        return true;
      },
    }),
    [isVip, likesUsedToday, vipModalOpen],
=======
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
>>>>>>> 67c96239e64206001a38f86f51916abb4f68a57d:src/context/vip.tsx
  );

  return <VipContext.Provider value={value}>{children}</VipContext.Provider>;
}

export function useVip() {
  const ctx = useContext(VipContext);
  if (!ctx) throw new Error("useVip precisa estar dentro de VipProvider");
  return ctx;
}
