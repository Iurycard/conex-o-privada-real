export type ProfileRow = {
  id: string;
  nick: string;
  username: string;
  type: string;
  city: string;
  bio: string;
  gender: string | null;
  orientation: string | null;
  birth_date: string | null;
  hue: number;
  latitude: number | null;
  longitude: number | null;
  avatar: string | null;
  cover: string | null;
  vip: boolean;
  looking_for: string[];
  public_album: string[];
  private_album: string[];
  created_at: string;
  updated_at: string;
};

export type PostRow = {
  id: string;
  author_id: string;
  wall_profile_id: string | null;
  text: string;
  media: string | null;
  image: string | null;
  likes: number;
  comments: number;
  created_at: string;
  updated_at: string;
};

export type PostCommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type ReportRow = {
  id: string;
  reporter_id: string;
  reported_profile_id: string | null;
  post_id: string | null;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type Tables<Name extends "profiles" | "posts" | "post_comments" | "reports"> =
  Name extends "profiles" ? ProfileRow
    : Name extends "posts" ? PostRow
      : Name extends "post_comments" ? PostCommentRow
        : ReportRow;
