export type RequestLike = {
  method?: string;
  headers?: {
    cookie?: unknown;
    Cookie?: unknown;
    get?: (name: string) => string | null;
    [key: string]: unknown;
  };
  body?: unknown;
};

export type ResponseLike = {
  status: (code: number) => ResponseLike;
  json: (payload: unknown) => void;
};

export const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

