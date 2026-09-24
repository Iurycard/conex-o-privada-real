import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, SendHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "Chat — Conexão Privada" },
      { name: "description", content: "Conversas privadas com regras claras entre perfis Free e VIP." },
    ],
  }),
  component: ChatPage,
});

type ChatMessage = {
  id: string;
  sender_id: string;
  receiver_id?: string;
  conversation_id?: string;
  content?: string;
  body?: string;
  created_at: string;
};

type ChatPartner = {
  id: string;
  nick: string;
  avatar: string | null;
};

function formatTime(isoString: string) {
  return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ChatPage() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [partners, setPartners] = useState<ChatPartner[]>([]);
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const { data: profiles } = await supabase.from("profiles").select("id, nick, avatar").neq("id", user.id);

      if (profiles && profiles.length > 0) {
        setPartners(profiles);
      }
    }

    void init();
  }, []);

  useEffect(() => {
    async function loadConversationAndMessages() {
      if (!currentUserId || !activePartnerId) return;

      let { data: conv } = await supabase
        .from("conversations")
        .select("id")
        .or(
          `and(user_a.eq.${currentUserId},user_b.eq.${activePartnerId}),and(user_a.eq.${activePartnerId},user_b.eq.${currentUserId})`,
        )
        .maybeSingle();

      if (!conv) {
        const { data: newConv } = await supabase
          .from("conversations")
          .insert([{ user_a: currentUserId, user_b: activePartnerId }])
          .select("id")
          .single();
        conv = newConv;
      }

      if (conv) {
        setActiveConversationId(conv.id);

        const { data: msgList } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: true });

        setMessages(msgList || []);
      }
    }

    void loadConversationAndMessages();
  }, [currentUserId, activePartnerId]);

  const handleSendMessage = async () => {
    if (!draft.trim() || !currentUserId || !activeConversationId) return;

    const text = draft.trim();
    setDraft("");

    const { data, error } = await supabase
      .from("messages")
      .insert([
        {
          sender_id: currentUserId,
          conversation_id: activeConversationId,
          body: text,
        },
      ])
      .select()
      .single();

    if (error) {
      toast.error("Erro ao enviar mensagem");
    } else if (data) {
      toast.success("Mensagem enviada");
      setMessages((prev) => [...prev, data as ChatMessage]);

      if (activePartnerId && activePartnerId !== currentUserId) {
        await supabase.from("notifications").insert({
          user_id: activePartnerId,
          actor_id: currentUserId,
          type: "message",
          body: "enviou uma mensagem",
        });
      }
    }
  };

  const partner = partners.find((p) => p.id === activePartnerId) ?? null;
  const activePreview = messages[messages.length - 1]?.body?.trim() || "Nenhuma mensagem ainda";
  const filteredPartners = partners.filter((p) =>
    p.nick.toLowerCase().includes(searchTerm.trim().toLowerCase()),
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4">
        <div className="overflow-hidden rounded-[28px] border border-border/70 bg-surface/80 shadow-[0_24px_80px_-36px_rgba(255,255,255,0.15)]">
          <div className="flex min-h-[calc(100vh-10rem)] flex-col lg:flex-row">
            <aside
              className={`${activePartnerId ? "hidden lg:block" : "block"} w-full border-b border-border/70 bg-gradient-to-b from-surface/70 to-background/40 lg:order-1 lg:w-[340px] lg:border-b-0 lg:border-r`}
            >
              <div className="flex items-center justify-between border-b border-border/70 px-4 py-3.5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Mensagens</p>
                  <h2 className="text-base font-semibold text-foreground">Conversas</h2>
                </div>
                <span className="rounded-full border border-border bg-background/70 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {filteredPartners.length}
                </span>
              </div>

              <div className="border-b border-border/70 px-3 py-2.5">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar conversa"
                  className="w-full rounded-full border border-border bg-background/70 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="max-h-[calc(100vh-15rem)] space-y-2 overflow-y-auto p-2.5">
                {filteredPartners.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-background/30 px-3 py-6 text-center text-sm text-muted-foreground">
                    Nenhum contato encontrado.
                  </div>
                ) : (
                  filteredPartners.map((p) => {
                    const isActive = p.id === activePartnerId;
                    const preview = isActive ? activePreview : "Clique para abrir";

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setActivePartnerId(p.id)}
                        className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all duration-200 ${
                          isActive
                            ? "border-primary/40 bg-primary/10 shadow-[0_0_0_1px_rgba(168,85,247,0.15)]"
                            : "border-transparent bg-transparent text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                        }`}
                      >
                        <div className="relative">
                          <Link
                            to="/perfil/$id"
                            params={{ id: p.id }}
                            className="block"
                            aria-label={`Ver perfil de ${p.nick}`}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <img
                              src={
                                p.avatar ||
                                "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='%239CA3AF'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-3.8-1.04-4.83-2.6.03-1.6 3.23-2.4 4.83-2.4s4.8 0.8 4.83 2.4c-1.03 1.56-2.8 2.6-4.83 2.6z'/></svg>"
                              }
                              alt={p.nick}
                              className="h-10 w-10 rounded-full border border-border object-cover bg-surface-2"
                            />
                          </Link>
                          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link
                            to="/perfil/$id"
                            params={{ id: p.id }}
                            className="block truncate text-sm font-medium text-foreground hover:underline"
                            aria-label={`Ver perfil de ${p.nick}`}
                            onClick={(event) => event.stopPropagation()}
                          >
                            {p.nick}
                          </Link>
                          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{preview}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            <main
              className={`${activePartnerId ? "flex" : "hidden lg:flex"} min-h-[380px] flex-1 flex-col lg:order-2`}
            >
              {partner ? (
                <>
                  <header className="flex items-center justify-between border-b border-border/70 bg-background/30 px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setActivePartnerId(null)}
                        className="grid h-9 w-9 place-items-center rounded-full hover:bg-surface-2 lg:hidden"
                        aria-label="Voltar para conversas"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      <Link
                        to="/perfil/$id"
                        params={{ id: partner.id }}
                        aria-label={`Ver perfil de ${partner.nick}`}
                        className="block"
                      >
                        <img
                          src={
                            partner.avatar ||
                            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='%239CA3AF'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-3.8-1.04-4.83-2.6.03-1.6 3.23-2.4 4.83-2.4s4.8 0.8 4.83 2.4c-1.03 1.56-2.8 2.6-4.83 2.6z'/></svg>"
                          }
                          alt={partner.nick}
                          className="h-10 w-10 rounded-full border border-border object-cover bg-surface-2"
                        />
                      </Link>
                      <div>
                        <Link
                          to="/perfil/$id"
                          params={{ id: partner.id }}
                          className="text-sm font-semibold text-foreground hover:underline"
                          aria-label={`Ver perfil de ${partner.nick}`}
                        >
                          {partner.nick}
                        </Link>
                        <p className="text-[11px] text-muted-foreground">Online agora</p>
                      </div>
                    </div>
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-emerald-300">
                      ao vivo
                    </span>
                  </header>

                  <div className="flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.16),_transparent_35%)] p-3 sm:p-4">
                    {messages.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        Ainda não há mensagens nesta conversa.
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isMe = msg.sender_id === currentUserId;
                        return (
                          <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-[80%] rounded-2xl border px-3 py-2.5 text-sm shadow-sm ${
                                isMe
                                  ? "border-primary/40 bg-gradient-to-br from-primary to-primary-glow text-primary-foreground"
                                  : "border-border/80 bg-surface-2 text-foreground"
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.body}</p>
                              <span className={`mt-1.5 block text-[10px] ${isMe ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                                {formatTime(msg.created_at)}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="border-b border-border/70 bg-surface/20 px-4 py-2 text-[11px] text-muted-foreground">
                    Preview da conversa: {activePreview}
                  </div>

                  <div className="border-t border-border/70 bg-surface/40 p-3 sm:p-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void handleSendMessage();
                          }
                        }}
                        placeholder="Digite sua mensagem..."
                        className="min-w-0 flex-1 rounded-full border border-border bg-background/70 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <button
                        type="button"
                        onClick={() => void handleSendMessage()}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-neon transition-transform duration-200 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label="Enviar mensagem"
                        disabled={!draft.trim()}
                      >
                        <SendHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
                  Selecione uma conversa
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </AppShell>
  );
}