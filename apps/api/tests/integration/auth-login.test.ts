import { beforeEach, describe, expect, it, vi } from "vitest";

describe("auth login route", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ALLOW_MOCK_AUTH = "true";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("returns admin session for admin email in mock auth mode", async () => {
    const { POST } = await import("../../app/api/auth/login/route");

    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "admin@elonetworking.com",
        password: "supersecret1"
      })
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.user.role).toBe("admin");
    expect(payload.data.session.accessToken).toBeTruthy();
  });

  it("returns member session for member email in mock auth mode", async () => {
    const { POST } = await import("../../app/api/auth/login/route");

    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "membro@elonetworking.com",
        password: "supersecret1"
      })
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.user.role).toBe("member");
  });
});
