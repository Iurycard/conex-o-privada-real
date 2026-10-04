-- Account types, genders, and orientations currently defined by the app.
INSERT OR IGNORE INTO profile_types (value, sort_order) VALUES
  ('Casal (Ele/Ela)', 1),
  ('Casal (Ela/Ela)', 2),
  ('Casal (Ele/Ele)', 3),
  ('Mulher Solteira', 4),
  ('Homem Solteiro', 5),
  ('Travesti', 6);

INSERT OR IGNORE INTO genders (value, sort_order) VALUES
  ('Mulher', 1),
  ('Homem', 2),
  ('Não binário', 3),
  ('Casal', 4);

INSERT OR IGNORE INTO orientations (value, label, sort_order) VALUES
  ('heterossexual', 'Heterossexual', 1),
  ('homossexual', 'Homossexual', 2),
  ('bissexual', 'Bissexual', 3),
  ('pansexual', 'Pansexual', 4),
  ('outros', 'Outros', 5);

-- Demo fixtures only. The real four profile rows were not present in this repository;
-- replace these rows with an export before using this seed in production.
INSERT OR IGNORE INTO profiles (id, nick, username, type, city, bio, hue) VALUES
  ('demo-profile-1', 'Perfil de demonstração 1', 'demo_perfil_1', 'Casal (Ele/Ela)', '', '', 300),
  ('demo-profile-2', 'Perfil de demonstração 2', 'demo_perfil_2', 'Casal (Ela/Ela)', '', '', 330),
  ('demo-profile-3', 'Perfil de demonstração 3', 'demo_perfil_3', 'Mulher Solteira', '', '', 265),
  ('demo-profile-4', 'Perfil de demonstração 4', 'demo_perfil_4', 'Homem Solteiro', '', '', 45);

INSERT OR IGNORE INTO events
  (id, title, host, place, date_text, description, tags, hue, vip, cover_key, base_going, base_interested)
VALUES
  ('11111111-1111-4111-8111-000000000001', 'Noite Veludo', 'Produtora Meia-Noite', 'Club Aurora · São Paulo', 'Sáb, 22 ago · 23h', 'Uma noite de veludo, luz baixa e música ao vivo. Dress code elegante, entrada somente com lista prévia.', '["Open bar","Dress code","Casais e solteiras"]', 330, 1, 'e1', 184, 412),
  ('11111111-1111-4111-8111-000000000002', 'Rooftop Privé', 'Casa Zenith', 'Zenith Rooftop · Pinheiros', 'Sex, 28 ago · 21h', 'Vista da cidade, DJ set e lounge reservado para conversas tranquilas.', '["Lounge","DJ set","Lista prévia"]', 290, 0, 'e2', 96, 233),
  ('11111111-1111-4111-8111-000000000003', 'Encontro Litoral', 'Coletivo Maré', 'Praia Grande · Santos', 'Dom, 6 set · 16h', 'Day party à beira-mar com piscina, drinks e clima leve até o pôr do sol.', '["Day party","Piscina"]', 265, 0, 'e3', 61, 158),
  ('11111111-1111-4111-8111-000000000004', 'Baile Dourado', 'Produtora Meia-Noite', 'Teatro Íris · Centro', 'Sáb, 12 set · 22h', 'Baile de máscaras em teatro histórico. Convite VIP e traje de gala.', '["Máscaras","Convite VIP"]', 45, 1, 'e4', 240, 605);