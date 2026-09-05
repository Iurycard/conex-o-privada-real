-- FOLLOWS
CREATE TABLE public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id)
);
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Seguidores visiveis para logados" ON public.follows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Segue como voce mesmo" ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Deixa de seguir" ON public.follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- LIKES DE PERFIL
CREATE TABLE public.profile_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  liker_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  liked_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (liker_id, liked_id)
);
GRANT SELECT, INSERT, DELETE ON public.profile_likes TO authenticated;
GRANT ALL ON public.profile_likes TO service_role;
ALTER TABLE public.profile_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Curtidas visiveis para logados" ON public.profile_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Curte como voce mesmo" ON public.profile_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = liker_id);
CREATE POLICY "Remove a propria curtida" ON public.profile_likes FOR DELETE TO authenticated USING (auth.uid() = liker_id);

-- VISITAS
CREATE TABLE public.profile_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  visited_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (visitor_id, profile_id)
);
GRANT SELECT, INSERT, UPDATE ON public.profile_visits TO authenticated;
GRANT ALL ON public.profile_visits TO service_role;
ALTER TABLE public.profile_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dono ve as visitas" ON public.profile_visits FOR SELECT TO authenticated USING (auth.uid() = profile_id OR auth.uid() = visitor_id);
CREATE POLICY "Registra a propria visita" ON public.profile_visits FOR INSERT TO authenticated WITH CHECK (auth.uid() = visitor_id AND visitor_id <> profile_id);
CREATE POLICY "Atualiza a propria visita" ON public.profile_visits FOR UPDATE TO authenticated USING (auth.uid() = visitor_id) WITH CHECK (auth.uid() = visitor_id);

-- PEDIDOS DE ACESSO AO ALBUM PRIVADO
CREATE TABLE public.album_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, owner_id),
  CHECK (status IN ('pending','approved','rejected'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.album_access_requests TO authenticated;
GRANT ALL ON public.album_access_requests TO service_role;
ALTER TABLE public.album_access_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ve pedidos que envolvem voce" ON public.album_access_requests FOR SELECT TO authenticated USING (auth.uid() = requester_id OR auth.uid() = owner_id);
CREATE POLICY "Cria o proprio pedido" ON public.album_access_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = requester_id AND requester_id <> owner_id);
CREATE POLICY "Dono responde o pedido" ON public.album_access_requests FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Cancela o proprio pedido" ON public.album_access_requests FOR DELETE TO authenticated USING (auth.uid() = requester_id);
CREATE TRIGGER update_album_access_requests_updated_at BEFORE UPDATE ON public.album_access_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- NOTIFICACOES
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users ON DELETE CASCADE,
  type text NOT NULL,
  body text NOT NULL DEFAULT '',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ve as proprias notificacoes" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Cria notificacao como ator" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_id);
CREATE POLICY "Marca as proprias como lidas" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Apaga as proprias notificacoes" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- CONVERSAS E MENSAGENS
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  last_message text NOT NULL DEFAULT '',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_a, user_b)
);
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participantes veem a conversa" ON public.conversations FOR SELECT TO authenticated USING (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "Cria conversa como participante" ON public.conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "Participantes atualizam a conversa" ON public.conversations FOR UPDATE TO authenticated USING (auth.uid() = user_a OR auth.uid() = user_b) WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_conversation_idx ON public.messages (conversation_id, created_at);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participantes leem mensagens" ON public.messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.user_a = auth.uid() OR c.user_b = auth.uid()))
);
CREATE POLICY "Participantes enviam mensagens" ON public.messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND (c.user_a = auth.uid() OR c.user_b = auth.uid()))
);
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- EVENTOS
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  host text NOT NULL DEFAULT '',
  place text NOT NULL DEFAULT '',
  date_text text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  hue integer NOT NULL DEFAULT 300,
  vip boolean NOT NULL DEFAULT false,
  cover_key text,
  base_going integer NOT NULL DEFAULT 0,
  base_interested integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Eventos visiveis para logados" ON public.events FOR SELECT TO authenticated USING (true);
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'going',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id),
  CHECK (status IN ('going','interested'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_attendees TO authenticated;
GRANT ALL ON public.event_attendees TO service_role;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Presencas visiveis para logados" ON public.event_attendees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Confirma a propria presenca" ON public.event_attendees FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Altera a propria presenca" ON public.event_attendees FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Remove a propria presenca" ON public.event_attendees FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER update_event_attendees_updated_at BEFORE UPDATE ON public.event_attendees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.events (id, title, host, place, date_text, description, tags, hue, vip, cover_key, base_going, base_interested) VALUES
  ('11111111-1111-4111-8111-000000000001', 'Noite Veludo', 'Produtora Meia-Noite', 'Club Aurora · São Paulo', 'Sáb, 22 ago · 23h', 'Uma noite de veludo, luz baixa e música ao vivo. Dress code elegante, entrada somente com lista prévia.', ARRAY['Open bar','Dress code','Casais e solteiras'], 330, true, 'e1', 184, 412),
  ('11111111-1111-4111-8111-000000000002', 'Rooftop Privé', 'Casa Zenith', 'Zenith Rooftop · Pinheiros', 'Sex, 28 ago · 21h', 'Vista da cidade, DJ set e lounge reservado para conversas tranquilas.', ARRAY['Lounge','DJ set','Lista prévia'], 290, false, 'e2', 96, 233),
  ('11111111-1111-4111-8111-000000000003', 'Encontro Litoral', 'Coletivo Maré', 'Praia Grande · Santos', 'Dom, 6 set · 16h', 'Day party à beira-mar com piscina, drinks e clima leve até o pôr do sol.', ARRAY['Day party','Piscina'], 265, false, 'e3', 61, 158),
  ('11111111-1111-4111-8111-000000000004', 'Baile Dourado', 'Produtora Meia-Noite', 'Teatro Íris · Centro', 'Sáb, 12 set · 22h', 'Baile de máscaras em teatro histórico. Convite VIP e traje de gala.', ARRAY['Máscaras','Convite VIP'], 45, true, 'e4', 240, 605);