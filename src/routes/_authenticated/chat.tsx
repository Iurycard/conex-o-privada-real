import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client"; // Ajuste o caminho do seu client
import { useVip } from "@/context/vip";
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
  const { isVip, openVipModal } = useVip();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [partners, setPartners] = useState<ChatPartner[]>([]);
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");

  // 1. Obter usuário logado e carregar lista de perfis/contatos
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // Carrega outros perfis para a lista lateral
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nick, avatar")
        .neq("id", user.id);

      if (profiles && profiles.length > 0) {
  setPartners(profiles);
  if (profiles[0]?.id) {
    setActivePartnerId(profiles[0].id);
  }
}
    init();
  }}, []);

  // 2. Buscar mensagens e escutar tempo real para a conversa ativa
  useEffect(() => {
    if (!currentUserId || !activePartnerId) return;

    // Carregar histórico da conversa ativa
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${activePartnerId}),and(sender_id.eq.${activePartnerId},receiver_id.eq.${currentUserId})`
        )
        .order("created_at", { ascending: true });

      if (!error && data) {
        setMessages(data);
      }
    };

    fetchMessages();

    // Inscrição em tempo real para novas mensagens recebidas/enviadas
    const channel = supabase
      .channel(`chat_${currentUserId}_${activePartnerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          const isCurrentConversation =
            (newMsg.sender_id === currentUserId && newMsg.receiver_id === activePartnerId) ||
            (newMsg.sender_id === activePartnerId && newMsg.receiver_id === currentUserId);

          if (isCurrentConversation) {
            setMessages((prev) => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, activePartnerId]);

  // 3. Enviar mensagem
 const handleSendMessage = async () => {
  if (!draft.trim() || !currentUserId || !activePartnerId) return;

  const text = draft.trim();
  setDraft("");

  const { error } = await supabase.from("messages").insert([
    {
      sender_id: currentUserId,
      receiver_id: activePartnerId,
      content: text,
    } as any,
  ]);

  if (error) {
    toast.error("Erro ao enviar mensagem");
  } else {
    toast.success("Mensagem enviada");
  }
};
const partner = partners.find((p) => p.id === activePartnerId) ?? null;

  return (
    <div className="flex h-screen">
      {/* Lista lateral de contatos */}
      <aside className="w-1/3 border-r p-4">
        <h2 className="font-bold text-lg mb-4">Conversas</h2>
        {partners.map((p) => (
          <div
            key={p.id}
            onClick={() => setActivePartnerId(p.id)}
            className={`p-3 rounded cursor-pointer flex items-center gap-3 ${
              p.id === activePartnerId ? "bg-slate-800 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <img src={p.avatar || "/placeholder.png"} className="w-10 h-10 rounded-full object-cover" />
            <span>{p.nick}</span>
          </div>
        ))}
      </aside>

      {/* Janela de Chat */}
      <main className="flex-1 flex flex-col p-4">
        {partner ? (
          <>
            <header className="border-b pb-2 mb-4 font-semibold">{partner.nick}</header>
            
            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
              {messages.map((msg) => {
                const isMe = msg.sender_id === currentUserId;
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`p-3 rounded-lg max-w-xs ${isMe ? "bg-blue-600 text-white" : "bg-gray-700 text-white"}`}>
                      <p>{msg.content}</p>
                      <span className="text-[10px] opacity-70 block text-right mt-1">{formatTime(msg.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Digite sua mensagem..."
                className="flex-1 border p-2 rounded"
              />
              <button onClick={handleSendMessage} className="bg-blue-600 text-white px-4 py-2 rounded">
                Enviar
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">Selecione uma conversa</div>
        )}
      </main>
    </div>
  );
}