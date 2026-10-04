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
  put: (key: string, value: ReadableStream | ArrayBuffer | ArrayBufferView, options?: unknown) => Promise<unknown>;
  delete: (key: string) => Promise<void>;
};

type WorkerEnv = { DB: D1Database; MEDIA?: R2Bucket };
type AuthUser = { id: string; email: string; role: string };

const SESSION_COOKIE = "cp_session";
const SESSION_DAYS = 30;
const PASSWORD_ITERATIONS = 600_000;
const JSON_COLUMNS = new Set(["looking_for", "public_album", "private_album", "tags"]);
const BOOLEAN_COLUMNS = new Set(["vip", "read"]);

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
     FROM auth_sessions s JOIN auth_users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ? LIMIT 1`,
  ).bind(tokenHash, new Date().toISOString()).first<AuthUser>();
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

async function authHandler(request: Request, db: D1Database, path: string) {
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
  if (value === null || typeof value === "string" || typeof value === "number") {
    if (JSON_COLUMNS.has(column) && typeof value !== "string") return JSON.stringify(value);
    if (BOOLEAN_COLUMNS.has(column) && typeof value === "boolean") return value ? 1 : 0;
    return value;
  }
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
  for (const column of ["avatar", "cover", "image"]) {
    const path = result[column];
    if (typeof path === "string" && path.includes("/r2/")) {
      result[column] = `/api/media?key=${encodeURIComponent(path)}`;
    }
  }
  return result;
}

function addScope(table: string, action: string, user: AuthUser): { sql: string; values: D1Value[] } {
  if (action !== "select") return { sql: "", values: [] };
  if (table === "notifications") return { sql: "user_id = ?", values: [user.id] };
  if (table === "user_blocks") return { sql: "blocker_id = ?", values: [user.id] };
  if (table === "profile_visits") return { sql: "(visitor_id = ? OR profile_id = ?)", values: [user.id, user.id] };
  if (table === "album_access_requests") return { sql: "(requester_id = ? OR owner_id = ?)", values: [user.id, user.id] };
  if (table === "conversations") return { sql: "(user_a = ? OR user_b = ?)", values: [user.id, user.id] };
  if (table === "messages") return { sql: "conversation_id IN (SELECT id FROM conversations WHERE user_a = ? OR user_b = ?)", values: [user.id, user.id] };
  if (table === "message_attachments") return { sql: "message_id IN (SELECT m.id FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE c.user_a = ? OR c.user_b = ?)", values: [user.id, user.id] };
  if (table === "reports" && user.role !== "admin") return { sql: "reporter_id = ?", values: [user.id] };
  if (table === "user_roles") return { sql: "user_id = ?", values: [user.id] };
  return { sql: "", values: [] };
}

function assertMutationScope(table: string, action: string, row: D1Row, user: AuthUser) {
  const forbidden = () => { throw new ApiError(403, "Operation not permitted"); };
  if (table === "profiles") {
    if ((action === "insert" || action === "upsert" || action === "update") && row["id"] !== undefined && row["id"] !== user.id) forbidden();
    if (action === "update" && user.role !== "admin" && "vip" in row) forbidden();
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
    if (requested[0] !== "*" && requested.some((column) => !columns.includes(column))) throw new ApiError(400, "Invalid selected column");
    const projection = requested[0] === "*" ? "*" : requested.join(", ");
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
        const author = await db.prepare("SELECT * FROM profiles WHERE id = ? LIMIT 1").bind(String(post["author_id"])).first<D1Row>();
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
        const conversation = await db.prepare("SELECT 1 AS allowed FROM conversations WHERE id = ? AND (user_a = ? OR user_b = ?) LIMIT 1")
          .bind(String(row["conversation_id"] ?? ""), user.id, user.id).first();
        if (!conversation || row["sender_id"] !== user.id) throw new ApiError(403, "Not a participant in this conversation");
      }
      if (table === "album_access_requests") {
        const profile = await db.prepare("SELECT vip FROM profiles WHERE id = ? LIMIT 1").bind(user.id).first<{ vip: number }>();
        if (!profile?.vip) throw new ApiError(403, "Only VIP members can request private album access");
      }
      if (table === "message_attachments") {
        const message = await db.prepare("SELECT 1 AS allowed FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE m.id = ? AND m.sender_id = ? AND (c.user_a = ? OR c.user_b = ?) LIMIT 1")
          .bind(String(row["message_id"] ?? ""), user.id, user.id, user.id).first();
        if (!message || typeof row["storage_path"] !== "string" || !validMediaKey(row["storage_path"])) {
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
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentType !== "image/webp" || contentLength > 100 * 1024 * 1024) throw new ApiError(400, "Unsupported media type or size");
    await bucket.put(key, request.body ?? new ArrayBuffer(0), { httpMetadata: { contentType, cacheControl: "private, max-age=3300" } });
    return json({ key });
  }
  if (request.method !== "GET") throw new ApiError(405, "Method not allowed");
  if (kind === "private" && ownerId !== user.id) {
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
  return new Response(object.body, { headers });
}

export async function handleWorkerApi(request: Request, rawEnv: unknown) {
  try {
    if (!rawEnv || typeof rawEnv !== "object") throw new ApiError(503, "Worker bindings are not available");
    const env = rawEnv as WorkerEnv;
    const db = requireDb(env);
    const path = new URL(request.url).pathname;
    if (path.startsWith("/api/auth/")) return await authHandler(request, db, path);
    const user = await getUser(request, db);
    if (!user) throw new ApiError(401, "Authentication required");
    if (path === "/api/data") return await dataHandler(request, db, user);
    if (path === "/api/media") return await mediaHandler(request, db, env, user);
    return json({ error: "Not found" }, 404);
  } catch (error) {
    if (error instanceof ApiError) return json({ error: error.message }, error.status);
    console.error("D1 API error", error);
    return json({ error: "Internal server error" }, 500);
  }
}