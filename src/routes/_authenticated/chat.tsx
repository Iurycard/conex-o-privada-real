import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, ImagePlus, Lock, SendHorizontal } from "lucide-react";
import { d1 } from "@/lib/d1-client"
import { AppShell } from "@/components/app-shell";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useVip } from "@/context/vip";
import { useAlbumUrls } from "@/lib/album-storage";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useUnreadMessages } from "@/hooks/use-unread-messages";

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
  attachments?: ChatAttachment[];
};

type ChatAttachment = {
  id: string;
  message_id: string;
  storage_path: string;
  created_at: string;
};

type ChatPartner = {
  id: string;
  nick: string;
  avatar: string | null;
};

function PrivatePhotoOption({
  path,
  selected,
  onSelect,
}: {
  path: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const [url] = useAlbumUrls([path]);

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`relative aspect-square overflow-hidden rounded-lg border text-left ${selected ? "border-primary ring-2 ring-primary/50" : "border-border"}`}
    >
      {url ? (
        <img src={url} alt="Foto privada do álbum" className="h-full w-full object-cover" />
      ) : (
        <span className="grid h-full w-full place-items-center bg-surface-2 text-xs text-muted-foreground">Carregando...</span>
      )}
      {selected && (
        <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-4 w-4" />
        </span>
      )}
    </button>
  );
}

function PrivatePhotoMessage({ path }: { path: string }) {
  const [url] = useAlbumUrls([path]);

  return url ? (
    <img src={url} alt="Foto privada compartilhada" className="mt-2 max-h-72 max-w-full rounded-xl object-cover" />
  ) : (
    <p className="mt-2 text-xs opacity-75">Foto privada indisponível.</p>
  );
}

function messagePreview(message: ChatMessage, currentUserId: string) {
  const sender = message.sender_id === currentUserId ? "Você: " : "";
  return `${sender}${message.body?.trim() || message.content?.trim() || "Mensagem"}`;
}

