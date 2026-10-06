import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";

type UnreadConversation = { conversation_id: string; unread_count: number };
type UnreadResponse = { conversations?: UnreadConversation[]; total?: number; error?: string };

export function useUnreadMessages() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [unreadByConversation, setUnreadByConversation] = useState<Record<string, number>>({});
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const requestVersion = useRef(0);

  const refreshUnreadMessages = useCallback(async () => {
    const version = ++requestVersion.current;
    const response = await fetch("/api/chat/unread", { credentials: "same-origin" });
    const payload = await response.json() as UnreadResponse;
    if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar mensagens não lidas");
    if (version !== requestVersion.current) return;

    const counts = Object.fromEntries(
      (payload.conversations ?? []).map(({ conversation_id, unread_count }) => [conversation_id, unread_count]),
    );
    setUnreadByConversation(counts);
    setUnreadMessageCount(payload.total ?? 0);
  }, []);

  const markConversationRead = useCallback(async (conversationId: string) => {
    const response = await fetch("/api/chat/read", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conversation_id: conversationId }),
    });
    const payload = await response.json() as { error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Não foi possível marcar a conversa como lida");
    await refreshUnreadMessages();
    window.dispatchEvent(new Event("conexao-privada:messages-read"));
  }, [refreshUnreadMessages]);

  useEffect(() => {
    if (!userId) {
      requestVersion.current += 1;
      setUnreadByConversation({});
      setUnreadMessageCount(0);
      return;
    }
    let active = true;
    const refresh = () => {
      void refreshUnreadMessages().catch((error: unknown) => {
        if (active) console.error("Erro ao atualizar mensagens não lidas:", error);
      });
    };
    refresh();
    window.addEventListener("conexao-privada:messages-read", refresh);
    const interval = window.setInterval(refresh, 15_000);
    return () => {
      active = false;
      window.removeEventListener("conexao-privada:messages-read", refresh);
      window.clearInterval(interval);
    };
  }, [refreshUnreadMessages, userId]);

  return { unreadByConversation, unreadMessageCount, markConversationRead, refreshUnreadMessages };
}
