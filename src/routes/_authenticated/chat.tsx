import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Image as ImageIcon, Lock, Send, SquarePen, Video, ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AvatarOrb, VipBadge } from "@/components/bits";
import { profileById, profiles as seedProfiles } from "@/lib/mock-data";
import { useVip } from "@/context/vip";
import { useProfiles } from "@/context/profiles-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "Chat — Conexão Privada" },
      { name: "description", content: "Conversas privadas com regras claras entre perfis Free e VIP." },
      { property: "og:title", content: "Chat — Conexão Privada" },
      { property: "og:description", content: "Mensagens privadas, anexos de foto e vídeo exclusivo para VIP." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatPage,
});

type ChatMessage = { from: "me" | "them"; text: string; time: string };
type ChatConversation = { id: string; profileId: string; last: string; time: string; unread: number };

const CHAT_STORAGE_KEY = "conexao-privada.chat-v1";

const seedConversations: ChatConversation[] = [
  { id: "c1", profileId: "p1", last: "Vocês vão no Noite Veludo sábado?", time: "12:40", unread: 2 },
  { id: "c2", profileId: "p8", last: "Curti demais o seu álbum público!", time: "11:02", unread: 0 },
  { id: "c3", profileId: "p3", last: "Liberamos o acesso pra vocês 😉", time: "ontem", unread: 0 },
  { id: "c4", profileId: "p7", last: "Bora combinar algo mais tranquilo?", time: "seg", unread: 1 },
];

const seedMessages: Record<string, ChatMessage[]> = {
  c1: [
    { from: "them", text: "Oi! Vimos que vocês curtiram nosso post.", time: "12:30" },
    { from: "me", text: "Oi! Curtimos sim, o lugar parece ótimo.", time: "12:34" },
    { from: "them", text: "Vocês vão no Noite Veludo sábado?", time: "12:40" },
  ],
  c2: [{ from: "them", text: "Curti demais o seu álbum público!", time: "11:02" }],
  c3: [
    { from: "me", text: "Podemos ver o álbum privado?", time: "ontem" },
    { from: "them", text: "Liberamos o acesso pra vocês 😉", time: "ontem" },
  ],
  c4: [{ from: "them", text: "Bora combinar algo mais tranquilo?", time: "seg" }],
};

