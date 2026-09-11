import avA1 from "@/assets/avatars/a1.jpg";
import avA2 from "@/assets/avatars/a2.jpg";
import avA3 from "@/assets/avatars/a3.jpg";
import avA4 from "@/assets/avatars/a4.jpg";
import avA5 from "@/assets/avatars/a5.jpg";
import avA6 from "@/assets/avatars/a6.jpg";
import avA7 from "@/assets/avatars/a7.jpg";
import avA8 from "@/assets/avatars/a8.jpg";
import coverC1 from "@/assets/covers/c1.jpg";
import coverC2 from "@/assets/covers/c2.jpg";
import coverC3 from "@/assets/covers/c3.jpg";
import coverC4 from "@/assets/covers/c4.jpg";
import coverC5 from "@/assets/covers/c5.jpg";
import coverC6 from "@/assets/covers/c6.jpg";
import coverC7 from "@/assets/covers/c7.jpg";
import coverC8 from "@/assets/covers/c8.jpg";
import postF1 from "@/assets/posts/post-f1.jpg";
import postF2 from "@/assets/posts/post-f2.jpg";
import postF3 from "@/assets/posts/post-f3.jpg";
import postF4 from "@/assets/posts/post-f4.jpg";
import postF5 from "@/assets/posts/post-f5.jpg";
import album1 from "@/assets/albums/album1.png";
import album2 from "@/assets/albums/album2.png";
import album3 from "@/assets/albums/album3.png";
import album4 from "@/assets/albums/album4.png";
import album5 from "@/assets/albums/album5.png";
import album6 from "@/assets/albums/album6.png";
import album7 from "@/assets/albums/album7.png";
import album8 from "@/assets/albums/album8.png";
import album9 from "@/assets/albums/album9.png";
import album10 from "@/assets/albums/album10.png";
import album11 from "@/assets/albums/album11.png";
import album12 from "@/assets/albums/album12.png";
import album13 from "@/assets/albums/album13.png";
import album14 from "@/assets/albums/album14.png";
import album15 from "@/assets/albums/album15.png";
import album16 from "@/assets/albums/album16.png";


export type AccountType =
  | "Casal (Ele/Ela)"
  | "Casal (Ela/Ela)"
  | "Casal (Ele/Ele)"
  | "Mulher Solteira"
  | "Homem Solteiro"
  | "Travesti";

export const accountTypes: AccountType[] = [
  "Casal (Ele/Ela)",
  "Casal (Ela/Ela)",
  "Casal (Ele/Ele)",
  "Mulher Solteira",
  "Homem Solteiro",
  "Travesti",
];

export type Profile = {
  id: string;
  nick: string;
  type: AccountType;
  city: string;
  distance: string;
  distanceKm: number;
  age: number;
  vip: boolean;
  hue: number;
  bio: string;
  gender?: string;
  birthDate?: string;
  latitude?: number;
  longitude?: number;
  avatar?: string;
  cover?: string;
  lookingFor?: AccountType[];
  publicAlbum?: string[];
  privateAlbum?: string[];
  role?: 'admin' | 'user';
  status?: 'Ativo' | 'Suspenso';
  isVerified?: boolean;
};

const U = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;

export const unsplashPhotoPool = [
  U("photo-1519125323398-675f0ddb6308"),
  U("photo-1506744038136-46273834b3fb"),
  U("photo-1441974231531-c6227db76b6e"),
  U("photo-1500530855697-b586d89ba3ee"),
  U("photo-1493246507139-91e8fad9978e"),
  U("photo-1470071459604-3b5ec3a7fe05"),
  U("photo-1518495973542-4542c06a5843"),
  U("photo-1504384308090-c894fdcc538d"),
  U("photo-1497215728101-856f4ea42174"),
  U("photo-1526779259212-939e64788e3c"),
  U("photo-1521737604893-d14cc237f11d"),
  U("photo-1517048676732-d65bc937f952"),
];
export const avatarPool = [avA1, avA2, avA3, avA4, avA5, avA6, avA7, avA8];
export const coverPool = [coverC1, coverC2, coverC3, coverC4, coverC5, coverC6, coverC7, coverC8];
export const albumPool = [album1, album2, album3, album4, album5, album6, album7, album8, album9, album10, album11, album12, album13, album14, album15, album16];


