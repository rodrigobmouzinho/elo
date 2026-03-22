import { beforeEach, describe, expect, it, vi } from "vitest";

const CURRENT_MEMBER_ID = "f9e4f3e6-95ab-4be5-b513-c1bbf5b10b3e";
const OTHER_MEMBER_ID = "60948757-e688-41ec-b0fc-cf30cf8cc3d8";

function buildProject(
  id: string,
  ownerMemberId: string,
  overrides?: Partial<{
    status: "active" | "completed" | "inactive";
    completedAt: string | null;
    inactivatedAt: string | null;
    updatedAt: string | null;
  }>
) {
  return {
    id,
    title: `Projeto ${id}`,
    summary: "Resumo objetivo da oportunidade.",
    category: "SaaS",
    businessAreas: ["SaaS"],
    vision:
      "Construir uma oportunidade de negocio que conecte operacao, produto e crescimento com uma tese clara.",
    needs: [
      {
        title: "Produto",
        description: "Pessoa para acelerar discovery e definicao do MVP."
      }
    ],
    galleryImageUrls: [],
    description:
      "Resumo objetivo da oportunidade.\n\nConstruir uma oportunidade de negocio que conecte operacao, produto e crescimento com uma tese clara.",
    lookingFor: "Produto",
    ownerName: ownerMemberId === CURRENT_MEMBER_ID ? "Ana Costa" : "Pedro Nunes",
    ownerMemberId,
    status: overrides?.status ?? "active",
    completedAt: overrides?.completedAt ?? null,
    inactivatedAt: overrides?.inactivatedAt ?? null,
    updatedAt: overrides?.updatedAt ?? "2026-03-22T10:00:00.000Z"
  };
}

describe("projects lifecycle", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ALLOW_MOCK_AUTH = "true";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("keeps own inactive projects visible while hiding inactive projects from other owners", async () => {
    const { memoryStore } = await import("../../lib/store");
    const { GET: listProjectsGet } = await import("../../app/api/app/projects/route");

    memoryStore.projectIdeas = [
      buildProject("project-owned-inactive", CURRENT_MEMBER_ID, {
        status: "inactive",
        inactivatedAt: "2026-03-22T10:15:00.000Z"
      }),
      buildProject("project-public-completed", OTHER_MEMBER_ID, {
        status: "completed",
        completedAt: "2026-03-22T09:00:00.000Z"
      }),
      buildProject("project-other-inactive", OTHER_MEMBER_ID, {
        status: "inactive",
        inactivatedAt: "2026-03-22T08:00:00.000Z"
      })
    ];

    const response = await listProjectsGet(
      new Request("http://localhost/api/app/projects", {
        method: "GET",
        headers: {
          authorization: "Bearer mock-token",
          "x-dev-role": "member"
        }
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.map((item: { id: string }) => item.id)).toContain("project-owned-inactive");
    expect(payload.data.map((item: { id: string }) => item.id)).toContain("project-public-completed");
    expect(payload.data.map((item: { id: string }) => item.id)).not.toContain("project-other-inactive");
  });

  it("changes project status with audit trail and blocks reactivation of inactive projects", async () => {
    const { memoryStore } = await import("../../lib/store");
    const { PATCH: updateProjectStatusPatch } = await import(
      "../../app/api/app/projects/[id]/status/route"
    );

    memoryStore.projectIdeas = [buildProject("project-status-owner", CURRENT_MEMBER_ID)];
    memoryStore.auditLogs = [];

    const headers = {
      authorization: "Bearer mock-token",
      "x-dev-role": "member",
      "content-type": "application/json"
    };

    const completedResponse = await updateProjectStatusPatch(
      new Request("http://localhost/api/app/projects/project-status-owner/status", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: "completed" })
      }),
      {
        params: Promise.resolve({ id: "project-status-owner" })
      }
    );
    const completedPayload = await completedResponse.json();

    expect(completedResponse.status).toBe(200);
    expect(completedPayload.data.status).toBe("completed");
    expect(completedPayload.data.acceptingApplications).toBe(false);
    expect(memoryStore.auditLogs[0]?.action).toBe("project.status_changed");

    const activeResponse = await updateProjectStatusPatch(
      new Request("http://localhost/api/app/projects/project-status-owner/status", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: "active" })
      }),
      {
        params: Promise.resolve({ id: "project-status-owner" })
      }
    );
    const activePayload = await activeResponse.json();

    expect(activeResponse.status).toBe(200);
    expect(activePayload.data.status).toBe("active");
    expect(activePayload.data.acceptingApplications).toBe(true);

    const inactiveResponse = await updateProjectStatusPatch(
      new Request("http://localhost/api/app/projects/project-status-owner/status", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: "inactive" })
      }),
      {
        params: Promise.resolve({ id: "project-status-owner" })
      }
    );
    const inactivePayload = await inactiveResponse.json();

    expect(inactiveResponse.status).toBe(200);
    expect(inactivePayload.data.status).toBe("inactive");

    const reopenInactiveResponse = await updateProjectStatusPatch(
      new Request("http://localhost/api/app/projects/project-status-owner/status", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: "active" })
      }),
      {
        params: Promise.resolve({ id: "project-status-owner" })
      }
    );
    const reopenInactivePayload = await reopenInactiveResponse.json();

    expect(reopenInactiveResponse.status).toBe(422);
    expect(reopenInactivePayload.error).toContain("Projeto inativo nao pode ser reaberto");
  });

  it("blocks new applications for completed and inactive projects", async () => {
    const { memoryStore } = await import("../../lib/store");
    const { POST: applyProjectPost } = await import("../../app/api/app/projects/[id]/apply/route");

    memoryStore.projectIdeas = [
      buildProject("project-completed", OTHER_MEMBER_ID, {
        status: "completed",
        completedAt: "2026-03-22T09:00:00.000Z"
      }),
      buildProject("project-inactive", OTHER_MEMBER_ID, {
        status: "inactive",
        inactivatedAt: "2026-03-22T10:15:00.000Z"
      })
    ];
    memoryStore.projectApplications = [];

    const headers = {
      authorization: "Bearer mock-token",
      "x-dev-role": "member",
      "content-type": "application/json"
    };

    const completedResponse = await applyProjectPost(
      new Request("http://localhost/api/app/projects/project-completed/apply", {
        method: "POST",
        headers,
        body: JSON.stringify({})
      }),
      {
        params: Promise.resolve({ id: "project-completed" })
      }
    );
    const completedPayload = await completedResponse.json();

    expect(completedResponse.status).toBe(422);
    expect(completedPayload.error).toContain("Projeto nao aceita novas candidaturas");

    const inactiveResponse = await applyProjectPost(
      new Request("http://localhost/api/app/projects/project-inactive/apply", {
        method: "POST",
        headers,
        body: JSON.stringify({})
      }),
      {
        params: Promise.resolve({ id: "project-inactive" })
      }
    );
    const inactivePayload = await inactiveResponse.json();

    expect(inactiveResponse.status).toBe(422);
    expect(inactivePayload.error).toContain("Projeto nao aceita novas candidaturas");
  });
});
