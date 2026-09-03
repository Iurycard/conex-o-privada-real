import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type VipContextValue = {
  isVip: boolean;
  setVip: (v: boolean) => void;
  toggleVip: () => void;
  vipModalOpen: boolean;
  openVipModal: () => void;
  closeVipModal: () => void;
  likesUsedToday: number;
  tryUseLike: () => boolean;
};

const VipContext = createContext<VipContextValue | null>(null);

export function VipProvider({ children }: { children: ReactNode }) {
  const [isVip, setVip] = useState(false);
  const [vipModalOpen, setVipModalOpen] = useState(false);
  const [likesUsedToday, setLikesUsedToday] = useState(0);

  const value = useMemo<VipContextValue>(
    () => ({
      isVip,
      setVip,
      toggleVip: () => setVip((v) => !v),
      vipModalOpen,
      openVipModal: () => setVipModalOpen(true),
      closeVipModal: () => setVipModalOpen(false),
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
  );

  return <VipContext.Provider value={value}>{children}</VipContext.Provider>;
}

export function useVip() {
  const ctx = useContext(VipContext);
  if (!ctx) throw new Error("useVip precisa estar dentro de VipProvider");
  return ctx;
}