function albumFrom(offset: number, count: number) { 
  return Array.from(
    { length: count },
    (_, i) => albumPool[(offset + i) % albumPool.length]!,
  );
}


export function randomPrivateAlbum() {
  return albumFrom(Math.floor(Math.random() * albumPool.length), 4);
}

export function randomPublicAlbum() {
  return albumFrom(Math.floor(Math.random() * albumPool.length), 3);
}


export function randomAvatar() {
  return avatarPool[Math.floor(Math.random() * avatarPool.length)]!;
}

export function randomCover() {
  return coverPool[Math.floor(Math.random() * coverPool.length)]!;
}

export const profiles: Profile[] = [
  { id: "p1", nick: "L&M", type: "Casal (Ele/Ela)", city: "São Paulo, SP", distance: "2 km", distanceKm: 2, age: 34, vip: true, hue: 320, avatar: avA1, cover: coverC1, bio: "Casal discreto, gostamos de vinho, música e boas conversas.", lookingFor: ["Mulher Solteira", "Casal (Ele/Ela)"], publicAlbum: albumFrom(0, 6), privateAlbum: albumFrom(3, 4), role: "admin", status: "Ativo", isVerified: true },
  { id: "p2", nick: "Aurora", type: "Mulher Solteira", city: "Campinas, SP", distance: "8 km", distanceKm: 8, age: 27, vip: false, hue: 285, avatar: avA2, cover: coverC2, bio: "Fotógrafa. Curto eventos, arte e gente sem papel.", lookingFor: ["Homem Solteiro", "Casal (Ele/Ela)"], publicAlbum: albumFrom(1, 6), privateAlbum: albumFrom(4, 4), role: "user", status: "Ativo", isVerified: true },
  { id: "p3", nick: "Duo Noir", type: "Casal (Ela/Ela)", city: "Santos, SP", distance: "14 km", distanceKm: 14, age: 31, vip: true, hue: 340, avatar: avA3, cover: coverC3, bio: "Praia, festa e privacidade acima de tudo.", lookingFor: ["Casal (Ela/Ela)", "Mulher Solteira"], publicAlbum: albumFrom(2, 6), privateAlbum: albumFrom(5, 4), role: "user", status: "Ativo", isVerified: false },
  { id: "p4", nick: "Vitor", type: "Homem Solteiro", city: "São Paulo, SP", distance: "5 km", distanceKm: 5, age: 29, vip: false, hue: 260, avatar: avA4, cover: coverC4, bio: "Chef nas horas vagas. Discrição é regra.", lookingFor: ["Mulher Solteira"], publicAlbum: albumFrom(3, 6), privateAlbum: albumFrom(6, 4), role: "user", status: "Ativo", isVerified: false },
  { id: "p5", nick: "Íris & Léo", type: "Casal (Ele/Ela)", city: "Guarulhos, SP", distance: "11 km", distanceKm: 11, age: 38, vip: false, hue: 300, avatar: avA5, cover: coverC5, bio: "Novos por aqui, sem pressa.", lookingFor: ["Casal (Ele/Ela)", "Homem Solteiro"], publicAlbum: albumFrom(4, 6), privateAlbum: albumFrom(7, 4), role: "user", status: "Ativo", isVerified: false },
  { id: "p6", nick: "R&D", type: "Casal (Ele/Ele)", city: "São Paulo, SP", distance: "3 km", distanceKm: 3, age: 42, vip: true, hue: 355, avatar: avA6, cover: coverC6, bio: "Amantes de eventos e boa companhia.", lookingFor: ["Casal (Ele/Ele)", "Homem Solteiro"], publicAlbum: albumFrom(5, 6), privateAlbum: albumFrom(8, 4), role: "user", status: "Ativo", isVerified: true },
  { id: "p7", nick: "Nina", type: "Mulher Solteira", city: "ABC Paulista", distance: "17 km", distanceKm: 17, age: 25, vip: false, hue: 270, avatar: avA7, cover: coverC7, bio: "Dança, viagens e conversas longas.", lookingFor: ["Homem Solteiro", "Mulher Solteira"], publicAlbum: albumFrom(6, 6), privateAlbum: albumFrom(9, 4), role: "user", status: "Ativo", isVerified: false },
  { id: "p8", nick: "Caio", type: "Homem Solteiro", city: "São Paulo, SP", distance: "6 km", distanceKm: 6, age: 36, vip: true, hue: 315, avatar: avA8, cover: coverC8, bio: "Colecionador de vinis e de bons encontros.", lookingFor: ["Mulher Solteira", "Casal (Ela/Ela)"], publicAlbum: albumFrom(7, 6), privateAlbum: albumFrom(10, 4), role: "user", status: "Ativo", isVerified: true },
];

