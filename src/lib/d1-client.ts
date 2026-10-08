export type D1Error = { message: string; status?: number };
// Rows come from D1 as dynamic JSON; `any` keeps call sites simple.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type D1Row = Record<string, any>;
export type D1Result<T = D1Row> = { data: T | T[] | null; error: D1Error | null; count?: number | null };

type Filter = { column: string; operator: "eq" | "neq" | "is" | "in"; value: unknown };
type Order = { column: string; ascending: boolean };

class D1Query implements PromiseLike<D1Result> {
  private action = "select";
  private columns = "*";
  private values: unknown;
  private readonly filters: Filter[] = [];
  private readonly orders: Order[] = [];
  private rowLimit: number | undefined;
  private conflict: string | undefined;
  private ignoreDuplicates = false;
  private countMode: string | undefined;
  private head = false;
  private singleMode: "single" | "maybe" | undefined;

  constructor(private readonly table: string) {}

  select(columns = "*", options?: { count?: string; head?: boolean }) {
    this.columns = columns;
    this.countMode = options?.count;
    this.head = options?.head ?? false;
    return this;
  }

  insert(values: unknown) { this.action = "insert"; this.values = values; return this; }
  upsert(values: unknown, options?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.action = "upsert";
    this.values = values;
    this.conflict = options?.onConflict;
    this.ignoreDuplicates = options?.ignoreDuplicates ?? false;
    return this;
  }
  update(values: unknown) { this.action = "update"; this.values = values; return this; }
  delete() { this.action = "delete"; return this; }
  eq(column: string, value: unknown) { this.filters.push({ column, operator: "eq", value }); return this; }
  neq(column: string, value: unknown) { this.filters.push({ column, operator: "neq", value }); return this; }
  is(column: string, value: unknown) { this.filters.push({ column, operator: "is", value }); return this; }
  in(column: string, value: unknown[]) { this.filters.push({ column, operator: "in", value }); return this; }
  order(column: string, options?: { ascending?: boolean }) { this.orders.push({ column, ascending: options?.ascending ?? true }); return this; }
  limit(value: number) { this.rowLimit = value; return this; }
  single() { this.singleMode = "single"; return this.execute(); }
  maybeSingle() { this.singleMode = "maybe"; return this.execute(); }

  then<TResult1 = D1Result, TResult2 = never>(
    onfulfilled?: ((value: D1Result) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<D1Result> {
    try {
      const response = await fetch("/api/data", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          table: this.table,
          action: this.action,
          columns: this.columns,
          values: this.values,
          filters: this.filters,
          order: this.orders,
          limit: this.rowLimit,
          onConflict: this.conflict,
          ignoreDuplicates: this.ignoreDuplicates,
          count: this.countMode,
          head: this.head,
        }),
      });
      const payload = await response.json() as { data?: unknown; count?: number | null; error?: string };
      if (!response.ok) return { data: null, error: { message: payload.error ?? "Database request failed", status: response.status } };
      let data = (payload.data ?? null) as D1Result["data"];
      if (Array.isArray(data) && this.singleMode) {
        if (data.length > 1 || (data.length === 0 && this.singleMode === "single")) {
          return { data: null, error: { message: "Expected exactly one row" } };
        }
        data = data[0] ?? null;
      }
      return { data, error: null, count: payload.count ?? null };
    } catch (error) {
      return { data: null, error: { message: error instanceof Error ? error.message : "Database request failed" } };
    }
  }
}

export const d1 = {
  from(table: string) { return new D1Query(table); },
};

export async function authRequest<T>(path: string, body?: unknown): Promise<{ data: T | null; error: D1Error | null }> {
  try {
    const init: RequestInit = { method: "GET", credentials: "same-origin" };
    if (body !== undefined) {
      init.method = "POST";
      init.headers = { "content-type": "application/json" };
      init.body = JSON.stringify(body);
    }
    const response = await fetch(path, init);
    const payload = await response.json() as { user?: T; error?: string; ok?: boolean };
    if (!response.ok) return { data: null, error: { message: payload.error ?? "Authentication request failed", status: response.status } };
    return { data: (payload.user ?? null) as T | null, error: null };
  } catch (error) {
    return { data: null, error: { message: error instanceof Error ? error.message : "Authentication request failed" } };
  }
}