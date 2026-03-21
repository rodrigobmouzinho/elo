import { beforeEach, describe, expect, it, vi } from "vitest";

describe("e2e critical networking flow", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ALLOW_MOCK_AUTH = "true";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("executes members search, elo creation, project publishing and application", async () => {
    const { memoryStore } = await import("../../lib/store");
    const { POST: loginPost } = await import("../../app/api/auth/login/route");
    const { GET: membersGet } = await import("../../app/api/app/members/route");
    const { POST: createEloPost } = await import("../../app/api/app/members/[id]/elo/route");
    const { POST: createProjectPost } = await import("../../app/api/app/projects/route");
    const { POST: applyProjectPost } = await import("../../app/api/app/projects/[id]/apply/route");

    memoryStore.memberLinks = [];
    memoryStore.projectApplications = [];

    const loginResponse = await loginPost(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "membro@elonetworking.com",
          password: "supersecret1"
        })
      })
    );
    const loginPayload = await loginResponse.json();

    expect(loginResponse.status).toBe(200);
    expect(loginPayload.success).toBe(true);
    expect(loginPayload.data.user.role).toBe("member");

    const memberHeaders = {
      authorization: `Bearer ${loginPayload.data.session.accessToken as string}`,
      "x-dev-role": "member",
      "content-type": "application/json"
    };

    const membersResponse = await membersGet(
      new Request("http://localhost/api/app/members?search=Pedro", {
        method: "GET",
        headers: memberHeaders
      })
    );
    const membersPayload = await membersResponse.json();

    expect(membersResponse.status).toBe(200);
    expect(membersPayload.success).toBe(true);
    expect(membersPayload.data).toHaveLength(1);

    const targetMemberId = membersPayload.data[0].id as string;

    const createEloResponse = await createEloPost(
      new Request(`http://localhost/api/app/members/${targetMemberId}/elo`, {
        method: "POST",
        headers: memberHeaders,
        body: JSON.stringify({})
      }),
      {
        params: Promise.resolve({ id: targetMemberId })
      }
    );
    const createEloPayload = await createEloResponse.json();

    expect(createEloResponse.status).toBe(200);
    expect(createEloPayload.success).toBe(true);
    expect(createEloPayload.data.created).toBe(true);

    const createProjectResponse = await createProjectPost(
      new Request("http://localhost/api/app/projects", {
        method: "POST",
        headers: memberHeaders,
        body: JSON.stringify({
          title: "Comunidade de founders B2B",
          description:
            "Iniciativa para conectar fundadores com investidores e especialistas em vendas consultivas.",
          category: "Community",
          lookingFor: "Pessoas com experiencia em growth"
        })
      })
    );
    const createProjectPayload = await createProjectResponse.json();

    expect(createProjectResponse.status).toBe(201);
    expect(createProjectPayload.success).toBe(true);
    expect(createProjectPayload.data.id).toBeTruthy();

    const applyResponse = await applyProjectPost(
      new Request("http://localhost/api/app/projects/project-1/apply", {
        method: "POST",
        headers: memberHeaders,
        body: JSON.stringify({
          message: "Posso apoiar na estruturacao comercial do projeto."
        })
      }),
      {
        params: Promise.resolve({ id: "project-1" })
      }
    );
    const applyPayload = await applyResponse.json();

    expect(applyResponse.status).toBe(200);
    expect(applyPayload.success).toBe(true);
    expect(applyPayload.data.message).toBe("Candidatura enviada");
    expect(applyPayload.data.application.ownerMemberId).toBe("60948757-e688-41ec-b0fc-cf30cf8cc3d8");
    expect(applyPayload.data.application.applicantMemberId).toBe(
      "f9e4f3e6-95ab-4be5-b513-c1bbf5b10b3e"
    );
    expect(memoryStore.projectApplications).toHaveLength(1);
  });
});
