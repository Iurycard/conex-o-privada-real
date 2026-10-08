import {
  sendDailyActivityReport,
  sendPasswordReset,
  sendSupportTicketReply,
  type DailyActivity,
  type EmailEnvironment,
} from "@/email";

type D1Value = string | number | null | Uint8Array;
type D1Row = Record<string, unknown>;

type D1Statement = {
  bind: (...values: D1Value[]) => D1Statement;
  all: <T = D1Row>() => Promise<{ results?: T[] }>;
  first: <T = D1Row>() => Promise<T | null>;
  run: () => Promise<unknown>;
};

type D1Database = {
  prepare: (sql: string) => D1Statement;
  batch: (statements: D1Statement[]) => Promise<unknown>;
};

type R2Object = {
  body: ReadableStream;
  httpMetadata?: { contentType?: string; cacheControl?: string };
  writeHttpMetadata?: (headers: Headers) => void;
};

type R2Bucket = {
  get: (key: string) => Promise<R2Object | null>;
  head: (key: string) => Promise<unknown | null>;
  put: (key: string, value: ReadableStream | ArrayBuffer | ArrayBufferView, options?: unknown) => Promise<unknown>;
  delete: (key: string) => Promise<void>;
};

type WorkerEnv = { DB: D1Database; MEDIA?: R2Bucket } & EmailEnvironment;
type AuthUser = { id: string; email: string; role: string };

const SESSION_COOKIE = "cp_session";
const SESSION_DAYS = 30;
const PASSWORD_ITERATIONS = 600_000;
const JSON_COLUMNS = new Set(["looking_for", "public_album", "private_album", "tags"]);
const BOOLEAN_COLUMNS = new Set(["vip", "read", "verified"]);

const TABLE_COLUMNS: Record<string, readonly string[]> = {
  profiles: ["id", "nick", "username", "type", "city", "bio", "gender", "orientation", "birth_date", "hue", "latitude", "longitude", "avatar", "cover", "vip", "looking_for", "public_album", "private_album", "created_at", "updated_at"],
  posts: ["id", "author_id", "wall_profile_id", "text", "media", "image", "likes", "comments", "created_at", "updated_at"],
  post_likes: ["id", "post_id", "user_id", "created_at"],
  post_comments: ["id", "post_id", "user_id", "body", "created_at", "updated_at"],
  follows: ["id", "follower_id", "following_id", "created_at"],
  profile_likes: ["id", "liker_id", "liked_id", "created_at"],
  profile_visits: ["id", "visitor_id", "profile_id", "visited_at"],
  album_access_requests: ["id", "requester_id", "owner_id", "status", "created_at", "updated_at"],
  notifications: ["id", "user_id", "actor_id", "type", "body", "read", "created_at"],
  conversations: ["id", "user_a", "user_b", "last_message", "last_message_at", "created_at", "updated_at"],
  messages: ["id", "conversation_id", "sender_id", "body", "created_at"],
  events: ["id", "title", "host", "place", "date_text", "description", "tags", "hue", "vip", "cover_key", "base_going", "base_interested", "created_at", "updated_at"],
  event_attendees: ["id", "event_id", "user_id", "status", "created_at", "updated_at"],
  user_roles: ["id", "user_id", "role", "created_at"],
  user_blocks: ["id", "blocker_id", "blocked_id", "created_at"],
  reports: ["id", "reporter_id", "reported_profile_id", "post_id", "reason", "details", "status", "created_at", "updated_at"],
  message_attachments: ["id", "message_id", "storage_path", "created_at"],
};

const TABLE_IDS: Record<string, string> = {
  profiles: "id", posts: "id", post_likes: "id", post_comments: "id", follows: "id",
  profile_likes: "id", profile_visits: "id", album_access_requests: "id", notifications: "id",
  conversations: "id", messages: "id", events: "id", event_attendees: "id", user_roles: "id",
  user_blocks: "id", reports: "id", message_attachments: "id",
};

class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

function json(data: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

function requireDb(env: WorkerEnv) {
  if (!env.DB) throw new ApiError(503, "D1 binding DB is not configured");
  return env.DB;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sha256(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PASSWORD_ITERATIONS },
    key,
    256,
  );
  return `pbkdf2-sha256$${PASSWORD_ITERATIONS}$${bytesToBase64Url(salt)}$${bytesToBase64Url(new Uint8Array(bits))}`;
}

async function verifyPassword(password: string, encoded: string) {
  const [algorithm, iterationText, saltText, expectedText] = encoded.split("$");
  if (algorithm !== "pbkdf2-sha256" || !iterationText || !saltText || !expectedText) return false;
  const iterations = Number(iterationText);
  if (!Number.isSafeInteger(iterations) || iterations < 100_000 || iterations > 1_000_000) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: base64UrlToBytes(saltText), iterations },
    key,
    256,
  );
  const actual = new Uint8Array(bits);
  const expected = base64UrlToBytes(expectedText);
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) difference |= actual[index]! ^ expected[index]!;
  return difference === 0;
}

function getCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    return decodeURIComponent(part.slice(separator + 1).trim());
  }
  return null;
}

function sessionCookie(request: Request, token: string, maxAge: number) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}

async function getUser(request: Request, db: D1Database): Promise<AuthUser | null> {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = bytesToBase64Url(await sha256(token));
  const row = await db.prepare(
    `SELECT u.id, u.email,
      COALESCE((SELECT role FROM user_roles WHERE user_id = u.id AND role = 'admin' LIMIT 1), 'user') AS role
     FROM auth_sessions s
     JOIN auth_users u ON u.id = s.user_id
     LEFT JOIN admin_account_status a ON a.user_id = u.id
     WHERE s.token_hash = ? AND s.expires_at > ?
       AND (a.status IS NULL OR a.status = 'active'
         OR (a.status = 'suspended' AND a.suspended_until IS NOT NULL
           AND julianday(a.suspended_until) <= julianday(?)))
     LIMIT 1`,
  ).bind(tokenHash, new Date().toISOString(), new Date().toISOString()).first<AuthUser>();
  return row;
}

async function createSession(db: D1Database, userId: string) {
  const token = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = bytesToBase64Url(await sha256(token));
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await db.prepare("INSERT INTO auth_sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)")
    .bind(crypto.randomUUID(), userId, tokenHash, expiresAt).run();
  return token;
}

async function readJson(request: Request) {
  try {
    const value: unknown = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw new ApiError(400, "Invalid JSON request body");
  }
}

function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new ApiError(403, "Cross-origin request rejected");
}