export type Post = {
  id: string;
  authorId: string;
  time: string;
  text: string;
  likes: number;
  comments: number;
  media: "foto" | "video";
  image?: string;
};
export const sexualOrientationOptions = [
  { value: "heterossexual", label: "Heterossexual" },
  { value: "homossexual", label: "Homossexual" },
  { value: "bissexual", label: "Bissexual" },
  { value: "pansexual", label: "Pansexual" },
  { value: "outros", label: "Outros" },
];

export const postImagePool = [postF1, postF2, postF3, postF4, postF5];

export function randomPostImage() {
  return postImagePool[Math.floor(Math.random() * postImagePool.length)]!;
}

export const posts: Post[] = [
  { id: "f1", authorId: "p1", time: "há 12 min", text: "Noite de sexta com música boa e taça cheia. Quem vai no evento de sábado?", likes: 148, comments: 22, media: "foto", image: postF1 },
  { id: "f2", authorId: "p3", time: "há 1 h", text: "Fim de semana no litoral. Aceitamos indicações de lugares discretos 🌊", likes: 92, comments: 14, media: "foto", image: postF2 },
  { id: "f3", authorId: "p2", time: "há 3 h", text: "Ensaio novo no estúdio. Registrei em vídeo, mas só liberei no álbum privado.", likes: 210, comments: 41, media: "video", image: postF3 },
  { id: "f4", authorId: "p6", time: "há 5 h", text: "Lista aberta para a festa de sábado. Chega cedo que a pista enche.", likes: 76, comments: 9, media: "foto", image: postF4 },
  { id: "f5", authorId: "p5", time: "há 8 h", text: "Primeiro post por aqui. Dicas de eventos para iniciantes?", likes: 54, comments: 18, media: "foto", image: postF5 },
];

export const ads = [
  { id: "a1", title: "Lounge Vermelho", tag: "Bar reservado · Vila Olímpia", cta: "Reservar mesa" },
  { id: "a2", title: "Suítes Aurora", tag: "Hospedagem discreta · 24h", cta: "Ver disponibilidade" },
];

export type EventItem = {
  id: string;
  title: string;
  host: string;
  place: string;
  date: string;
  tags: string[];
  going: number;
  interested: number;
  hue: number;
  vip?: boolean;
};

export const events: EventItem[] = [
  { id: "e1", title: "Noite Veludo", host: "Produtora Meia-Noite", place: "Club Aurora · São Paulo", date: "Sáb, 22 ago · 23h", tags: ["Open bar", "Dress code", "Casais e solteiras"], going: 184, interested: 412, hue: 330, vip: true },
  { id: "e2", title: "Rooftop Privé", host: "Casa Zenith", place: "Zenith Rooftop · Pinheiros", date: "Sex, 28 ago · 21h", tags: ["Lounge", "DJ set", "Lista prévia"], going: 96, interested: 233, hue: 290 },
  { id: "e3", title: "Encontro Litoral", host: "Coletivo Maré", place: "Praia Grande · Santos", date: "Dom, 6 set · 16h", tags: ["Day party", "Piscina"], going: 61, interested: 158, hue: 265 },
  { id: "e4", title: "Baile Dourado", host: "Produtora Meia-Noite", place: "Teatro Íris · Centro", date: "Sáb, 12 set · 22h", tags: ["Máscaras", "Convite VIP"], going: 240, interested: 605, hue: 45, vip: true },
];

