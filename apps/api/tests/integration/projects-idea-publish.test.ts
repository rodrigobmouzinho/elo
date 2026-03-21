import { beforeEach, describe, expect, it, vi } from "vitest";

describe("projects idea publish", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ALLOW_MOCK_AUTH = "true";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("publishes a valid project idea and keeps it visible in app listing", async () => {
    const { memoryStore } = await import("../../lib/store");
    const { GET: listProjectsGet, POST: createProjectPost } = await import(
      "../../app/api/app/projects/route"
    );

    memoryStore.projectIdeas = [];

    const memberHeaders = {
      authorization: "Bearer mock-token",
      "x-dev-role": "member",
      "content-type": "application/json"
    };

    const createResponse = await createProjectPost(
      new Request("http://localhost/api/app/projects", {
        method: "POST",
        headers: memberHeaders,
        body: JSON.stringify({
          title: "Plataforma de conexoes B2B",
          description:
            "Produto para aproximar founders e investidores com trilhas de networking validadas.",
          category: "Marketplace",
          lookingFor: "Cofounder de tecnologia"
        })
      })
    );
    const createPayload = await createResponse.json();
    const createdId = createPayload.data.id as string;

    expect(createResponse.status).toBe(201);
    expect(createPayload.success).toBe(true);
    expect(createPayload.data.title).toBe("Plataforma de conexoes B2B");

    const listResponse = await listProjectsGet(
      new Request("http://localhost/api/app/projects", {
        method: "GET",
        headers: {
          authorization: "Bearer mock-token",
          "x-dev-role": "member"
        }
      })
    );
    const listPayload = await listResponse.json();

    expect(listResponse.status).toBe(200);
    expect(listPayload.success).toBe(true);
    expect(
      listPayload.data.some(
        (project: { id: string; title: string }) =>
          project.id === createdId && project.title === "Plataforma de conexoes B2B"
      )
    ).toBe(true);
  });
});
