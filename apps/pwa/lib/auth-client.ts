"use client";

export type AuthUser = {
  userId: string;
  email: string;
  role: "admin" | "member";
  memberId: string | null;
  displayName: string;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
};

export type StoredAuth = {
  session: AuthSession;
  user: AuthUser;
};

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: string;
};

type ParsedResponse<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

const STORAGE_KEY = "elo_member_auth";

function parseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function getStoredAuth(): StoredAuth | null {
  if (typeof window === "undefined") return null;
  return parseJson<StoredAuth>(window.localStorage.getItem(STORAGE_KEY));
}

export function setStoredAuth(value: StoredAuth) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function clearStoredAuth() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

async function parseApiResponse<T>(response: Response, fallbackError: string): Promise<ParsedResponse<T>> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    await response.text();

    if (response.status === 404) {
      return {
        ok: false,
        status: response.status,
        error: "Nao foi possivel conectar com a API. Verifique NEXT_PUBLIC_API_URL no deploy do PWA."
      };
    }

    return {
      ok: false,
      status: response.status,
      error: `${fallbackError} (HTTP ${response.status})`
    };
  }

  const payload = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || !payload.success) {
    return {
      ok: false,
      status: response.status,
      error: payload.error ?? fallbackError
    };
  }

  if (payload.data === undefined) {
    return {
      ok: false,
      status: response.status,
      error: "Resposta invalida do servidor."
    };
  }

  return {
    ok: true,
    data: payload.data
  };
}

export async function login(email: string, password: string) {
  const response = await fetch("/backend/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  const parsed = await parseApiResponse<StoredAuth>(response, "Falha no login");

  if (!parsed.ok) {
    throw new Error(parsed.error);
  }

  const auth = parsed.data;

  if (auth.user.role !== "member") {
    throw new Error("Este acesso e exclusivo para membros.");
  }

  setStoredAuth(auth);

  return auth;
}

export async function requestPasswordReset(email: string) {
  const response = await fetch("/backend/auth/reset-password", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ email })
  });

  const parsed = await parseApiResponse<{ message: string }>(response, "Falha ao solicitar reset");

  if (!parsed.ok) {
    throw new Error(parsed.error);
  }

  return parsed.data;
}

export async function fetchMe() {
  const auth = getStoredAuth();
  if (!auth?.session?.accessToken) {
    throw new Error("Sessao ausente");
  }

  const response = await fetch("/backend/auth/me", {
    headers: {
      authorization: `Bearer ${auth.session.accessToken}`
    },
    cache: "no-store"
  });

  const parsed = await parseApiResponse<{
    userId: string;
    email: string;
    role: "member";
    memberId: string | null;
  }>(response, "Sessao invalida");

  if (!parsed.ok) {
    clearStoredAuth();
    throw new Error(parsed.error);
  }

  if (parsed.data.role !== "member") {
    clearStoredAuth();
    throw new Error("Usuario sem permissao de membro");
  }

  return parsed.data;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}) {
  const auth = getStoredAuth();

  if (!auth?.session?.accessToken) {
    throw new Error("Voce precisa estar autenticado.");
  }

  const isFormDataRequest =
    typeof FormData !== "undefined" && init.body instanceof FormData;
  const headers = new Headers(init.headers);

  if (!isFormDataRequest && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  headers.set("authorization", `Bearer ${auth.session.accessToken}`);

  const response = await fetch(`/backend${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });

  const parsed = await parseApiResponse<T>(response, "Falha de requisicao");

  if (!parsed.ok) {
    if (parsed.status === 401 || parsed.status === 403) {
      clearStoredAuth();
    }

    throw new Error(parsed.error);
  }

  return parsed.data;
}
