import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type VipContextValue = {
  isVip: boolean;
  setVip: (v: boolean) => void;
  toggleVip: () => void;
  vipModalOpen: boolean;
  openVipModal: () => void;
  closeVipModal: () => void;
};

const VipContext = createContext<VipContextValue | null>(null);

export function VipProvider({ children }: { children: ReactNode }) {
  const [isVip, setVip] = useState(false);
  const [vipModalOpen, setVipModalOpen] = useState(false);

  const value = useMemo<VipContextValue>(
    () => ({
      isVip,
      setVip,
      toggleVip: () => setVip((v) => !v),
      vipModalOpen,
      openVipModal: () => setVipModalOpen(true),
      closeVipModal: () => setVipModalOpen(false),
    }),
    [isVip, vipModalOpen],
  );

  return <VipContext.Provider value={value}>{children}</VipContext.Provider>;
}

export function useVip() {
  const ctx = useContext(VipContext);
  if (!ctx) throw new Error("useVip precisa estar dentro de VipProvider");
  return ctx;
}