export type Conversation = {
  id: string;
  profileId: string;
  last: string;
  time: string;
  unread: number;
};

export const conversations: Conversation[] = [
  { id: "c1", profileId: "p1", last: "Vocês vão no Noite Veludo sábado?", time: "12:40", unread: 2 },
  { id: "c2", profileId: "p8", last: "Curti demais o seu álbum público!", time: "11:02", unread: 0 },
  { id: "c3", profileId: "p3", last: "Liberamos o acesso pra vocês 😉", time: "ontem", unread: 0 },
  { id: "c4", profileId: "p7", last: "Bora combinar algo mais tranquilo?", time: "seg", unread: 1 },
];

export const messages: Record<string, { from: "me" | "them"; text: string; time: string }[]> = {
  c1: [
    { from: "them", text: "Oi! Vimos que vocês curtiram nosso post.", time: "12:30" },
    { from: "me", text: "Oi! Curtimos sim, o lugar parece ótimo.", time: "12:34" },
    { from: "them", text: "Vocês vão no Noite Veludo sábado?", time: "12:40" },
  ],
  c2: [
    { from: "them", text: "Curti demais o seu álbum público!", time: "11:02" },
  ],
  c3: [
    { from: "me", text: "Podemos ver o álbum privado?", time: "ontem" },
    { from: "them", text: "Liberamos o acesso pra vocês 😉", time: "ontem" },
  ],
  c4: [
    { from: "them", text: "Bora combinar algo mais tranquilo?", time: "seg" },
  ],
};

export function profileById(id: string) { 
  return profiles.find((p) => p.id === id) ?? profiles[0]!;
}

export type Report = {
  id: string;
  reporterName: string;
  targetType: 'Perfil' | 'Post';
  reason: string;
  reportedContent: string;
  status: 'pending' | 'resolved' | 'ignored';
};

export type RecentMedia = {
  id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  ownerName: string;
  createdAt: string;
};

export const mockReports: Report[] = [
  {
    id: "r1",
    reporterName: "Aurora",
    targetType: "Perfil",
    reason: "Linguagem imprópria na bio",
    reportedContent: "Perfil de Vitor - Bio com termos ofensivos",
    status: "pending"
  },
  {
    id: "r2",
    reporterName: "Caio",
    targetType: "Post",
    reason: "Spam / Propaganda comercial",
    reportedContent: "Post de Duo Noir - 'Compre ingressos no link pirata...'",
    status: "pending"
  },
  {
    id: "r3",
    reporterName: "Nina",
    targetType: "Perfil",
    reason: "Falsidade ideológica",
    reportedContent: "Perfil de Íris & Léo - Fotos fakes do Instagram",
    status: "pending"
  }
];

export const mockRecentMedia: RecentMedia[] = [
  { id: "m1", mediaUrl: album1, mediaType: "image", ownerName: "L&M", createdAt: "há 5 min" },
  { id: "m2", mediaUrl: album2, mediaType: "image", ownerName: "Aurora", createdAt: "há 12 min" },
  { id: "m3", mediaUrl: album3, mediaType: "image", ownerName: "Duo Noir", createdAt: "há 25 min" },
  { id: "m4", mediaUrl: album4, mediaType: "image", ownerName: "Vitor", createdAt: "há 1 h" },
  { id: "m5", mediaUrl: album5, mediaType: "image", ownerName: "Íris & Léo", createdAt: "há 2 h" },
  { id: "m6", mediaUrl: album6, mediaType: "image", ownerName: "R&D", createdAt: "há 3 h" },
  { id: "m7", mediaUrl: album7, mediaType: "image", ownerName: "Nina", createdAt: "há 4 h" },
  { id: "m8", mediaUrl: album8, mediaType: "image", ownerName: "Caio", createdAt: "há 5 h" },
];