async function authHandler(request: Request, db: D1Database, env: WorkerEnv, path: string) {
  if (path === "/api/auth/session" && request.method === "GET") {
    const user = await getUser(request, db);
    return json({ user: user ? { id: user.id, email: user.email, app_metadata: { role: user.role } } : null });
  }

  if (path === "/api/auth/logout" && request.method === "POST") {
    assertSameOrigin(request);
    const token = getCookie(request, SESSION_COOKIE);
    if (token) await db.prepare("DELETE FROM auth_sessions WHERE token_hash = ?").bind(bytesToBase64Url(await sha256(token))).run();
    return json({ ok: true }, 200, { "set-cookie": sessionCookie(request, "", 0) });
  }

  if (path === "/api/auth/password" && request.method === "POST") {
    assertSameOrigin(request);
    const user = await getUser(request, db);
    if (!user) throw new ApiError(401, "Authentication required");
    const body = await readJson(request);
    const currentPassword = typeof body["currentPassword"] === "string" ? body["currentPassword"] : "";
    const newPassword = typeof body["newPassword"] === "string" ? body["newPassword"] : "";
    if (newPassword.length < 12 || newPassword.length > 128) throw new ApiError(400, "A senha deve ter entre 12 e 128 caracteres");
    const row = await db.prepare("SELECT password_hash FROM auth_users WHERE id = ? LIMIT 1")
      .bind(user.id).first<{ password_hash: string }>();
    if (!row || !(await verifyPassword(currentPassword, row.password_hash))) throw new ApiError(401, "Senha atual incorreta");
    const token = getCookie(request, SESSION_COOKIE);
    const tokenHash = token ? bytesToBase64Url(await sha256(token)) : "";
    await db.batch([
      db.prepare("UPDATE auth_users SET password_hash = ? WHERE id = ?").bind(await hashPassword(newPassword), user.id),
      db.prepare("DELETE FROM auth_sessions WHERE user_id = ? AND token_hash <> ?").bind(user.id, tokenHash),
    ]);
    return json({ ok: true });
  }

  if (path === "/api/auth/password-reset/request" && request.method === "POST") {
    assertSameOrigin(request);
    const body = await readJson(request);
    const email = typeof body["email"] === "string" ? body["email"].trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      throw new ApiError(400, "Informe um e-mail válido");
    }
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM || !env.APP_URL) {
      throw new ApiError(503, "Password reset email is not configured");
    }
    let appUrl: URL;
    try {
      appUrl = new URL(env.APP_URL);
    } catch {
      throw new ApiError(503, "APP_URL must be a valid public application URL");
    }
    if (appUrl.protocol !== "https:" && appUrl.hostname !== "localhost" && appUrl.hostname !== "127.0.0.1") {
      throw new ApiError(503, "APP_URL must use HTTPS");
    }
    const genericResponse = json({
      ok: true,
      message: "Se o e-mail estiver cadastrado, você receberá instruções para redefinir sua senha.",
    });
    const now = new Date();
    const nowIso = now.toISOString();
    await db.batch([
      db.prepare(
        "DELETE FROM auth_password_reset_tokens WHERE expires_at <= ? OR used_at IS NOT NULL",
      ).bind(nowIso),
      db.prepare(
        "DELETE FROM auth_password_reset_requests WHERE julianday(last_requested_at) < julianday(?)",
      ).bind(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    ]);
    const emailHash = bytesToBase64Url(await sha256(email));
    const throttle = await db.prepare(
      "SELECT request_count, window_started_at, last_requested_at FROM auth_password_reset_requests WHERE email_hash = ? LIMIT 1",
    ).bind(emailHash).first<{
      request_count: number;
      window_started_at: string;
      last_requested_at: string;
    }>();
    const sameWindow = Boolean(
      throttle && now.getTime() - new Date(throttle.window_started_at).getTime() < 60 * 60 * 1000,
    );
    if (throttle && now.getTime() - new Date(throttle.last_requested_at).getTime() < 60 * 1000) {
      return genericResponse;
    }
    if (sameWindow && throttle.request_count >= 5) return genericResponse;
    await db.prepare(
      `INSERT INTO auth_password_reset_requests (email_hash, request_count, window_started_at, last_requested_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (email_hash) DO UPDATE SET
         request_count = excluded.request_count,
         window_started_at = excluded.window_started_at,
         last_requested_at = excluded.last_requested_at`,
    ).bind(
      emailHash,
      sameWindow && throttle ? throttle.request_count + 1 : 1,
      sameWindow && throttle ? throttle.window_started_at : nowIso,
      nowIso,
    ).run();

    const account = await db.prepare(
      "SELECT id, email FROM auth_users WHERE email = ? COLLATE NOCASE LIMIT 1",
    ).bind(email).first<{ id: string; email: string }>();
    if (!account) return genericResponse;

    const rawToken = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
    const tokenHash = bytesToBase64Url(await sha256(rawToken));
    const tokenId = crypto.randomUUID();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    await db.prepare(
      "INSERT INTO auth_password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)",
    ).bind(tokenId, account.id, tokenHash, expiresAt).run();
    const resetUrl = new URL("/redefinir-senha", appUrl);
    resetUrl.searchParams.set("token", rawToken);
    try {
      await sendPasswordReset(env, account.email, resetUrl.toString());
    } catch (error) {
      console.error("Could not deliver password-reset email:", error);
      await db.prepare(
        "DELETE FROM auth_password_reset_tokens WHERE id = ? AND used_at IS NULL",
      ).bind(tokenId).run();
      return genericResponse;
    }
    await db.prepare(
      "DELETE FROM auth_password_reset_tokens WHERE user_id = ? AND id <> ? AND used_at IS NULL",
    ).bind(account.id, tokenId).run();
    return genericResponse;
  }

  if (path === "/api/auth/password-reset/complete" && request.method === "POST") {
    assertSameOrigin(request);
    const body = await readJson(request);
    const rawToken = typeof body["token"] === "string" ? body["token"] : "";
    const newPassword = typeof body["newPassword"] === "string" ? body["newPassword"] : "";
    if (!/^[A-Za-z0-9_-]{43}$/.test(rawToken)) throw new ApiError(400, "Link inválido ou expirado");
    if (newPassword.length < 12 || newPassword.length > 128) {
      throw new ApiError(400, "A senha deve ter entre 12 e 128 caracteres");
    }
    const tokenHash = bytesToBase64Url(await sha256(rawToken));
    const now = new Date().toISOString();
    const tokenRow = await db.prepare(
      `SELECT user_id FROM auth_password_reset_tokens
       WHERE token_hash = ? AND used_at IS NULL AND expires_at > ? LIMIT 1`,
    ).bind(tokenHash, now).first<{ user_id: string }>();
    if (!tokenRow) throw new ApiError(400, "Link inválido ou expirado");

    const redemptionId = crypto.randomUUID();
    await db.batch([
      db.prepare(
        `UPDATE auth_password_reset_tokens SET used_at = ?, redemption_id = ?
         WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?`,
      ).bind(now, redemptionId, tokenHash, now),
      db.prepare(
        `UPDATE auth_users SET password_hash = ?
         WHERE id = ? AND EXISTS (
           SELECT 1 FROM auth_password_reset_tokens
           WHERE token_hash = ? AND redemption_id = ?
         )`,
      ).bind(await hashPassword(newPassword), tokenRow.user_id, tokenHash, redemptionId),
      db.prepare(
        `DELETE FROM auth_sessions
         WHERE user_id = ? AND EXISTS (
           SELECT 1 FROM auth_password_reset_tokens
           WHERE token_hash = ? AND redemption_id = ?
         )`,
      ).bind(tokenRow.user_id, tokenHash, redemptionId),
    ]);
    const redeemed = await db.prepare(
      "SELECT 1 AS redeemed FROM auth_password_reset_tokens WHERE token_hash = ? AND redemption_id = ? LIMIT 1",
    ).bind(tokenHash, redemptionId).first();
    if (!redeemed) throw new ApiError(400, "Link inválido ou expirado");
    return json({ ok: true });
  }

  if (path === "/api/auth/register" && request.method === "POST") {
    assertSameOrigin(request);
    const body = await readJson(request);
    const email = typeof body["email"] === "string" ? body["email"].trim().toLowerCase() : "";
    const password = typeof body["password"] === "string" ? body["password"] : "";
    const profile = body["profile"] && typeof body["profile"] === "object" ? body["profile"] as Record<string, unknown> : {};
    const nick = typeof profile["nick"] === "string" ? profile["nick"].trim() : "";
    const username = typeof profile["username"] === "string" ? profile["username"].trim().replace(/^@/, "").toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new ApiError(400, "Informe um e-mail válido");
    if (password.length < 12 || password.length > 128) throw new ApiError(400, "A senha deve ter entre 12 e 128 caracteres");
    if (!nick || nick.length > 80 || !/^[a-z0-9_]{3,30}$/.test(username)) throw new ApiError(400, "Perfil inválido");
    if (typeof profile["type"] !== "string" || !TABLE_COLUMNS["profiles"]?.includes("type")) throw new ApiError(400, "Tipo de perfil inválido");

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const profileValues = {
      id,
      nick,
      username,
      type: profile["type"],
      city: typeof profile["city"] === "string" ? profile["city"].slice(0, 120) : "",
      bio: typeof profile["bio"] === "string" ? profile["bio"].slice(0, 2000) : "",
      hue: Number.isInteger(profile["hue"]) ? profile["hue"] as number : 300,
      orientation: typeof profile["orientation"] === "string" ? profile["orientation"] : null,
      latitude: typeof profile["latitude"] === "number" ? profile["latitude"] : null,
      longitude: typeof profile["longitude"] === "number" ? profile["longitude"] : null,
      looking_for: JSON.stringify(Array.isArray(profile["lookingFor"]) ? profile["lookingFor"].filter((item) => typeof item === "string") : []),
    };
    try {
      await db.batch([
        db.prepare("INSERT INTO auth_users (id, email, password_hash) VALUES (?, ?, ?)").bind(id, email, passwordHash),
        db.prepare("INSERT INTO profiles (id, nick, username, type, city, bio, hue, orientation, latitude, longitude, looking_for) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
          .bind(id, profileValues.nick, profileValues.username, profileValues.type, profileValues.city, profileValues.bio, profileValues.hue, profileValues.orientation, profileValues.latitude, profileValues.longitude, profileValues.looking_for),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration failed";
      if (message.includes("auth_users.email") || message.includes("profiles.username")) throw new ApiError(409, "E-mail ou usuário já cadastrado");
      throw error;
    }
    const token = await createSession(db, id);
    return json({ user: { id, email, app_metadata: { role: "user" } } }, 201, {
      "set-cookie": sessionCookie(request, token, SESSION_DAYS * 24 * 60 * 60),
    });
  }

  if (path === "/api/auth/login" && request.method === "POST") {
    assertSameOrigin(request);
    const body = await readJson(request);
    const email = typeof body["email"] === "string" ? body["email"].trim().toLowerCase() : "";
    const password = typeof body["password"] === "string" ? body["password"] : "";
    const emailHash = bytesToBase64Url(await sha256(email));
    const now = new Date();
    const attempt = await db.prepare("SELECT attempts, window_started_at, blocked_until FROM auth_login_attempts WHERE email_hash = ? LIMIT 1")
      .bind(emailHash).first<{ attempts: number; window_started_at: string; blocked_until: string | null }>();
    if (attempt?.blocked_until && new Date(attempt.blocked_until).getTime() > now.getTime()) {
      throw new ApiError(429, "Muitas tentativas. Aguarde antes de tentar novamente.");
    }
    const row = await db.prepare("SELECT id, email, password_hash FROM auth_users WHERE email = ? COLLATE NOCASE LIMIT 1")
      .bind(email).first<{ id: string; email: string; password_hash: string }>();
    if (!row || !(await verifyPassword(password, row.password_hash))) {
      const windowStarted = attempt && now.getTime() - new Date(attempt.window_started_at).getTime() < 15 * 60 * 1000
        ? attempt.window_started_at
        : now.toISOString();
      const attempts = windowStarted === attempt?.window_started_at ? attempt.attempts + 1 : 1;
      const blockedUntil = attempts >= 5 ? new Date(now.getTime() + 15 * 60 * 1000).toISOString() : null;
      await db.prepare(`INSERT INTO auth_login_attempts (email_hash, attempts, window_started_at, blocked_until)
        VALUES (?, ?, ?, ?)
        ON CONFLICT (email_hash) DO UPDATE SET attempts = excluded.attempts,
          window_started_at = excluded.window_started_at, blocked_until = excluded.blocked_until`)
        .bind(emailHash, attempts, windowStarted, blockedUntil).run();
      throw new ApiError(401, "E-mail ou senha incorretos");
    }
    const accountStatus = await db.prepare(
      `SELECT status, suspended_until FROM admin_account_status
       WHERE user_id = ? AND status = 'suspended'
         AND (suspended_until IS NULL OR julianday(suspended_until) > julianday(?))
       LIMIT 1`,
    ).bind(row.id, new Date().toISOString()).first<{ suspended_until: string | null }>();
    if (accountStatus) {
      const detail = accountStatus.suspended_until
        ? `A conta está suspensa até ${accountStatus.suspended_until}`
        : "A conta está suspensa permanentemente";
      throw new ApiError(403, detail);
    }
    await db.prepare("DELETE FROM auth_login_attempts WHERE email_hash = ?").bind(emailHash).run();
    const user = await getUserFromId(db, row.id, row.email);
    const token = await createSession(db, row.id);
    return json({ user: { id: user.id, email: user.email, app_metadata: { role: user.role } } }, 200, {
      "set-cookie": sessionCookie(request, token, SESSION_DAYS * 24 * 60 * 60),
    });
  }

  return json({ error: "Not found" }, 404);
}

async function getUserFromId(db: D1Database, id: string, email: string): Promise<AuthUser> {
  const row = await db.prepare("SELECT COALESCE((SELECT role FROM user_roles WHERE user_id = ? AND role = 'admin' LIMIT 1), 'user') AS role")
    .bind(id).first<{ role: string }>();
  return { id, email, role: row?.role ?? "user" };
}

type Filter = { column: string; operator: string; value: unknown };
type DataQuery = {
  table?: unknown;
  action?: unknown;
  columns?: unknown;
  values?: unknown;
  filters?: unknown;
  order?: unknown;
  limit?: unknown;
  onConflict?: unknown;
  ignoreDuplicates?: unknown;
  count?: unknown;
  head?: unknown;
};

function dbValue(column: string, value: unknown): D1Value {
  if (value === null) return null;
  if (JSON_COLUMNS.has(column) && typeof value !== "string") {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) throw new ApiError(400, `Invalid value for ${column}`);
    return encoded;
  }
  if (typeof value === "string" || typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  throw new ApiError(400, `Invalid value for ${column}`);
}

function decodeRow(row: D1Row): D1Row {
  const result = { ...row };
  for (const column of JSON_COLUMNS) {
    if (typeof result[column] === "string") {
      try { result[column] = JSON.parse(result[column] as string) as unknown; } catch { result[column] = []; }
    }
  }
  for (const column of BOOLEAN_COLUMNS) {
    if (column in result) result[column] = Boolean(result[column]);
  }
  for (const column of ["avatar", "cover"]) {
    const path = result[column];
    if (typeof path === "string" && path.includes("/r2/")) {
      result[column] = `/api/media?key=${encodeURIComponent(path)}`;
    }
  }
  return result;
}

async function supportTicketHandler(request: Request, db: D1Database) {
  if (request.method !== "POST") throw new ApiError(405, "Method not allowed");
  assertSameOrigin(request);
  const body = await readJson(request);
  const name = typeof body["name"] === "string" ? body["name"].trim() : "";
  const email = typeof body["email"] === "string" ? body["email"].trim().toLowerCase() : "";
  const subject = typeof body["subject"] === "string" ? body["subject"].trim() : "";
  const message = typeof body["message"] === "string" ? body["message"].trim() : "";
  const category = typeof body["category"] === "string" ? body["category"] : "general";
  if (!name || name.length > 120) throw new ApiError(400, "Informe um nome válido");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new ApiError(400, "Informe um e-mail válido");
  if (!subject || subject.length > 160) throw new ApiError(400, "Informe um assunto com até 160 caracteres");
  if (message.length < 10 || message.length > 5000) throw new ApiError(400, "A solicitação deve ter entre 10 e 5000 caracteres");
  if (!["general", "account", "billing", "safety"].includes(category)) throw new ApiError(400, "Categoria inválida");

  const rate = await db.prepare(
    "SELECT COUNT(*) AS count FROM support_tickets WHERE email = ? COLLATE NOCASE AND julianday(created_at) > julianday('now', '-1 hour')",
  ).bind(email).first<{ count: number }>();
  if ((rate?.count ?? 0) >= 5) throw new ApiError(429, "Limite de solicitações atingido. Tente novamente mais tarde.");

  const currentUser = await getUser(request, db);
  const id = crypto.randomUUID();
  await db.prepare(
    `INSERT INTO support_tickets (id, user_id, name, email, category, subject, message)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(id, currentUser?.id ?? null, name, email, category, subject, message).run();
  return json({ id, status: "open" }, 201);
}

function requireAdmin(user: AuthUser) {
  if (user.role !== "admin") throw new ApiError(403, "Acesso restrito à administração");
}

async function writeAdminAudit(
  db: D1Database,
  actorId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  details: unknown = {},
) {
  await db.prepare(
    "INSERT INTO admin_audit_log (id, actor_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?, ?)",
  ).bind(crypto.randomUUID(), actorId, action, targetType, targetId, JSON.stringify(details ?? {})).run();
}

function parseAlbum(value: string, field: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string")) throw new Error();
    return parsed as string[];
  } catch {
    throw new ApiError(500, `Invalid ${field} data`);
  }
}

async function adminDashboardHandler(request: Request, db: D1Database, user: AuthUser) {
  if (request.method !== "GET") throw new ApiError(405, "Method not allowed");
  requireAdmin(user);

  const [
    usersCount,
    reportsCount,
    postsCount,
    suspendedCount,
    vipCount,
    freeCount,
    reports,
    users,
    mediaProfiles,
    verificationRequests,
    tickets,
    audit,
    adSetting,
  ] = await Promise.all([
    db.prepare("SELECT COUNT(*) AS count FROM auth_users").first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) AS count FROM reports WHERE status IN ('pending', 'in_review')").first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) AS count FROM posts").first<{ count: number }>(),
    db.prepare(
      `SELECT COUNT(*) AS count FROM admin_account_status
       WHERE status = 'suspended' AND (suspended_until IS NULL OR julianday(suspended_until) > julianday('now'))`,
    ).first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) AS count FROM profiles WHERE vip = 1").first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) AS count FROM profiles WHERE vip = 0").first<{ count: number }>(),
    db.prepare(
      `SELECT r.id, r.reporter_id, reporter.nick AS reporter_name,
              r.reported_profile_id, reported.nick AS reported_name,
              r.post_id, post.author_id AS post_author_id, post.text AS post_text,
              post.image AS post_image, r.reason, r.details, r.status, r.created_at
       FROM reports r
       LEFT JOIN profiles reporter ON reporter.id = r.reporter_id
       LEFT JOIN profiles reported ON reported.id = r.reported_profile_id
       LEFT JOIN posts post ON post.id = r.post_id
       WHERE r.status IN ('pending', 'in_review')
       ORDER BY r.created_at DESC LIMIT 100`,
    ).all<D1Row>(),
    db.prepare(
      `SELECT u.id, u.email, u.created_at, p.nick, p.username, p.avatar, p.vip,
              CASE WHEN s.status = 'suspended'
                    AND (s.suspended_until IS NULL OR julianday(s.suspended_until) > julianday('now'))
                   THEN 'suspended' ELSE 'active' END AS account_status,
              s.reason AS suspension_reason, s.suspended_until,
              EXISTS(SELECT 1 FROM verified_profiles v WHERE v.user_id = u.id) AS verified
       FROM auth_users u
       LEFT JOIN profiles p ON p.id = u.id
       LEFT JOIN admin_account_status s ON s.user_id = u.id
       ORDER BY u.created_at DESC LIMIT 500`,
    ).all<D1Row>(),
    db.prepare(
      "SELECT id, nick, avatar, public_album, private_album FROM profiles ORDER BY updated_at DESC LIMIT 200",
    ).all<D1Row>(),
    db.prepare(
      `SELECT v.id, v.user_id, v.evidence_key, v.status, v.created_at, p.nick, p.username, p.avatar
       FROM verification_requests v JOIN profiles p ON p.id = v.user_id
       WHERE v.status = 'pending' ORDER BY v.created_at ASC LIMIT 100`,
    ).all<D1Row>(),
    db.prepare(
      `SELECT id, user_id, name, email, category, subject, message, status, priority, created_at, updated_at
       FROM support_tickets ORDER BY
         CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
         updated_at DESC LIMIT 100`,
    ).all<D1Row>(),
    db.prepare(
      `SELECT id, actor_id, action, target_type, target_id, details, created_at
       FROM admin_audit_log ORDER BY created_at DESC LIMIT 50`,
    ).all<D1Row>(),
    db.prepare("SELECT value FROM platform_settings WHERE key = 'ads_enabled' LIMIT 1").first<{ value: string }>(),
  ]);

  const media = (mediaProfiles.results ?? []).flatMap((profile) => {
    const entries: D1Row[] = [];
    for (const kind of ["public", "private"] as const) {
      const album = parseAlbum(String(profile[`${kind}_album`] ?? "[]"), `${kind} album`);
      for (const key of album) {
        entries.push({
          profile_id: profile["id"],
          nick: profile["nick"],
          kind,
          key,
          created_at: key.match(/\/r2\/(\d+)-/)?.[1] ?? "",
        });
      }
    }
    return entries;
  }).sort((left, right) => String(right["created_at"]).localeCompare(String(left["created_at"]))).slice(0, 100);

  const ticketRows = tickets.results ?? [];
  const ticketIds = ticketRows.map((ticket) => String(ticket["id"]));
  let ticketMessages: D1Row[] = [];
  if (ticketIds.length) {
    const rows = await db.prepare(
      `SELECT id, ticket_id, author_id, author_role, body, created_at
       FROM support_ticket_messages WHERE ticket_id IN (${ticketIds.map(() => "?").join(",")})
       ORDER BY created_at ASC`,
    ).bind(...ticketIds).all<D1Row>();
    ticketMessages = rows.results ?? [];
  }
  const messagesByTicket = new Map<string, D1Row[]>();
  for (const message of ticketMessages) {
    const ticketId = String(message["ticket_id"]);
    messagesByTicket.set(ticketId, [...(messagesByTicket.get(ticketId) ?? []), message]);
  }

  return json({
    stats: {
      users: usersCount?.count ?? 0,
      reports: reportsCount?.count ?? 0,
      posts: postsCount?.count ?? 0,
      suspended: suspendedCount?.count ?? 0,
      vip: vipCount?.count ?? 0,
      free: freeCount?.count ?? 0,
    },
    reports: reports.results ?? [],
    users: users.results ?? [],
    media,
    verificationRequests: verificationRequests.results ?? [],
    tickets: ticketRows.map((ticket) => ({
      ...ticket,
      replies: messagesByTicket.get(String(ticket["id"])) ?? [],
    })),
    audit: audit.results ?? [],
    adsEnabled: adSetting?.value === "true",
  });
}

async function adminActionHandler(request: Request, db: D1Database, env: WorkerEnv, user: AuthUser) {
  if (request.method !== "POST") throw new ApiError(405, "Method not allowed");
  requireAdmin(user);
  assertSameOrigin(request);
  const body = await readJson(request);
  const action = typeof body["action"] === "string" ? body["action"] : "";
  const now = new Date().toISOString();

  if (action === "report_status") {
    const reportId = typeof body["reportId"] === "string" ? body["reportId"] : "";
    const status = typeof body["status"] === "string" ? body["status"] : "";
    if (!reportId || !["pending", "in_review", "resolved", "dismissed"].includes(status)) {
      throw new ApiError(400, "Invalid report update");
    }
    const result = await db.prepare("SELECT id FROM reports WHERE id = ? LIMIT 1")
      .bind(reportId).first<{ id: string }>();
    if (!result) throw new ApiError(404, "Report not found");
    await db.batch([
      db.prepare("UPDATE reports SET status = ?, updated_at = ? WHERE id = ?").bind(status, now, reportId),
      db.prepare(
        "INSERT INTO admin_audit_log (id, actor_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?, ?)",
      ).bind(crypto.randomUUID(), user.id, `report_${status}`, "report", reportId, "{}"),
    ]);
    return json({ ok: true });
  }

  if (action === "delete_reported_post") {
    const reportId = typeof body["reportId"] === "string" ? body["reportId"] : "";
    const report = await db.prepare("SELECT post_id FROM reports WHERE id = ? LIMIT 1")
      .bind(reportId).first<{ post_id: string | null }>();
    if (!report) throw new ApiError(404, "Report not found");
    if (!report.post_id) throw new ApiError(400, "This report does not reference a post");
    await db.batch([
      db.prepare("UPDATE reports SET post_id = NULL, updated_at = ? WHERE post_id = ?")
        .bind(now, report.post_id),
      db.prepare("UPDATE reports SET status = 'resolved', updated_at = ? WHERE id = ?")
        .bind(now, reportId),
      db.prepare("DELETE FROM posts WHERE id = ?").bind(report.post_id),
      db.prepare(
        "INSERT INTO admin_audit_log (id, actor_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?, ?)",
      ).bind(crypto.randomUUID(), user.id, "post_deleted_from_report", "post", report.post_id, JSON.stringify({ reportId })),
    ]);
    return json({ ok: true });
  }

  if (action === "account_status") {
    const targetId = typeof body["userId"] === "string" ? body["userId"] : "";
    const status = typeof body["status"] === "string" ? body["status"] : "";
    const reason = typeof body["reason"] === "string" ? body["reason"].trim() : "";
    const durationDays = body["durationDays"];
    if (!targetId || !["active", "suspended"].includes(status)) throw new ApiError(400, "Invalid account status");
    if (targetId === user.id && status === "suspended") throw new ApiError(400, "You cannot suspend your own account");
    if (status === "suspended" && (reason.length < 5 || reason.length > 500)) {
      throw new ApiError(400, "Provide a suspension reason between 5 and 500 characters");
    }
    const target = await db.prepare(
      "SELECT 1 AS found FROM auth_users WHERE id = ? LIMIT 1",
    ).bind(targetId).first();
    if (!target) throw new ApiError(404, "User not found");
    const targetAdmin = await db.prepare(
      "SELECT 1 AS found FROM user_roles WHERE user_id = ? AND role = 'admin' LIMIT 1",
    ).bind(targetId).first();
    if (targetAdmin) throw new ApiError(403, "Administrator accounts cannot be suspended here");
    const sourceReportId = typeof body["reportId"] === "string" ? body["reportId"] : "";
    if (sourceReportId) {
      const sourceReport = await db.prepare(
        "SELECT id FROM reports WHERE id = ? AND reported_profile_id = ? LIMIT 1",
      ).bind(sourceReportId, targetId).first();
      if (!sourceReport) throw new ApiError(400, "The report does not target this account");
    }
    const allowedDuration = durationDays === null || durationDays === undefined
      ? null
      : Number(durationDays);
    if (status === "suspended" && allowedDuration !== null && ![1, 7, 30, 90].includes(allowedDuration)) {
      throw new ApiError(400, "Invalid suspension duration");
    }
    const suspendedUntil = status === "active" || allowedDuration === null
      ? null
      : new Date(Date.now() + allowedDuration * 24 * 60 * 60 * 1000).toISOString();
    await db.batch([
      db.prepare(
        `INSERT INTO admin_account_status (user_id, status, reason, suspended_until, updated_by, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (user_id) DO UPDATE SET status = excluded.status, reason = excluded.reason,
           suspended_until = excluded.suspended_until, updated_by = excluded.updated_by,
           updated_at = excluded.updated_at`,
      ).bind(targetId, status, status === "suspended" ? reason : null, suspendedUntil, user.id, now),
      ...(status === "suspended"
        ? [db.prepare("DELETE FROM auth_sessions WHERE user_id = ?").bind(targetId)]
        : []),
      ...(sourceReportId && status === "suspended"
        ? [db.prepare("UPDATE reports SET status = 'resolved', updated_at = ? WHERE id = ?").bind(now, sourceReportId)]
        : []),
      db.prepare(
        "INSERT INTO admin_audit_log (id, actor_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?, ?)",
      ).bind(crypto.randomUUID(), user.id, status === "suspended" ? "user_suspended" : "user_reactivated", "user", targetId, JSON.stringify({ reason, suspendedUntil })),
      ...(sourceReportId && status === "suspended"
        ? [db.prepare(
          "INSERT INTO admin_audit_log (id, actor_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?, ?)",
        ).bind(crypto.randomUUID(), user.id, "report_resolved_by_suspension", "report", sourceReportId, JSON.stringify({ userId: targetId }))]
        : []),
    ]);
    return json({ ok: true, suspendedUntil });
  }

  if (action === "set_vip") {
    const targetId = typeof body["userId"] === "string" ? body["userId"] : "";
    if (!targetId || typeof body["vip"] !== "boolean") throw new ApiError(400, "Invalid VIP update");
    const result = await db.prepare("SELECT id FROM profiles WHERE id = ? LIMIT 1")
      .bind(targetId).first<{ id: string }>();
    if (!result) throw new ApiError(404, "Profile not found");
    await db.batch([
      db.prepare("UPDATE profiles SET vip = ?, updated_at = ? WHERE id = ?")
        .bind(body["vip"] ? 1 : 0, now, targetId),
      db.prepare(
        "INSERT INTO admin_audit_log (id, actor_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?, ?)",
      ).bind(crypto.randomUUID(), user.id, body["vip"] ? "vip_granted" : "vip_removed", "user", targetId, JSON.stringify({ prototype: true })),
    ]);
    return json({ ok: true, prototype: true });
  }

  if (action === "set_verified") {
    const targetId = typeof body["userId"] === "string" ? body["userId"] : "";
    if (!targetId || typeof body["verified"] !== "boolean") throw new ApiError(400, "Invalid verification update");
    const profile = await db.prepare("SELECT id FROM profiles WHERE id = ? LIMIT 1")
      .bind(targetId).first<{ id: string }>();
    if (!profile) throw new ApiError(404, "Profile not found");
    await db.batch([
      body["verified"]
        ? db.prepare(
        "INSERT INTO verified_profiles (user_id, verified_by, verified_at) VALUES (?, ?, ?) ON CONFLICT (user_id) DO UPDATE SET verified_by = excluded.verified_by, verified_at = excluded.verified_at",
        ).bind(targetId, user.id, now)
        : db.prepare("DELETE FROM verified_profiles WHERE user_id = ?").bind(targetId),
      db.prepare(
        "INSERT INTO admin_audit_log (id, actor_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?, ?)",
      ).bind(crypto.randomUUID(), user.id, body["verified"] ? "profile_verified" : "profile_unverified", "user", targetId, "{}"),
    ]);
    return json({ ok: true });
  }

  if (action === "delete_media") {
    const profileId = typeof body["profileId"] === "string" ? body["profileId"] : "";
    const kind = body["kind"] === "public" || body["kind"] === "private" ? body["kind"] : null;
    const key = typeof body["key"] === "string" ? body["key"] : "";
    if (!profileId || !kind || !validMediaKey(key) || !key.startsWith(`${profileId}/${kind}/r2/`)) {
      throw new ApiError(400, "Invalid media reference");
    }
    const column = kind === "public" ? "public_album" : "private_album";
    const profile = await db.prepare(`SELECT ${column} FROM profiles WHERE id = ? LIMIT 1`)
      .bind(profileId).first<{ public_album?: string; private_album?: string }>();
    if (!profile) throw new ApiError(404, "Profile not found");
    const album = parseAlbum(String(profile[column] ?? "[]"), `${kind} album`);
    if (!album.includes(key)) throw new ApiError(404, "Media not found in this album");
    if (!env.MEDIA) throw new ApiError(503, "R2 binding MEDIA is not configured");
    const nextAlbum = album.filter((entry) => entry !== key);
    await db.batch([
      db.prepare(`UPDATE profiles SET ${column} = ?, updated_at = ? WHERE id = ?`)
        .bind(JSON.stringify(nextAlbum), now, profileId),
      db.prepare(
        "INSERT INTO admin_audit_log (id, actor_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?, ?)",
      ).bind(crypto.randomUUID(), user.id, "album_media_deleted", "media", key, JSON.stringify({ profileId, kind })),
    ]);
    let cleanupError: string | null = null;
    try {
      await env.MEDIA.delete(key);
    } catch (error) {
      console.error(`Could not delete moderated media object ${key}:`, error);
      cleanupError = error instanceof Error ? error.message : "R2 object deletion failed";
    }
    return json({ ok: true, cleanupError });
  }

  if (action === "review_verification") {
    const requestId = typeof body["requestId"] === "string" ? body["requestId"] : "";
    const decision = body["decision"] === "approved" || body["decision"] === "rejected" ? body["decision"] : null;
    const note = typeof body["note"] === "string" ? body["note"].trim().slice(0, 500) : "";
    if (!requestId || !decision) throw new ApiError(400, "Invalid verification review");
    if (!env.MEDIA) throw new ApiError(503, "R2 binding MEDIA is not configured");
    const reviewed = await db.prepare(
      `UPDATE verification_requests SET status = ?, review_note = ?, reviewed_by = ?, reviewed_at = ?
       WHERE id = ? AND status = 'pending'
       RETURNING user_id, evidence_key`,
    ).bind(decision, note || null, user.id, now, requestId).first<{ user_id: string; evidence_key: string }>();
    if (!reviewed) throw new ApiError(404, "Pending verification request not found");
    if (decision === "approved") {
      await db.prepare(
        "INSERT INTO verified_profiles (user_id, verified_by, verified_at) VALUES (?, ?, ?) ON CONFLICT (user_id) DO UPDATE SET verified_by = excluded.verified_by, verified_at = excluded.verified_at",
      ).bind(reviewed.user_id, user.id, now).run();
    }
    await writeAdminAudit(db, user.id, `verification_${decision}`, "user", reviewed.user_id, { requestId, note });
    let cleanupError: string | null = null;
    try {
      if (validMediaKey(reviewed.evidence_key)) await env.MEDIA.delete(reviewed.evidence_key);
    } catch (error) {
      console.error(`Could not delete verification evidence for request ${requestId}:`, error);
      cleanupError = error instanceof Error ? error.message : "R2 evidence deletion failed";
    }
    return json({ ok: true, cleanupError });
  }

  if (action === "support_ticket") {
    const ticketId = typeof body["ticketId"] === "string" ? body["ticketId"] : "";
    const status = typeof body["status"] === "string" ? body["status"] : "";
    const priority = typeof body["priority"] === "string" ? body["priority"] : "";
    const reply = typeof body["reply"] === "string" ? body["reply"].trim() : "";
    if (!ticketId || !["open", "in_progress", "resolved", "closed"].includes(status)) {
      throw new ApiError(400, "Invalid ticket status");
    }
    if (!["low", "normal", "high", "urgent"].includes(priority)) throw new ApiError(400, "Invalid ticket priority");
    if (reply.length > 4000) throw new ApiError(400, "Reply is too long");
    const ticket = await db.prepare(
      "SELECT id, email, name FROM support_tickets WHERE id = ? LIMIT 1",
    ).bind(ticketId).first<{ id: string; email: string; name: string }>();
    if (!ticket) throw new ApiError(404, "Support ticket not found");
    const ticketStatements: D1Statement[] = [
      db.prepare("UPDATE support_tickets SET status = ?, priority = ?, updated_at = ? WHERE id = ?")
        .bind(status, priority, now, ticketId),
    ];
    if (reply) {
      ticketStatements.push(db.prepare(
        "INSERT INTO support_ticket_messages (id, ticket_id, author_id, author_role, body) VALUES (?, ?, ?, 'admin', ?)",
      ).bind(crypto.randomUUID(), ticketId, user.id, reply));
    }
    ticketStatements.push(db.prepare(
      "INSERT INTO admin_audit_log (id, actor_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?, ?)",
    ).bind(crypto.randomUUID(), user.id, "support_ticket_updated", "support_ticket", ticketId, JSON.stringify({ status, priority, replied: Boolean(reply) })));
    await db.batch(ticketStatements);
    let emailError: string | null = null;
    if (reply) {
      try {
        await sendSupportTicketReply(env, ticket.email, ticket.name, ticket.id, reply);
      } catch (error) {
        console.error(`Support ticket reply email failed for ticket ${ticket.id}:`, error);
        emailError = error instanceof Error ? error.message : "Email delivery failed";
      }
    }
    return json({ ok: true, emailSent: Boolean(reply) && !emailError, emailError });
  }

  if (action === "set_ads_enabled") {
    if (typeof body["enabled"] !== "boolean") throw new ApiError(400, "Invalid ads setting");
    await db.prepare(
      `INSERT INTO platform_settings (key, value, updated_by, updated_at) VALUES ('ads_enabled', ?, ?, ?)
       ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by,
         updated_at = excluded.updated_at`,
    ).bind(String(body["enabled"]), user.id, now).run();
    await writeAdminAudit(db, user.id, "ads_setting_changed", "platform_setting", "ads_enabled", { enabled: body["enabled"] });
    return json({ ok: true, enabled: body["enabled"], integrated: false });
  }

  throw new ApiError(400, "Unknown administrative action");
}

async function verificationRequestHandler(request: Request, db: D1Database, env: WorkerEnv, user: AuthUser) {
  if (request.method === "GET") {
    const [verified, pending] = await Promise.all([
      db.prepare("SELECT 1 AS verified FROM verified_profiles WHERE user_id = ? LIMIT 1")
        .bind(user.id).first(),
      db.prepare(
        "SELECT id, status, created_at, review_note FROM verification_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
      ).bind(user.id).first<D1Row>(),
    ]);
    return json({ verified: Boolean(verified), request: pending ?? null });
  }
  if (request.method !== "POST") throw new ApiError(405, "Method not allowed");
  assertSameOrigin(request);
  const body = await readJson(request);
  const evidenceKey = typeof body["evidenceKey"] === "string" ? body["evidenceKey"] : "";
  if (!validMediaKey(evidenceKey) || !evidenceKey.startsWith(`${user.id}/private/r2/`)) {
    throw new ApiError(400, "Invalid verification photo");
  }
  const alreadyVerified = await db.prepare(
    "SELECT 1 AS verified FROM verified_profiles WHERE user_id = ? LIMIT 1",
  ).bind(user.id).first();
  if (alreadyVerified) throw new ApiError(409, "This profile is already verified");
  if (!env.MEDIA) throw new ApiError(503, "R2 binding MEDIA is not configured");
  if (!(await env.MEDIA.head(evidenceKey))) throw new ApiError(404, "Verification photo not found");
  const existing = await db.prepare(
    "SELECT 1 AS found FROM verification_requests WHERE user_id = ? AND status = 'pending' LIMIT 1",
  ).bind(user.id).first();
  if (existing) throw new ApiError(409, "You already have a pending verification request");
  const id = crypto.randomUUID();
  await db.batch([
    db.prepare("INSERT INTO verification_requests (id, user_id, evidence_key) VALUES (?, ?, ?)")
      .bind(id, user.id, evidenceKey),
    db.prepare(
      "INSERT INTO admin_audit_log (id, actor_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?, ?)",
    ).bind(crypto.randomUUID(), user.id, "verification_requested", "user", user.id, JSON.stringify({ requestId: id })),
  ]);
  return json({ id, status: "pending" }, 201);
}
function addScope(table: string, action: string, user: AuthUser): { sql: string; values: D1Value[] } {
  if (action !== "select") return { sql: "", values: [] };
  if (table === "notifications") return { sql: "user_id = ?", values: [user.id] };
  if (table === "user_blocks") return { sql: "blocker_id = ?", values: [user.id] };
  if (table === "profile_visits") return { sql: "(visitor_id = ? OR profile_id = ?)", values: [user.id, user.id] };
  if (table === "album_access_requests") return { sql: "(requester_id = ? OR owner_id = ?)", values: [user.id, user.id] };
  if (table === "conversations") {
    return {
      sql: `(user_a = ? OR user_b = ?)
        AND (
          NOT EXISTS (
            SELECT 1 FROM conversation_user_deletions d
            WHERE d.conversation_id = conversations.id AND d.user_id = ?
          )
          OR EXISTS (
            SELECT 1 FROM messages m
            JOIN conversation_user_deletions d
              ON d.conversation_id = m.conversation_id AND d.user_id = ?
            WHERE m.conversation_id = conversations.id
              AND julianday(m.created_at) > julianday(d.deleted_at)
          )
        )`,
      values: [user.id, user.id, user.id, user.id],
    };
  }
  if (table === "messages") {
    return {
      sql: `conversation_id IN (
        SELECT id FROM conversations WHERE user_a = ? OR user_b = ?
      )
      AND julianday(messages.created_at) > julianday(COALESCE((
        SELECT deleted_at FROM conversation_user_deletions
        WHERE conversation_id = messages.conversation_id AND user_id = ?
      ), '1970-01-01 00:00:00'))`,
      values: [user.id, user.id, user.id],
    };
  }
  if (table === "message_attachments") {
    return {
      sql: `message_id IN (
        SELECT m.id FROM messages m
        JOIN conversations c ON c.id = m.conversation_id
        WHERE (c.user_a = ? OR c.user_b = ?)
          AND julianday(m.created_at) > julianday(COALESCE((
            SELECT deleted_at FROM conversation_user_deletions d
            WHERE d.conversation_id = c.id AND d.user_id = ?
          ), '1970-01-01 00:00:00'))
      )`,
      values: [user.id, user.id, user.id],
    };
  }
  if (table === "reports" && user.role !== "admin") return { sql: "reporter_id = ?", values: [user.id] };
  if (table === "user_roles") return { sql: "user_id = ?", values: [user.id] };
  return { sql: "", values: [] };
}

function assertMutationScope(table: string, action: string, row: D1Row, user: AuthUser) {
  const forbidden = () => { throw new ApiError(403, "Operation not permitted"); };
  if (table === "profiles") {
    if ((action === "insert" || action === "upsert" || action === "update") && row["id"] !== undefined && row["id"] !== user.id) forbidden();
    if (["insert", "upsert", "update"].includes(action) && "vip" in row) forbidden();
  } else if (table === "posts" && (action === "insert" || action === "upsert" || action === "update") && row["author_id"] !== undefined && row["author_id"] !== user.id) forbidden();
  else if (table === "follows" && ["insert", "upsert"].includes(action) && row["follower_id"] !== user.id) forbidden();
  else if (table === "profile_likes" && ["insert", "upsert"].includes(action) && row["liker_id"] !== user.id) forbidden();
  else if (table === "profile_visits" && ["insert", "upsert"].includes(action) && row["visitor_id"] !== user.id) forbidden();
  else if (table === "notifications" && (action === "insert" || action === "upsert") && row["actor_id"] !== user.id) forbidden();
  else if (table === "event_attendees" && ["insert", "upsert"].includes(action) && row["user_id"] !== user.id) forbidden();
  else if (table === "user_blocks" && ["insert", "upsert"].includes(action) && row["blocker_id"] !== user.id) forbidden();
  else if (table === "post_likes" && ["insert", "upsert"].includes(action) && row["user_id"] !== user.id) forbidden();
  else if (table === "post_comments" && ["insert", "upsert"].includes(action) && row["user_id"] !== user.id) forbidden();
  else if (table === "reports" && (action === "insert" || action === "upsert") && row["reporter_id"] !== user.id) forbidden();
  else if (table === "album_access_requests" && (action === "insert" || action === "upsert") && row["requester_id"] !== user.id) forbidden();
  else if (table === "messages" && (action === "insert" || action === "upsert") && row["sender_id"] !== user.id) forbidden();
  else if (table === "conversations" && (action === "insert" || action === "upsert") && row["user_a"] !== user.id) forbidden();
  else if (table === "user_roles" && user.role !== "admin") forbidden();
  else if (table === "events" && user.role !== "admin" && action !== "select") forbidden();

  const immutableColumns: Record<string, string[]> = {
    follows: ["follower_id"], profile_likes: ["liker_id"], profile_visits: ["visitor_id"],
    album_access_requests: ["requester_id", "owner_id"], notifications: ["user_id", "actor_id"],
    conversations: ["user_a", "user_b"], messages: ["sender_id", "conversation_id"],
    event_attendees: ["user_id", "event_id"], post_likes: ["user_id", "post_id"],
    post_comments: ["user_id", "post_id"], user_blocks: ["blocker_id", "blocked_id"],
    reports: ["reporter_id"], message_attachments: ["message_id", "storage_path"],
  };
  if (action === "update" && immutableColumns[table]?.some((column) => column in row)) forbidden();

  if (table === "reports" && action !== "insert" && user.role !== "admin") forbidden();
  if (table === "album_access_requests" && action === "update" && row["status"] !== undefined && !["approved", "rejected"].includes(String(row["status"]))) forbidden();
  if (!["profiles", "posts", "post_likes", "post_comments", "follows", "profile_likes", "profile_visits", "album_access_requests", "notifications", "conversations", "messages", "events", "event_attendees", "user_roles", "user_blocks", "reports", "message_attachments"].includes(table)) forbidden();
}

function parseFilters(raw: unknown, columns: readonly string[]) {
  if (!Array.isArray(raw)) throw new ApiError(400, "Invalid filters");
  return raw.map((item) => {
    if (!item || typeof item !== "object") throw new ApiError(400, "Invalid filter");
    const filter = item as Filter;
    if (!columns.includes(filter.column) || !["eq", "neq", "is", "in"].includes(filter.operator)) throw new ApiError(400, "Invalid filter");
    return filter;
  });
}

function filterSql(filters: Filter[], columns: readonly string[]) {
  const clauses: string[] = [];
  const values: D1Value[] = [];
  for (const filter of filters) {
    if (!columns.includes(filter.column)) throw new ApiError(400, "Invalid filter column");
    if (filter.operator === "in") {
      if (!Array.isArray(filter.value) || filter.value.length > 100) throw new ApiError(400, "Invalid IN filter");
      if (!filter.value.length) clauses.push("0 = 1");
      else {
        clauses.push(`${filter.column} IN (${filter.value.map(() => "?").join(", ")})`);
        values.push(...filter.value.map((value) => dbValue(filter.column, value)));
      }
    } else if (filter.operator === "is" && filter.value === null) {
      clauses.push(`${filter.column} IS NULL`);
    } else {
      clauses.push(`${filter.column} ${filter.operator === "neq" ? "<>" : "="} ?`);
      values.push(dbValue(filter.column, filter.value));
    }
  }
  return { clauses, values };
}

async function dataHandler(request: Request, db: D1Database, user: AuthUser) {
  if (request.method !== "POST") throw new ApiError(405, "Method not allowed");
  assertSameOrigin(request);
  const query = await readJson(request) as DataQuery;
  const table = typeof query.table === "string" ? query.table : "";
  const columns = TABLE_COLUMNS[table];
  const action = typeof query.action === "string" ? query.action : "select";
  if (!columns || !["select", "insert", "upsert", "update", "delete"].includes(action)) throw new ApiError(400, "Unknown table or operation");
  if (table === "events" && user.role !== "admin" && action !== "select") throw new ApiError(403, "Operation not permitted");

  const filters = parseFilters(query.filters ?? [], columns);
  const filterParts = filterSql(filters, columns);
  const scope = addScope(table, action, user);
  const clauses = [...filterParts.clauses, ...(scope.sql ? [scope.sql] : [])];
  const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
  const whereValues = [...filterParts.values, ...scope.values];

  if (action === "select") {
    const rawColumns = typeof query.columns === "string" ? query.columns : "*";
    const requested: string[] = rawColumns.includes("profiles!") ? ["*"] : rawColumns.split(",").map((column) => column.trim());
    const invalidSelection = requested.some((column) =>
      !columns.includes(column) && !(table === "profiles" && column === "verified"),
    );
    if (requested[0] !== "*" && invalidSelection) throw new ApiError(400, "Invalid selected column");
    const selectedColumns = requested.filter((column) => column !== "verified");
    const hasVirtualVerified = table === "profiles" && (requested[0] === "*" || requested.includes("verified"));
    const projectionBase = requested[0] === "*"
      ? (table === "profiles" ? "profiles.*" : "*")
      : selectedColumns.join(", ");
    const projection = `${projectionBase}${hasVirtualVerified
      ? `${projectionBase ? ", " : ""}EXISTS(SELECT 1 FROM verified_profiles v WHERE v.user_id = profiles.id) AS verified`
      : ""}`;
    const orders = Array.isArray(query.order) ? query.order as { column?: unknown; ascending?: unknown }[] : [];
    const orderBy = orders.map((order) => {
      if (typeof order.column !== "string" || !columns.includes(order.column)) throw new ApiError(400, "Invalid order column");
      return `${order.column} ${order.ascending === false ? "DESC" : "ASC"}`;
    }).join(", ");
    const limit = typeof query.limit === "number" ? Math.min(500, Math.max(0, Math.trunc(query.limit))) : 500;
    const countRow = query.count === "exact"
      ? await db.prepare(`SELECT COUNT(*) AS count FROM ${table}${where}`).bind(...whereValues).first<{ count: number }>()
      : null;
    if (query.head === true) return json({ data: null, count: countRow?.count ?? null, error: null });
    const rows = await db.prepare(`SELECT ${projection} FROM ${table}${where}${orderBy ? ` ORDER BY ${orderBy}` : ""} LIMIT ?`)
      .bind(...whereValues, limit).all<D1Row>();
    let data = (rows.results ?? []).map(decodeRow);
    if (table === "posts" && rawColumns.includes("profiles!")) {
      data = await Promise.all(data.map(async (post) => {
        const author = await db.prepare(
          "SELECT profiles.*, EXISTS(SELECT 1 FROM verified_profiles v WHERE v.user_id = profiles.id) AS verified FROM profiles WHERE id = ? LIMIT 1",
        ).bind(String(post["author_id"])).first<D1Row>();
        return { ...post, profiles: author ? decodeRow(author) : null };
      }));
    }
    return json({ data, count: countRow?.count ?? null, error: null });
  }

  if (action === "insert" || action === "upsert") {
    const entries = Array.isArray(query.values) ? query.values : [query.values];
    if (!entries.length || entries.length > 100) throw new ApiError(400, "Invalid insert data");
    const insertedIds: string[] = [];
    for (const entry of entries) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new ApiError(400, "Invalid row");
      const row = { ...(entry as D1Row) };
      assertMutationScope(table, action, row, user);
      if (table === "conversations") {
        if (row["user_a"] === row["user_b"]) throw new ApiError(400, "A conversation requires two different profiles");
        const profile = await db.prepare("SELECT vip FROM profiles WHERE id = ? LIMIT 1").bind(user.id).first<{ vip: number }>();
        if (!profile?.vip) throw new ApiError(403, "Only VIP members can start conversations");
      }
      if (table === "messages") {
        row["created_at"] = new Date().toISOString();
        const conversation = await db.prepare("SELECT user_a, user_b FROM conversations WHERE id = ? AND (user_a = ? OR user_b = ?) LIMIT 1")
          .bind(String(row["conversation_id"] ?? ""), user.id, user.id).first<{ user_a: string; user_b: string }>();
        if (!conversation || row["sender_id"] !== user.id) throw new ApiError(403, "Not a participant in this conversation");
        const profile = await db.prepare("SELECT vip FROM profiles WHERE id = ? LIMIT 1").bind(user.id).first<{ vip: number }>();
        if (!profile) throw new ApiError(403, "Profile not found");
        if (!profile.vip) await assertFreeCanContinueConversation(db, String(row["conversation_id"]), user.id);
      }
      if (table === "album_access_requests") {
        const profile = await db.prepare("SELECT vip FROM profiles WHERE id = ? LIMIT 1").bind(user.id).first<{ vip: number }>();
        if (!profile?.vip) throw new ApiError(403, "Only VIP members can request private album access");
      }
      if (table === "message_attachments") {
        const profile = await db.prepare("SELECT vip, private_album FROM profiles WHERE id = ? LIMIT 1")
          .bind(user.id).first<{ vip: number; private_album: string }>();
        if (!profile?.vip) throw new ApiError(403, "Only VIP members can send private photo attachments");
        const message = await db.prepare("SELECT 1 AS allowed FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE m.id = ? AND m.sender_id = ? AND (c.user_a = ? OR c.user_b = ?) LIMIT 1")
          .bind(String(row["message_id"] ?? ""), user.id, user.id, user.id).first();
        const storagePath = typeof row["storage_path"] === "string" ? row["storage_path"] : "";
        let privateAlbum: unknown;
        try {
          privateAlbum = JSON.parse(profile.private_album ?? "[]") as unknown;
        } catch {
          throw new ApiError(500, "Private album data is invalid");
        }
        if (
          !message
          || !validMediaKey(storagePath)
          || !storagePath.startsWith(`${user.id}/private/r2/`)
          || !Array.isArray(privateAlbum)
          || !privateAlbum.includes(storagePath)
        ) {
          throw new ApiError(403, "Invalid message attachment");
        }
      }
      const idColumn = TABLE_IDS[table]!;
      if (row[idColumn] === undefined) row[idColumn] = crypto.randomUUID();
      const keys = Object.keys(row).filter((key) => columns.includes(key));
      if (!keys.length || keys.length !== Object.keys(row).length) throw new ApiError(400, "Invalid insert column");
      const conflictColumns = action === "upsert" && typeof query.onConflict === "string" ? query.onConflict.split(",").map((item) => item.trim()) : [idColumn];
      if (conflictColumns.some((column) => !columns.includes(column))) throw new ApiError(400, "Invalid conflict column");
      const updates = keys.filter((key) => !conflictColumns.includes(key));
      const conflictSql = action !== "upsert" ? "" : query.ignoreDuplicates === true
        ? ` ON CONFLICT (${conflictColumns.join(",")}) DO NOTHING`
        : ` ON CONFLICT (${conflictColumns.join(",")}) DO UPDATE SET ${updates.length ? updates.map((key) => `${key}=excluded.${key}`).join(",") : `${conflictColumns[0]}=excluded.${conflictColumns[0]}`}`;
      await db.prepare(`INSERT INTO ${table} (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})${conflictSql}`)
        .bind(...keys.map((key) => dbValue(key, row[key]))).run();
      insertedIds.push(String(row[idColumn]));
      if (table === "post_likes" && typeof row["post_id"] === "string") {
        await db.prepare("UPDATE posts SET likes = (SELECT COUNT(*) FROM post_likes WHERE post_id = ?) WHERE id = ?")
          .bind(row["post_id"], row["post_id"]).run();
      }
      if (table === "post_comments" && typeof row["post_id"] === "string") {
        await db.prepare("UPDATE posts SET comments = (SELECT COUNT(*) FROM post_comments WHERE post_id = ?) WHERE id = ?")
          .bind(row["post_id"], row["post_id"]).run();
      }
    }
    const idColumn = TABLE_IDS[table]!;
    const selected = await db.prepare(`SELECT * FROM ${table} WHERE ${idColumn} IN (${insertedIds.map(() => "?").join(",")})`)
      .bind(...insertedIds).all<D1Row>();
    return json({ data: (selected.results ?? []).map(decodeRow), error: null });
  }

  const values = query.values && typeof query.values === "object" && !Array.isArray(query.values) ? query.values as D1Row : {};
  assertMutationScope(table, action, values, user);
  if (table === "reports" && action !== "insert") throw new ApiError(403, "Use the administrative moderation endpoint");
  if (table === "profiles" && action === "update" && "vip" in values) {
    throw new ApiError(403, "VIP status can only be changed through the administrative endpoint");
  }
  if (table === "reports" && user.role !== "admin") throw new ApiError(403, "Operation not permitted");
  const mutationScope = action === "update" ? ({
    profiles: user.role === "admin" ? null : ["id = ?", [user.id]],
    posts: user.role === "admin" ? null : ["author_id = ?", [user.id]],
    notifications: ["user_id = ?", [user.id]],
    reports: user.role === "admin" ? null : ["reporter_id = ?", [user.id]],
    album_access_requests: ["owner_id = ?", [user.id]],
    event_attendees: ["user_id = ?", [user.id]],
  } as Record<string, [string, D1Value[]] | null>)[table] : action === "delete" ? ({
    profiles: user.role === "admin" ? null : ["id = ?", [user.id]],
    posts: user.role === "admin" ? null : ["author_id = ?", [user.id]],
    post_likes: ["user_id = ?", [user.id]],
    post_comments: ["user_id = ?", [user.id]],
    follows: ["follower_id = ?", [user.id]],
    profile_likes: ["liker_id = ?", [user.id]],
    profile_visits: ["visitor_id = ?", [user.id]],
    notifications: ["user_id = ?", [user.id]],
    user_blocks: ["blocker_id = ?", [user.id]],
    event_attendees: ["user_id = ?", [user.id]],
    album_access_requests: ["requester_id = ?", [user.id]],
  } as Record<string, [string, D1Value[]] | null>)[table] : null;
  if (!mutationScope && user.role !== "admin" && ["update", "delete"].includes(action)) throw new ApiError(403, "Operation not permitted");
  const scopedWhere = mutationScope ? `${where ? `${where} AND ` : " WHERE "}${mutationScope[0]}` : where;
  const scopedValues = [...whereValues, ...(mutationScope?.[1] ?? [])];

  if (action === "update") {
    const updateValues = { ...values };
    if ("updated_at" in columns && !("updated_at" in updateValues)) updateValues["updated_at"] = new Date().toISOString();
    const keys = Object.keys(updateValues).filter((key) => columns.includes(key));
    if (!keys.length || keys.length !== Object.keys(updateValues).length) throw new ApiError(400, "Invalid update column");
    const updated = await db.prepare(`UPDATE ${table} SET ${keys.map((key) => `${key} = ?`).join(", ")}${scopedWhere} RETURNING *`)
      .bind(...keys.map((key) => dbValue(key, updateValues[key])), ...scopedValues).all<D1Row>();
    return json({ data: (updated.results ?? []).map(decodeRow), error: null });
  }
  const deleted = await db.prepare(`DELETE FROM ${table}${scopedWhere} RETURNING *`).bind(...scopedValues).all<D1Row>();
  const affectedPostIds = new Set((deleted.results ?? [])
    .map((row) => row["post_id"])
    .filter((postId): postId is string => typeof postId === "string"));
  for (const postId of affectedPostIds) {
    if (table === "post_likes") {
      await db.prepare("UPDATE posts SET likes = (SELECT COUNT(*) FROM post_likes WHERE post_id = ?) WHERE id = ?")
        .bind(postId, postId).run();
    }
    if (table === "post_comments") {
      await db.prepare("UPDATE posts SET comments = (SELECT COUNT(*) FROM post_comments WHERE post_id = ?) WHERE id = ?")
        .bind(postId, postId).run();
    }
  }
  return json({ data: (deleted.results ?? []).map(decodeRow), error: null });
}

function validMediaKey(key: string) {
  return /^[a-zA-Z0-9_-]+\/(public|private)\/r2\/[a-zA-Z0-9-]+\.webp$/i.test(key);
}

async function mediaHandler(request: Request, db: D1Database, env: WorkerEnv, user: AuthUser) {
  const bucket = env.MEDIA;
  if (!bucket) throw new ApiError(503, "R2 binding MEDIA is not configured");
  const key = new URL(request.url).searchParams.get("key") ?? "";
  if (!validMediaKey(key)) throw new ApiError(400, "Invalid media key");
  const [ownerId = "", kind = ""] = key.split("/");
  if (request.method === "PUT" || request.method === "DELETE") {
    assertSameOrigin(request);
    if (ownerId !== user.id) throw new ApiError(403, "Not authorized to write this media");
    if (request.method === "DELETE") {
      await bucket.delete(key);
      return json({ deleted: true });
    }
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType !== "image/webp") throw new ApiError(400, "Unsupported media type");
    const body = await request.arrayBuffer();
    if (body.byteLength > 100 * 1024 * 1024) throw new ApiError(400, "Image is too large");
    await bucket.put(key, body, { httpMetadata: { contentType, cacheControl: "private, max-age=3300" } });
    return json({ key });
  }
  if (request.method !== "GET") throw new ApiError(405, "Method not allowed");
  if (kind === "private" && ownerId !== user.id) {
    if (user.role === "admin") {
      const object = await bucket.get(key);
      if (!object) return new Response("Not found", { status: 404 });
      const headers = new Headers();
      object.writeHttpMetadata?.(headers);
      headers.set("cache-control", "private, no-store");
      headers.set("vary", "Cookie");
      headers.set("x-content-type-options", "nosniff");
      const body = await new Response(object.body).arrayBuffer();
      headers.set("content-length", String(body.byteLength));
      return new Response(body, { headers });
    }
    const viewer = await db.prepare("SELECT vip FROM profiles WHERE id = ?").bind(user.id).first<{ vip: number }>();
    const approved = viewer?.vip ? await db.prepare("SELECT 1 AS allowed FROM album_access_requests WHERE requester_id = ? AND owner_id = ? AND status = 'approved' LIMIT 1")
      .bind(user.id, ownerId).first() : null;
    const shared = await db.prepare("SELECT 1 AS allowed FROM message_attachments a JOIN messages m ON m.id = a.message_id JOIN conversations c ON c.id = m.conversation_id WHERE a.storage_path = ? AND (c.user_a = ? OR c.user_b = ?) LIMIT 1")
      .bind(key, user.id, user.id).first();
    if (!(approved || shared)) throw new ApiError(403, "Not authorized to read this private media");
  }
  const object = await bucket.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata?.(headers);
  headers.set("cache-control", kind === "private" ? "private, no-store" : "private, max-age=300");
  headers.set("vary", "Cookie");
  headers.set("x-content-type-options", "nosniff");
  const body = await new Response(object.body).arrayBuffer();
  headers.set("content-length", String(body.byteLength));
  return new Response(body, { headers });
}

async function activatePrototypeVip(request: Request, db: D1Database, user: AuthUser) {
  if (request.method !== "POST") throw new ApiError(405, "Method not allowed");
  assertSameOrigin(request);
  const profile = await db.prepare(
    "UPDATE profiles SET vip = 1, updated_at = ? WHERE id = ? RETURNING id, vip",
  ).bind(new Date().toISOString(), user.id).first<{ id: string; vip: number }>();
  if (!profile) throw new ApiError(404, "Profile not found");
  return json({ data: decodeRow(profile), simulated: true });
}

async function chatUnreadHandler(request: Request, db: D1Database, user: AuthUser, path: string) {
  if (path === "/api/chat/unread") {
    if (request.method !== "GET") throw new ApiError(405, "Method not allowed");
    const unread = await db.prepare(
      `SELECT c.id AS conversation_id, COUNT(m.id) AS unread_count
       FROM conversations c
       LEFT JOIN conversation_read_states r
         ON r.conversation_id = c.id AND r.user_id = ?
       JOIN messages m
         ON m.conversation_id = c.id
        AND m.sender_id <> ?
        AND julianday(m.created_at) > julianday(COALESCE(r.last_read_at, '1970-01-01 00:00:00'))
       WHERE c.user_a = ? OR c.user_b = ?
       GROUP BY c.id`,
    ).bind(user.id, user.id, user.id, user.id).all<{ conversation_id: string; unread_count: number }>();
    const conversations = unread.results ?? [];
    return json({
      conversations,
      total: conversations.reduce((total, conversation) => total + conversation.unread_count, 0),
    });
  }

  if (path === "/api/chat/read") {
    if (request.method !== "POST") throw new ApiError(405, "Method not allowed");
    assertSameOrigin(request);
    const body = await readJson(request);
    const conversationId = typeof body["conversation_id"] === "string" ? body["conversation_id"] : "";
    if (!conversationId) throw new ApiError(400, "Conversation ID is required");
    const conversation = await db.prepare(
      "SELECT 1 AS allowed FROM conversations WHERE id = ? AND (user_a = ? OR user_b = ?) LIMIT 1",
    ).bind(conversationId, user.id, user.id).first();
    if (!conversation) throw new ApiError(403, "Not a participant in this conversation");
    await db.prepare(
      `INSERT INTO conversation_read_states (conversation_id, user_id, last_read_at)
       VALUES (?, ?, ?)
       ON CONFLICT (conversation_id, user_id)
       DO UPDATE SET last_read_at = excluded.last_read_at`,
    ).bind(conversationId, user.id, new Date().toISOString()).run();
    return json({ conversation_id: conversationId, read: true });
  }

  throw new ApiError(404, "Not found");
}

async function chatDeleteHandler(request: Request, db: D1Database, user: AuthUser) {
  if (request.method !== "POST") throw new ApiError(405, "Method not allowed");
  assertSameOrigin(request);
  const body = await readJson(request);
  const conversationId = typeof body["conversation_id"] === "string" ? body["conversation_id"] : "";
  if (!conversationId) throw new ApiError(400, "Conversation ID is required");

  const conversation = await db.prepare(
    "SELECT 1 AS allowed FROM conversations WHERE id = ? AND (user_a = ? OR user_b = ?) LIMIT 1",
  ).bind(conversationId, user.id, user.id).first();
  if (!conversation) throw new ApiError(404, "Conversation not found");

  const deletedAt = new Date().toISOString();
  await db.batch([
    db.prepare(
      `INSERT INTO conversation_user_deletions (conversation_id, user_id, deleted_at)
       VALUES (?, ?, ?)
       ON CONFLICT (conversation_id, user_id)
       DO UPDATE SET deleted_at = excluded.deleted_at`,
    ).bind(conversationId, user.id, deletedAt),
    db.prepare(
      `INSERT INTO conversation_read_states (conversation_id, user_id, last_read_at)
       VALUES (?, ?, ?)
       ON CONFLICT (conversation_id, user_id)
       DO UPDATE SET last_read_at = excluded.last_read_at`,
    ).bind(conversationId, user.id, deletedAt),
  ]);
  return json({ conversation_id: conversationId, deleted: true });
}

async function assertFreeCanContinueConversation(
  db: D1Database,
  conversationId: string,
  userId: string,
) {
  const firstMessage = await db.prepare(
    `SELECT m.sender_id, p.vip
     FROM messages m
     JOIN profiles p ON p.id = m.sender_id
     WHERE m.conversation_id = ?
     ORDER BY m.created_at ASC, m.rowid ASC
     LIMIT 1`,
  ).bind(conversationId).first<{ sender_id: string; vip: number }>();
  if (!firstMessage || firstMessage.sender_id === userId || !firstMessage.vip) {
    throw new ApiError(403, "Wait for a VIP member to start the conversation");
  }
}

async function chatConversationHandler(request: Request, db: D1Database, user: AuthUser) {
  if (request.method !== "POST") throw new ApiError(405, "Method not allowed");
  assertSameOrigin(request);
  const body = await readJson(request);
  const partnerId = typeof body["partner_id"] === "string" ? body["partner_id"] : "";
  if (!partnerId || partnerId === user.id) throw new ApiError(400, "Invalid conversation partner");

  const [profile, existingConversation] = await Promise.all([
    db.prepare("SELECT vip FROM profiles WHERE id = ? LIMIT 1")
      .bind(user.id).first<{ vip: number }>(),
    db.prepare(
      "SELECT id, user_a, user_b FROM conversations WHERE (user_a = ? AND user_b = ?) OR (user_a = ? AND user_b = ?) LIMIT 1",
    ).bind(user.id, partnerId, partnerId, user.id).first<{ id: string; user_a: string; user_b: string }>(),
  ]);
  if (!profile) throw new ApiError(404, "Profile not found");
  let conversation = existingConversation;

  if (!conversation) {
    if (!profile.vip) throw new ApiError(403, "Only VIP members can start conversations");
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    try {
      await db.prepare(
        "INSERT INTO conversations (id, user_a, user_b, created_at, updated_at, last_message_at) VALUES (?, ?, ?, ?, ?, ?)",
      ).bind(id, user.id, partnerId, now, now, now).run();
      conversation = { id, user_a: user.id, user_b: partnerId };
    } catch (error) {
      conversation = await db.prepare(
        "SELECT id, user_a, user_b FROM conversations WHERE (user_a = ? AND user_b = ?) OR (user_a = ? AND user_b = ?) LIMIT 1",
      ).bind(user.id, partnerId, partnerId, user.id).first<{ id: string; user_a: string; user_b: string }>();
      if (!conversation) throw error;
    }
  }

  if (!profile.vip) {
    await assertFreeCanContinueConversation(db, conversation.id, user.id);
  }

  const [deletion] = await Promise.all([
    db.prepare(
      "SELECT deleted_at FROM conversation_user_deletions WHERE conversation_id = ? AND user_id = ? LIMIT 1",
    ).bind(conversation.id, user.id).first<{ deleted_at: string }>(),
    db.prepare(
      `INSERT INTO conversation_read_states (conversation_id, user_id, last_read_at)
       VALUES (?, ?, ?)
       ON CONFLICT (conversation_id, user_id)
       DO UPDATE SET last_read_at = excluded.last_read_at`,
    ).bind(conversation.id, user.id, new Date().toISOString()).run(),
  ]);
  const messageHistoryFilter = deletion ? "AND julianday(m.created_at) > julianday(?)" : "";
  const messageValues = deletion ? [conversation.id, deletion.deleted_at] : [conversation.id];
  const messagesResult = await db.prepare(
    `SELECT m.*,
       COALESCE((
         SELECT json_group_array(json_object(
           'id', a.id,
           'message_id', a.message_id,
           'storage_path', a.storage_path,
           'created_at', a.created_at
         ))
         FROM message_attachments a WHERE a.message_id = m.id
       ), '[]') AS attachments_json
     FROM messages m
     WHERE m.conversation_id = ? ${messageHistoryFilter}
     ORDER BY m.created_at ASC`,
  ).bind(...messageValues).all<D1Row>();

  const messages = (messagesResult.results ?? []).map((row) => {
    let attachments: unknown = [];
    try {
      attachments = JSON.parse(String(row["attachments_json"] ?? "[]")) as unknown;
    } catch (error) {
      console.error("Failed to decode chat attachments:", error);
      throw new ApiError(500, "Failed to load conversation attachments");
    }
    const { attachments_json: _attachmentsJson, ...message } = row;
    return { ...message, attachments };
  });
  return json({ conversation, messages });
}

async function chatSendHandler(request: Request, db: D1Database, env: WorkerEnv, user: AuthUser) {
  if (request.method !== "POST") throw new ApiError(405, "Method not allowed");
  assertSameOrigin(request);
  const body = await readJson(request);
  const conversationId = typeof body["conversation_id"] === "string" ? body["conversation_id"] : "";
  const text = typeof body["body"] === "string" ? body["body"] : "";
  const attachmentPaths = body["storage_paths"] ?? [];
  if (!conversationId || !Array.isArray(attachmentPaths) || attachmentPaths.length > 10) {
    throw new ApiError(400, "Invalid message data");
  }
  if (!text.trim() && attachmentPaths.length === 0) throw new ApiError(400, "Message cannot be empty");
  if (attachmentPaths.some((path) => typeof path !== "string")) throw new ApiError(400, "Invalid attachment path");

  const [conversation, profile] = await Promise.all([
    db.prepare("SELECT user_a, user_b FROM conversations WHERE id = ? AND (user_a = ? OR user_b = ?) LIMIT 1")
      .bind(conversationId, user.id, user.id).first<{ user_a: string; user_b: string }>(),
    db.prepare("SELECT vip, private_album FROM profiles WHERE id = ? LIMIT 1").bind(user.id).first<{ vip: number; private_album: string }>(),
  ]);
  if (!conversation || !profile) throw new ApiError(403, "Not a participant in this conversation");
  if (!profile.vip) await assertFreeCanContinueConversation(db, conversationId, user.id);

  const paths = attachmentPaths as string[];
  if (paths.length && !profile.vip) throw new ApiError(403, "Only VIP members can send private photo attachments");
  let privateAlbum: unknown;
  try {
    privateAlbum = JSON.parse(profile.private_album ?? "[]") as unknown;
  } catch {
    throw new ApiError(500, "Private album data is invalid");
  }
  for (const path of paths) {
    if (!validMediaKey(path) || !path.startsWith(`${user.id}/private/r2/`)) {
      throw new ApiError(403, "Invalid private photo attachment");
    }
    if (!Array.isArray(privateAlbum) || !privateAlbum.includes(path)) {
      throw new ApiError(403, "Photo is not in your private album");
    }
  }
  if (paths.length) {
    if (!env.MEDIA) throw new ApiError(503, "R2 binding MEDIA is not configured");
    const objects = await Promise.all(paths.map((path) => env.MEDIA!.head(path)));
    if (objects.some((object) => !object)) throw new ApiError(404, "A selected photo no longer exists");
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const messageBody = text.trim() || (paths.length === 1 ? "Enviou uma foto privada" : "Enviou fotos privadas");
  const attachments = paths.map((storagePath) => ({
    id: crypto.randomUUID(),
    message_id: id,
    storage_path: storagePath,
    created_at: createdAt,
  }));
  const statements = [
    db.prepare("INSERT INTO messages (id, conversation_id, sender_id, body, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(id, conversationId, user.id, messageBody, createdAt),
    ...attachments.map((attachment) => db.prepare(
      "INSERT INTO message_attachments (id, message_id, storage_path, created_at) VALUES (?, ?, ?, ?)",
    ).bind(attachment.id, id, attachment.storage_path, createdAt)),
    db.prepare(
      "UPDATE conversations SET last_message = ?, last_message_at = ?, updated_at = ? WHERE id = ?",
    ).bind(messageBody, createdAt, createdAt, conversationId),
  ];
  await db.batch(statements);
  return json({
    message: { id, conversation_id: conversationId, sender_id: user.id, body: messageBody, created_at: createdAt, attachments },
  });
}

async function emailPreferencesHandler(request: Request, db: D1Database, user: AuthUser) {
  if (request.method === "GET") {
    const preference = await db.prepare(
      "SELECT daily_activity_enabled FROM email_preferences WHERE user_id = ? LIMIT 1",
    ).bind(user.id).first<{ daily_activity_enabled: number }>();
    return json({ dailyActivityEnabled: preference?.daily_activity_enabled !== 0 });
  }
  if (request.method !== "POST") throw new ApiError(405, "Method not allowed");
  assertSameOrigin(request);
  const body = await readJson(request);
  if (typeof body["dailyActivityEnabled"] !== "boolean") {
    throw new ApiError(400, "Invalid email preference");
  }
  await db.prepare(
    `INSERT INTO email_preferences (user_id, daily_activity_enabled, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT (user_id) DO UPDATE SET
       daily_activity_enabled = excluded.daily_activity_enabled,
       updated_at = excluded.updated_at`,
  ).bind(user.id, body["dailyActivityEnabled"] ? 1 : 0, new Date().toISOString()).run();
  return json({ dailyActivityEnabled: body["dailyActivityEnabled"] });
}

type DigestActivityRow = {
  user_id: string;
  email: string;
  user_name: string;
  activities_json: string;
};

export async function handleDailyActivityDigest(rawEnv: unknown, scheduledTime = Date.now()) {
  if (!rawEnv || typeof rawEnv !== "object") throw new ApiError(503, "Worker bindings are not available");
  const env = rawEnv as WorkerEnv;
  const db = requireDb(env);
  const end = new Date(scheduledTime);
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  const digestDate = end.toISOString().slice(0, 10);
  const grouped = new Map<string, { email: string; userName: string; activities: DailyActivity[] }>();
  let offset = 0;
  while (true) {
    const rows = await db.prepare(
    `SELECT n.user_id, u.email, COALESCE(p.nick, '') AS user_name,
       json_group_array(json_object(
         'actor', COALESCE(actor.nick, ''),
         'body', n.body,
         'createdAt', n.created_at
       )) AS activities_json
     FROM notifications n
     JOIN auth_users u ON u.id = n.user_id
     LEFT JOIN profiles p ON p.id = n.user_id
     LEFT JOIN profiles actor ON actor.id = n.actor_id
     LEFT JOIN email_preferences pref ON pref.user_id = n.user_id
     WHERE COALESCE(pref.daily_activity_enabled, 1) = 1
       AND julianday(n.created_at) >= julianday(?)
       AND julianday(n.created_at) < julianday(?)
     GROUP BY n.user_id, u.email, p.nick
     ORDER BY n.user_id
     LIMIT 1000 OFFSET ?`,
    ).bind(start.toISOString(), end.toISOString(), offset).all<DigestActivityRow>();
    const page = rows.results ?? [];
    for (const row of page) {
      let activities: DailyActivity[];
      try {
        activities = JSON.parse(row.activities_json) as DailyActivity[];
      } catch (error) {
        console.error(`Could not decode daily activity digest for user ${row.user_id}:`, error);
        throw new ApiError(500, "Could not prepare daily activity digest");
      }
      grouped.set(row.user_id, {
        email: row.email,
        userName: row.user_name,
        activities,
      });
    }
    if (page.length < 1000) break;
    offset += page.length;
  }

  let sent = 0;
  for (const [userId, digest] of grouped) {
    const claim = await db.prepare(
      `INSERT INTO email_daily_digest_sends (user_id, digest_date, sent_at)
       VALUES (?, ?, ?)
       ON CONFLICT (user_id, digest_date) DO NOTHING
       RETURNING user_id`,
    ).bind(userId, digestDate, end.toISOString()).first<{ user_id: string }>();
    if (!claim) continue;
    try {
      await sendDailyActivityReport(env, digest.email, digest.userName, digest.activities);
      sent += 1;
    } catch (error) {
      console.error(`Could not send daily activity digest for user ${userId}:`, error);
      await db.prepare(
        "DELETE FROM email_daily_digest_sends WHERE user_id = ? AND digest_date = ?",
      ).bind(userId, digestDate).run();
    }
  }
  console.info(`Daily activity digest completed: ${sent} sent, ${grouped.size} eligible users`);
}

export async function handleWorkerApi(request: Request, rawEnv: unknown) {
  try {
    if (!rawEnv || typeof rawEnv !== "object") throw new ApiError(503, "Worker bindings are not available");
    const env = rawEnv as WorkerEnv;
    const db = requireDb(env);
    const path = new URL(request.url).pathname;
    if (path.startsWith("/api/auth/")) return await authHandler(request, db, env, path);
    if (path === "/api/support/tickets") return await supportTicketHandler(request, db);
    const user = await getUser(request, db);
    if (!user) throw new ApiError(401, "Authentication required");
    if (path === "/api/admin/dashboard") return await adminDashboardHandler(request, db, user);
    if (path === "/api/admin/action") return await adminActionHandler(request, db, env, user);
    if (path === "/api/verification/request") return await verificationRequestHandler(request, db, env, user);
    if (path === "/api/chat/unread" || path === "/api/chat/read") {
      return await chatUnreadHandler(request, db, user, path);
    }
    if (path === "/api/chat/conversation") return await chatConversationHandler(request, db, user);
    if (path === "/api/chat/delete") return await chatDeleteHandler(request, db, user);
    if (path === "/api/chat/send") return await chatSendHandler(request, db, env, user);
    if (path === "/api/email/preferences") return await emailPreferencesHandler(request, db, user);
    if (path === "/api/vip/activate") return await activatePrototypeVip(request, db, user);
    if (path === "/api/data") return await dataHandler(request, db, user);
    if (path === "/api/media") return await mediaHandler(request, db, env, user);
    return json({ error: "Not found" }, 404);
  } catch (error) {
    if (error instanceof ApiError) return json({ error: error.message }, error.status);
    console.error("D1 API error", error);
    return json({ error: "Internal server error" }, 500);
  }
}