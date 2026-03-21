import { beforeEach, describe, expect, it, vi } from "vitest";

describe("auth reset-password route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.APP_BASE_URL;
    delete process.env.PASSWORD_RESET_REDIRECT_URL;
  });

  it("sends a secure recovery link via resend when provider is available", async () => {
    process.env.APP_BASE_URL = "http://elo-networking.app";

    const generateLink = vi.fn().mockResolvedValue({
      data: {
        properties: {
          action_link: "https://project.supabase.co/auth/v1/verify?token=secure-token&type=recovery"
        }
      },
      error: null
    });
    const sendPasswordResetEmail = vi.fn().mockResolvedValue(undefined);

    vi.doMock("../../lib/supabase", () => ({
      hasSupabase: true,
      hasSupabaseAuthClient: false,
      supabaseAdmin: {
        auth: {
          admin: {
            generateLink
          }
        }
      },
      supabaseAuthClient: null
    }));
    vi.doMock("../../lib/email/resend", () => ({
      hasResendEmailProvider: () => true,
      sendPasswordResetEmail
    }));

    const { POST } = await import("../../app/api/auth/reset-password/route");

    const response = await POST(
      new Request("http://localhost/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "membro@elonetworking.com"
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.provider).toBe("resend");
    expect(generateLink).toHaveBeenCalledWith({
      type: "recovery",
      email: "membro@elonetworking.com",
      options: {
        redirectTo: "https://elo-networking.app/login?reset=1"
      }
    });
    expect(sendPasswordResetEmail).toHaveBeenCalledWith({
      to: "membro@elonetworking.com",
      resetUrl: expect.stringMatching(/^https:\/\//)
    });
  });

  it("falls back to supabase auth reset when resend is unavailable", async () => {
    process.env.PASSWORD_RESET_REDIRECT_URL = "https://app.elonetworking.com/login?reset=1";

    const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null });

    vi.doMock("../../lib/supabase", () => ({
      hasSupabase: false,
      hasSupabaseAuthClient: true,
      supabaseAdmin: null,
      supabaseAuthClient: {
        auth: {
          resetPasswordForEmail
        }
      }
    }));
    vi.doMock("../../lib/email/resend", () => ({
      hasResendEmailProvider: () => false,
      sendPasswordResetEmail: vi.fn()
    }));

    const { POST } = await import("../../app/api/auth/reset-password/route");

    const response = await POST(
      new Request("http://localhost/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "membro@elonetworking.com"
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.provider).toBe("supabase");
    expect(resetPasswordForEmail).toHaveBeenCalledWith("membro@elonetworking.com", {
      redirectTo: "https://app.elonetworking.com/login?reset=1"
    });
  });
});