function formatTime(isoString: string) {
  return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ChatPage() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [partners, setPartners] = useState<ChatPartner[]>([]);
  const [conversationPartnerIds, setConversationPartnerIds] = useState<string[]>([]);
  const [conversationIdsByPartner, setConversationIdsByPartner] = useState<Record<string, string>>({});
  const [conversationPreviews, setConversationPreviews] = useState<Record<string, string>>({});
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [selectedPrivatePhotos, setSelectedPrivatePhotos] = useState<string[]>([]);
  const [privatePhotoPaths, setPrivatePhotoPaths] = useState<string[]>([]);
  const [canSendPrivatePhotos, setCanSendPrivatePhotos] = useState(false);
  const [privatePhotoPickerOpen, setPrivatePhotoPickerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeConversationStartedByVip, setActiveConversationStartedByVip] = useState(false);
  const { isVip, openVipModal } = useVip();
  const { user } = useAuth();
  const { unreadByConversation, markConversationRead } = useUnreadMessages();

  const openPrivatePhotoPicker = async () => {
    if (!user) return;
    const { data: profile, error } = await d1
      .from("profiles")
      .select("vip, private_album")
      .eq("id", user.id)
      .maybeSingle();

    if (error || !profile) {
      console.error("Erro ao carregar álbum privado para o chat:", error);
      toast.error("Não foi possível carregar seu álbum privado");
      return;
    }

    setCanSendPrivatePhotos(profile.vip);
    if (!profile.vip) {
      openVipModal();
      return;
    }

    const photos = (profile.private_album ?? []).filter((path) => path.startsWith(`${user.id}/private/`));
    setPrivatePhotoPaths(photos);
    if (!photos.length) {
      toast(profile.private_album?.length
        ? "As fotos salvas não têm caminhos compatíveis com o álbum privado"
        : "Seu álbum privado ainda não tem fotos");
      return;
    }
    setPrivatePhotoPickerOpen(true);
  };

  useEffect(() => {
    async function init() {
      if (!user) return;
      setCurrentUserId(user.id);

      const { data: profiles } = await d1.from("profiles").select("id, nick, avatar").neq("id", user.id);

      if (profiles && profiles.length > 0) {
        setPartners(profiles);
      }

      const { data: conversations } = await d1
        .from("conversations")
        .select("id, user_a, user_b");

      const partnerIds = (conversations ?? []).map((conversation) =>
        conversation.user_a === user.id ? conversation.user_b : conversation.user_a,
      );
      setConversationPartnerIds(partnerIds);
      setConversationIdsByPartner(Object.fromEntries(
        (conversations ?? []).map((conversation) => [
          conversation.user_a === user.id ? conversation.user_b : conversation.user_a,
          conversation.id,
        ]),
      ));
      if (!conversations?.length) return;

      const partnerByConversation = new Map<string, string>();
      for (const conversation of conversations) {
        partnerByConversation.set(
          conversation.id,
          conversation.user_a === user.id ? conversation.user_b : conversation.user_a,
        );
      }

      const { data: latestMessages } = await d1
        .from("messages")
        .select("id, sender_id, conversation_id, body, created_at")
        .in("conversation_id", [...partnerByConversation.keys()])
        .order("created_at", { ascending: false });

      const previews: Record<string, string> = {};
      for (const message of latestMessages ?? []) {
        const partnerId = partnerByConversation.get(message.conversation_id);
        if (partnerId && previews[partnerId] === undefined) {
          previews[partnerId] = messagePreview(message, user.id);
        }
      }
      setConversationPreviews(previews);
    }

    void init();
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    async function loadConversationAndMessages() {
      if (!currentUserId || !activePartnerId) return;
      setActiveConversationId(null);
      setActiveConversationStartedByVip(false);
      setMessages([]);
      if (!isVip && !conversationPartnerIds.includes(activePartnerId)) {
        setActivePartnerId(null);
        openVipModal();
        return;
      }

      const { data: conversations, error: conversationsError } = await d1.from("conversations").select("id, user_a, user_b");
      if (cancelled) return;
      if (conversationsError) {
        console.error("Erro ao carregar conversas:", conversationsError);
        toast.error("Não foi possível carregar esta conversa");
        return;
      }
      let conv = (conversations ?? []).find((conversation) =>
        (conversation.user_a === currentUserId && conversation.user_b === activePartnerId)
        || (conversation.user_a === activePartnerId && conversation.user_b === currentUserId),
      ) ?? null;

      if (!conv) {
        if (!isVip) return;
        const { data: newConv, error: createError } = await d1
          .from("conversations")
          .insert([{ user_a: currentUserId, user_b: activePartnerId }])
          .select("id")
          .single();
        if (cancelled) return;
        if (createError) {
          console.error("Erro ao iniciar conversa:", createError);
          toast.error("Não foi possível iniciar esta conversa");
          return;
        }
        conv = newConv;
      }

      if (conv) {
        setActiveConversationId(conv.id);

        const { data: msgList, error: messagesError } = await d1
          .from("messages")
          .select("*")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: true });
        if (cancelled) return;
        if (messagesError) {
          console.error("Erro ao carregar mensagens:", messagesError);
          toast.error("Não foi possível carregar as mensagens");
          return;
        }

        const loadedMessages = (msgList ?? []) as ChatMessage[];
        try {
          await markConversationRead(conv.id);
        } catch (error) {
          console.error("Erro ao marcar conversa como lida:", error);
          toast.error("Não foi possível atualizar o estado de leitura da conversa");
        }
        if (cancelled) return;
        setActiveConversationStartedByVip(
          conv.user_a === currentUserId
            ? isVip
            : loadedMessages.some((message) => message.sender_id === conv.user_a),
        );
        const messageIds = loadedMessages.map((message) => message.id);
        let attachments: ChatAttachment[] = [];
        if (messageIds.length) {
          const { data: attachmentRows, error: attachmentError } = await d1
            .from("message_attachments")
            .select("*")
            .in("message_id", messageIds);
          if (cancelled) return;
          if (attachmentError) {
            console.error("Erro ao carregar anexos da conversa:", attachmentError);
            toast.error("Não foi possível carregar as fotos desta conversa");
          }
          attachments = (attachmentRows ?? []) as ChatAttachment[];
        }
        const attachmentsByMessage = new Map<string, ChatAttachment[]>();
        for (const attachment of attachments) {
          const current = attachmentsByMessage.get(attachment.message_id) ?? [];
          attachmentsByMessage.set(attachment.message_id, [...current, attachment]);
        }
        setMessages(loadedMessages.map((message) => ({
          ...message,
          attachments: attachmentsByMessage.get(message.id) ?? [],
        })));
        const latestMessage = msgList?.at(-1) as ChatMessage | undefined;
        if (latestMessage) {
          setConversationPreviews((previews) => ({
            ...previews,
            [activePartnerId]: messagePreview(latestMessage, currentUserId),
          }));
        }
      }
    }

    void loadConversationAndMessages();
    return () => {
      cancelled = true;
    };
  }, [currentUserId, activePartnerId, isVip, conversationPartnerIds, openVipModal, markConversationRead]);

  const handleSendMessage = async () => {
    if ((!draft.trim() && !selectedPrivatePhotos.length) || !currentUserId || !activeConversationId) return;
    if (!isVip && !activeConversationStartedByVip) {
      toast("Aguarde a primeira mensagem do VIP para responder.");
      return;
    }

    const text = draft.trim();
    const photoPaths = [...selectedPrivatePhotos];

    const { data, error } = await d1
      .from("messages")
      .insert([
        {
          sender_id: currentUserId,
          conversation_id: activeConversationId,
          body: text || (photoPaths.length === 1 ? "Enviou uma foto privada" : "Enviou fotos privadas"),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Erro ao gravar mensagem no D1:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      toast.error("Erro ao enviar mensagem");
      return;
    }

    if (!data) return;
    if (isVip) setActiveConversationStartedByVip(true);

    let attachments: ChatAttachment[] = [];
    if (photoPaths.length) {
      const { data: attachmentRows, error: attachmentError } = await d1
        .from("message_attachments")
        .insert(photoPaths.map((storagePath) => ({ message_id: data.id, storage_path: storagePath })))
        .select("*");
      if (attachmentError || (attachmentRows ?? []).length !== photoPaths.length) {
        console.error("Erro ao gravar anexos privados no D1:", {
          code: attachmentError?.code,
          message: attachmentError?.message ?? "Quantidade de anexos gravados diferente da selecionada",
          details: attachmentError?.details,
          hint: attachmentError?.hint,
          expected: photoPaths.length,
          received: attachmentRows?.length ?? 0,
        });
        setMessages((previous) => [...previous, { ...(data as ChatMessage), attachments: [] }]);
        if (activePartnerId) {
          setConversationPreviews((previews) => ({
            ...previews,
            [activePartnerId]: messagePreview(data as ChatMessage, currentUserId),
          }));
        }
        toast.error("A mensagem foi criada, mas o banco não gravou as fotos. A seleção foi mantida.");
        return;
      }
      attachments = attachmentRows as ChatAttachment[];
      toast.success("Mensagem e fotos enviadas");
    } else {
      toast.success("Mensagem enviada");
    }

    setMessages((previous) => [...previous, { ...(data as ChatMessage), attachments }]);
    setDraft("");
    setSelectedPrivatePhotos([]);
    if (activePartnerId) {
      setConversationPreviews((previews) => ({
        ...previews,
        [activePartnerId]: messagePreview(data as ChatMessage, currentUserId),
      }));
    }

    if (activePartnerId && activePartnerId !== currentUserId) {
      await d1.from("notifications").insert({
        user_id: activePartnerId,
        actor_id: currentUserId,
        type: "message",
        body: "enviou uma mensagem",
      });
    }
  };

  const partner = partners.find((p) => p.id === activePartnerId) ?? null;
  const canSendMessages = isVip || activeConversationStartedByVip;
  const messageSendingEnabled = Boolean(activeConversationId) && canSendMessages;
  const activePreview = messages[messages.length - 1]?.body?.trim() || "Nenhuma mensagem ainda";
  const filteredPartners = partners
    .filter((p) => isVip || conversationPartnerIds.includes(p.id))
    .filter((p) => p.nick.toLowerCase().includes(searchTerm.trim().toLowerCase()));

  useEffect(() => {
    setSelectedPrivatePhotos([]);
    setPrivatePhotoPaths([]);
    setPrivatePhotoPickerOpen(false);
  }, [activePartnerId]);

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
                    {isVip ? "Nenhum contato encontrado." : "Apenas VIPs podem iniciar chats. Você pode responder mensagens recebidas de assinantes!"}
                  </div>
                ) : (
                  filteredPartners.map((p) => {
                    const isActive = p.id === activePartnerId;
                    const conversationId = conversationIdsByPartner[p.id];
                    const unreadCount = conversationId ? unreadByConversation[conversationId] ?? 0 : 0;
                    const preview = conversationPreviews[p.id]
                      ?? (isActive ? activePreview : "Nenhuma mensagem ainda");

                    return (
                      <button
                        key={p.id}
                        type="button"
                        aria-label={`${p.nick}${unreadCount > 0 ? `, ${unreadCount} mensagens não lidas` : ""}`}
                        onClick={() => {
                          if (!isVip && !conversationPartnerIds.includes(p.id)) {
                            openVipModal();
                            return;
                          }
                          setActiveConversationId(null);
                          setActiveConversationStartedByVip(false);
                          setMessages([]);
                          setActivePartnerId(p.id);
                        }}
                        className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all duration-200 ${
                          isActive
                            ? "border-primary/40 bg-primary/10 shadow-[0_0_0_1px_rgba(168,85,247,0.15)]"
                            : unreadCount > 0
                              ? "border-primary/30 bg-primary/5 text-foreground hover:bg-primary/10"
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
                            className={`inline-block max-w-full truncate text-sm hover:underline ${unreadCount > 0 ? "font-bold text-foreground" : "font-medium text-foreground"}`}
                            aria-label={`Ver perfil de ${p.nick}`}
                            onClick={(event) => event.stopPropagation()}
                          >
                            {p.nick}
                          </Link>
                          <span className={`mt-0.5 block truncate text-[11px] ${unreadCount > 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}>{preview}</span>
                        </div>
                        {unreadCount > 0 && (
                          <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        )}
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
                      </div>
                    </div>
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
                              {msg.attachments?.map((attachment) => (
                                <PrivatePhotoMessage key={attachment.id} path={attachment.storage_path} />
                              ))}
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

                  {!messageSendingEnabled && (
                    <div className="border-b border-border/70 bg-surface/20 px-4 py-2 text-center text-xs text-muted-foreground">
                      {activeConversationId
                        ? "Aguarde a primeira mensagem do VIP para responder."
                        : "Carregando conversa..."}
                    </div>
                  )}

                  <div className="border-t border-border/70 bg-surface/40 p-3 sm:p-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void openPrivatePhotoPicker()}
                        disabled={!activeConversationId}
                        aria-label={canSendPrivatePhotos ? "Enviar fotos do álbum privado" : "Enviar fotos privadas, recurso VIP"}
                        title={canSendPrivatePhotos ? "Enviar foto privada" : "Recurso VIP"}
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border text-muted-foreground hover:bg-surface-2 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {canSendPrivatePhotos ? <ImagePlus className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                      </button>
                      <input
                        type="text"
                        value={draft}
                        disabled={!messageSendingEnabled}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void handleSendMessage();
                          }
                        }}
                        placeholder={messageSendingEnabled ? "Digite sua mensagem..." : "Aguarde a mensagem inicial do VIP"}
                        className="min-w-0 flex-1 rounded-full border border-border bg-background/70 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                      <button
                        type="button"
                        onClick={() => void handleSendMessage()}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-neon transition-transform duration-200 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label="Enviar mensagem"
                        disabled={!messageSendingEnabled || (!draft.trim() && !selectedPrivatePhotos.length)}
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
      <Dialog open={privatePhotoPickerOpen} onOpenChange={setPrivatePhotoPickerOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-border bg-surface sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Enviar fotos privadas</DialogTitle>
            <DialogDescription>Selecione fotos do seu álbum privado para enviar nesta conversa.</DialogDescription>
          </DialogHeader>
          {privatePhotoPaths.length ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                {privatePhotoPaths.map((path) => {
                  const selected = selectedPrivatePhotos.includes(path);
                  return (
                    <PrivatePhotoOption
                      key={path}
                      path={path}
                      selected={selected}
                      onSelect={() => setSelectedPrivatePhotos((photos) => (
                        selected ? photos.filter((photo) => photo !== path) : [...photos, path]
                      ))}
                    />
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setPrivatePhotoPickerOpen(false)}
                disabled={!selectedPrivatePhotos.length}
                className="w-full rounded-full bg-gradient-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                Adicionar {selectedPrivatePhotos.length || ""} foto{selectedPrivatePhotos.length === 1 ? "" : "s"} à mensagem
              </button>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">Seu álbum privado ainda não tem fotos.</p>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}