function formatTime(date = new Date()) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ChatPage() {
  const { isVip, openVipModal } = useVip();
  const { profiles, currentId } = useProfiles();

  const [activeId, setActiveId] = useState<string | null>(seedConversations[0]?.id ?? null);
  const [draft, setDraft] = useState("");
  const [conversations, setConversations] = useState<ChatConversation[]>(() => {
    if (typeof window === "undefined") return seedConversations;
    try {
      const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
      if (!raw) return seedConversations;
      const parsed = JSON.parse(raw) as { conversations?: ChatConversation[] };
      return Array.isArray(parsed.conversations) && parsed.conversations.length > 0
        ? parsed.conversations
        : seedConversations;
    } catch {
      return seedConversations;
    }
  });
  const [messagesById, setMessagesById] = useState<Record<string, ChatMessage[]>>(() => {
    if (typeof window === "undefined") return seedMessages;
    try {
      const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
      if (!raw) return seedMessages;
      const parsed = JSON.parse(raw) as { messagesById?: Record<string, ChatMessage[]> };
      return parsed.messagesById && Object.keys(parsed.messagesById).length > 0 ? parsed.messagesById : seedMessages;
    } catch {
      return seedMessages;
    }
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({ conversations, messagesById }));
    }
  }, [conversations, messagesById]);

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const thread = active ? (messagesById[active.id] ?? []) : [];
  const partner = active ? profiles.find((p) => p.id === active.profileId) ?? profileById(active.profileId) : null;

  const handleSendMessage = () => {
    if (!draft.trim() || !active) return;

    const nextMessage: ChatMessage = { from: "me", text: draft.trim(), time: formatTime() };
    setMessagesById((prev) => ({
      ...prev,
      [active.id]: [...(prev[active.id] ?? []), nextMessage],
    }));

    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === active.id
          ? {
              ...conversation,
              last: nextMessage.text,
              time: nextMessage.time,
              unread: 0,
            }
          : conversation,
      ),
    );

    setDraft("");
    toast.success("Mensagem enviada");
  };

  const handleStartConversation = () => {
    if (!isVip) {
      openVipModal();
      return;
    }

    const availablePartner =
      profiles.find(
        (profile) => profile.id !== currentId && !conversations.some((conversation) => conversation.profileId === profile.id),
      ) ?? seedProfiles.find((profile) => profile.id !== currentId && !conversations.some((conversation) => conversation.profileId === profile.id));

    if (!availablePartner) {
      toast.info("Você já está em todas as conversas disponíveis.");
      return;
    }

    const id = `c${Date.now()}`;
    const welcomeMessage: ChatMessage = {
      from: "them",
      text: `Oi! Vi seu perfil e queria conversar.`,
      time: formatTime(),
    };

    setConversations((prev) => [
      {
        id,
        profileId: availablePartner.id,
        last: welcomeMessage.text,
        time: welcomeMessage.time,
        unread: 0,
      },
      ...prev,
    ]);

    setMessagesById((prev) => ({
      ...prev,
      [id]: [welcomeMessage],
    }));
    setActiveId(id);
    toast.success("Nova conversa iniciada");
  };

  return (
    <AppShell>
      <div className="grid h-[calc(100vh-8.5rem)] grid-cols-1 md:h-[calc(100vh-3.5rem)] md:grid-cols-[300px_minmax(0,1fr)]">
        <section
          className={`flex min-h-0 flex-col border-r border-border/60 ${active ? "hidden md:flex" : "flex md:flex"}`}
        >
          <div className="flex items-center justify-between px-4 py-4">
            <h1 className="text-lg font-semibold">Conversas</h1>
            <button
              onClick={handleStartConversation}
              className={`grid h-9 w-9 place-items-center rounded-full ${
                isVip ? "bg-gradient-primary text-primary-foreground" : "border border-gold/40 text-gold"
              }`}
              aria-label="Nova conversa"
            >
              {isVip ? <SquarePen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            </button>
          </div>

          {!isVip && (
            <button
              onClick={openVipModal}
              className="mx-4 mb-3 rounded-xl border border-gold/35 bg-gold/5 p-3 text-left text-[12px] leading-snug text-foreground/90"
            >
              <span className="font-semibold text-gold">Apenas VIPs podem iniciar chats.</span> Você pode
              responder mensagens recebidas de assinantes!
            </button>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {conversations.map((c) => {
              const p = profiles.find((profile) => profile.id === c.profileId) ?? profileById(c.profileId);
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={`flex w-full items-center gap-3 border-b border-border/50 px-4 py-3 text-left hover:bg-surface ${
                    activeId === c.id ? "bg-surface" : ""
                  }`}
                >
                  <AvatarOrb profile={p} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium">{p.nick}</p>
                      {p.vip && <VipBadge />}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{c.last}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] text-muted-foreground">{c.time}</span>
                    {c.unread > 0 && (
                      <span className="grid h-4 min-w-4 place-items-center rounded-full bg-gradient-primary px-1 text-[10px] text-primary-foreground">
                        {c.unread}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className={`flex min-h-0 flex-col ${active ? "flex md:flex" : "hidden md:flex"}`}>
          {active && partner ? (
            <>
              <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
                <button className="md:hidden" onClick={() => setActiveId(null)} aria-label="Voltar">
                  <ArrowLeft className="h-4.5 w-4.5 text-muted-foreground" />
                </button>
                <AvatarOrb profile={partner} size={36} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-semibold">{partner.nick}</p>
                    {partner.vip && <VipBadge />}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{partner.type}</p>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                {thread.map((m, i) => (
                  <div key={`${m.time}-${i}`} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm ${
                        m.from === "me"
                          ? "bg-gradient-primary text-primary-foreground"
                          : partner.vip
                            ? "border border-gold/30 bg-surface"
                            : "bg-surface"
                      }`}
                    >
                      {m.text}
                      <span className="mt-1 block text-[10px] opacity-60">{m.time}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border/60 p-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toast.success("Foto anexada")}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-surface text-muted-foreground"
                    aria-label="Enviar foto"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => (isVip ? toast.success("Vídeo anexado") : openVipModal())}
                    className={`inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-[11px] ${
                      isVip
                        ? "border border-border bg-surface text-muted-foreground"
                        : "border border-gold/40 text-gold"
                    }`}
                  >
                    {isVip ? <Video className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
                    {isVip ? "Vídeo" : "Vídeo (VIP)"}
                  </button>
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Escreva uma mensagem"
                    className="h-9 min-w-0 flex-1 rounded-full border border-border bg-surface px-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-primary text-primary-foreground"
                    aria-label="Enviar"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="hidden flex-1 place-items-center text-sm text-muted-foreground md:grid">
              Selecione uma conversa
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
