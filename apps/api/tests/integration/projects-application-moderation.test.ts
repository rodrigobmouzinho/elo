import { beforeEach, describe, expect, it, vi } from "vitest";

const CURRENT_MEMBER_ID = "f9e4f3e6-95ab-4be5-b513-c1bbf5b10b3e";
const OWNER_MEMBER_ID = "60948757-e688-41ec-b0fc-cf30cf8cc3d8";
const THIRD_MEMBER_ID = "e8cb1a1d-6fd3-4c0c-8ad1-a462749cf2ef";
const FOURTH_MEMBER_ID = "f47f2d07-8a56-4948-aeb0-0e5b09c0f7f7";

function buildProject(ownerMemberId: string) {
  return {
    id: "project-moderation-1",
    title: "Rede de distribuicao para marcas digitais",
    summary: "Plataforma para conectar marcas e operadores regionais.",
    category: "Marketplace",
    businessAreas: ["Marketplace", "Growth"],
    vision:
      "Criar uma operacao de distribuicao que combine dados de demanda, onboarding de parceiros e rotinas comerciais repetiveis.",
    needs: [
      {
        title: "Operacao comercial",
        description: "Pessoa para estruturar playbook de prospeccao e ativacao regional."
      }
    ],
    galleryImageUrls: [],
    description:
      "Plataforma para conectar marcas e operadores regionais.\n\nCriar uma operacao de distribuicao que combine dados de demanda, onboarding de parceiros e rotinas comerciais repetiveis.",
    lookingFor: "Operacao comercial",
    ownerName: ownerMemberId === CURRENT_MEMBER_ID ? "Ana Costa" : "Pedro Nunes",
    ownerMemberId,
    status: "active" as const,
    completedAt: null,
    inactivatedAt: null,
    updatedAt: "2026-03-22T11:00:00.000Z"
  };
}

describe("projects application moderation", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ALLOW_MOCK_AUTH = "true";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("returns project detail with viewer access and application status for approved members", async () => {
    const { memoryStore } = await import("../../lib/store");
    const { GET: getProjectDetailRoute } = await import("../../app/api/app/projects/[id]/route");

    memoryStore.projectIdeas = [buildProject(OWNER_MEMBER_ID)];
    memoryStore.projectApplications = [
      {
        id: "application-approved-viewer",
        projectId: "project-moderation-1",
        ownerMemberId: OWNER_MEMBER_ID,
        applicantMemberId: CURRENT_MEMBER_ID,
        message: "Posso apoiar a frente de growth.",
        status: "accepted",
        createdAt: "2026-03-22T11:10:00.000Z",
        reviewedAt: "2026-03-22T11:20:00.000Z",
        reviewedByMemberId: OWNER_MEMBER_ID
      }
    ];

    const response = await getProjectDetailRoute(
      new Request("http://localhost/api/app/projects/project-moderation-1", {
        method: "GET",
        headers: {
          authorization: "Bearer mock-token",
          "x-dev-role": "member"
        }
      }),
      {
        params: Promise.resolve({ id: "project-moderation-1" })
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.id).toBe("project-moderation-1");
    expect(payload.data.myApplicationStatus).toBe("accepted");
    expect(payload.data.viewerAccess).toMatchObject({
      isOwner: false,
      isApprovedMember: true,
      canApply: false,
      canModerateApplications: false,
      canViewApplicants: true
    });
  });

  it("lets the owner approve and reject pending applications with audit trail", async () => {
    const { memoryStore } = await import("../../lib/store");
    const { POST: approveRoute } = await import(
      "../../app/api/app/projects/[id]/applications/[applicationId]/approve/route"
    );
    const { POST: rejectRoute } = await import(
      "../../app/api/app/projects/[id]/applications/[applicationId]/reject/route"
    );

    memoryStore.projectIdeas = [buildProject(CURRENT_MEMBER_ID)];
    memoryStore.projectApplications = [
      {
        id: "application-approve",
        projectId: "project-moderation-1",
        ownerMemberId: CURRENT_MEMBER_ID,
        applicantMemberId: OWNER_MEMBER_ID,
        message: "Tenho experiencia em estrutura comercial.",
        status: "applied",
        createdAt: "2026-03-22T11:15:00.000Z"
      },
      {
        id: "application-reject",
        projectId: "project-moderation-1",
        ownerMemberId: CURRENT_MEMBER_ID,
        applicantMemberId: THIRD_MEMBER_ID,
        message: "Posso contribuir com networking e canais.",
        status: "applied",
        createdAt: "2026-03-22T11:16:00.000Z"
      }
    ];
    memoryStore.auditLogs = [];

    const headers = {
      authorization: "Bearer mock-token",
      "x-dev-role": "member",
      "content-type": "application/json"
    };

    const approveResponse = await approveRoute(
      new Request(
        "http://localhost/api/app/projects/project-moderation-1/applications/application-approve/approve",
        {
          method: "POST",
          headers
        }
      ),
      {
        params: Promise.resolve({
          id: "project-moderation-1",
          applicationId: "application-approve"
        })
      }
    );
    const approvePayload = await approveResponse.json();

    expect(approveResponse.status).toBe(200);
    expect(approvePayload.data.status).toBe("accepted");
    expect(memoryStore.projectApplications[0]?.status).toBe("accepted");

    const rejectResponse = await rejectRoute(
      new Request(
        "http://localhost/api/app/projects/project-moderation-1/applications/application-reject/reject",
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            reason: "Neste momento buscamos um perfil mais aderente a operacao comercial."
          })
        }
      ),
      {
        params: Promise.resolve({
          id: "project-moderation-1",
          applicationId: "application-reject"
        })
      }
    );
    const rejectPayload = await rejectResponse.json();

    expect(rejectResponse.status).toBe(200);
    expect(rejectPayload.data.status).toBe("rejected");
    expect(rejectPayload.data.rejectionReason).toContain("perfil mais aderente");
    expect(memoryStore.projectApplications[1]?.status).toBe("rejected");
    expect(memoryStore.projectApplications[1]?.rejectionReason).toContain("perfil mais aderente");
    expect(memoryStore.auditLogs.map((item) => item.action)).toEqual([
      "member.notification_created",
      "project.application_rejected",
      "member.notification_created",
      "project.application_approved"
    ]);
  });

  it("keeps rejected applicants private while approved members can see pending and approved lists", async () => {
    const { memoryStore } = await import("../../lib/store");
    const { GET: getApplicationsRoute } = await import(
      "../../app/api/app/projects/[id]/applications/route"
    );

    memoryStore.projectIdeas = [buildProject(OWNER_MEMBER_ID)];
    memoryStore.projectApplications = [
      {
        id: "application-approved-viewer",
        projectId: "project-moderation-1",
        ownerMemberId: OWNER_MEMBER_ID,
        applicantMemberId: CURRENT_MEMBER_ID,
        message: "Sou uma boa pessoa para growth.",
        status: "accepted",
        createdAt: "2026-03-22T11:10:00.000Z",
        reviewedAt: "2026-03-22T11:20:00.000Z",
        reviewedByMemberId: OWNER_MEMBER_ID
      },
      {
        id: "application-pending-visible",
        projectId: "project-moderation-1",
        ownerMemberId: OWNER_MEMBER_ID,
        applicantMemberId: THIRD_MEMBER_ID,
        message: "Posso apoiar a operacao comercial.",
        status: "applied",
        createdAt: "2026-03-22T11:30:00.000Z"
      },
      {
        id: "application-rejected-private",
        projectId: "project-moderation-1",
        ownerMemberId: OWNER_MEMBER_ID,
        applicantMemberId: FOURTH_MEMBER_ID,
        message: "Tenho experiencia em canais.",
        status: "rejected",
        createdAt: "2026-03-22T11:40:00.000Z",
        reviewedAt: "2026-03-22T11:50:00.000Z",
        reviewedByMemberId: OWNER_MEMBER_ID,
        rejectionReason: "Buscamos outro recorte para esta etapa."
      }
    ];

    const response = await getApplicationsRoute(
      new Request("http://localhost/api/app/projects/project-moderation-1/applications", {
        method: "GET",
        headers: {
          authorization: "Bearer mock-token",
          "x-dev-role": "member"
        }
      }),
      {
        params: Promise.resolve({ id: "project-moderation-1" })
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.viewerAccess.isApprovedMember).toBe(true);
    expect(payload.data.pending).toHaveLength(1);
    expect(payload.data.approved).toHaveLength(1);
    expect(payload.data.rejected).toHaveLength(0);
    expect(payload.data.pending[0].message).toBeNull();
    expect(payload.data.approved[0].message).toBeNull();
  });

  it("blocks moderation and applicant roster for viewers without permission", async () => {
    const { memoryStore } = await import("../../lib/store");
    const { GET: getApplicationsRoute } = await import(
      "../../app/api/app/projects/[id]/applications/route"
    );
    const { POST: approveRoute } = await import(
      "../../app/api/app/projects/[id]/applications/[applicationId]/approve/route"
    );
    const { POST: rejectRoute } = await import(
      "../../app/api/app/projects/[id]/applications/[applicationId]/reject/route"
    );

    memoryStore.projectIdeas = [buildProject(OWNER_MEMBER_ID)];
    memoryStore.projectApplications = [
      {
        id: "application-pending-owner-only",
        projectId: "project-moderation-1",
        ownerMemberId: OWNER_MEMBER_ID,
        applicantMemberId: THIRD_MEMBER_ID,
        message: "Tenho disponibilidade para construir junto.",
        status: "applied",
        createdAt: "2026-03-22T11:55:00.000Z"
      }
    ];

    const listResponse = await getApplicationsRoute(
      new Request("http://localhost/api/app/projects/project-moderation-1/applications", {
        method: "GET",
        headers: {
          authorization: "Bearer mock-token",
          "x-dev-role": "member"
        }
      }),
      {
        params: Promise.resolve({ id: "project-moderation-1" })
      }
    );
    const listPayload = await listResponse.json();

    expect(listResponse.status).toBe(403);
    expect(listPayload.error).toContain("Visualizacao de candidaturas nao permitida");

    const approveResponse = await approveRoute(
      new Request(
        "http://localhost/api/app/projects/project-moderation-1/applications/application-pending-owner-only/approve",
        {
          method: "POST",
          headers: {
            authorization: "Bearer mock-token",
            "x-dev-role": "member"
          }
        }
      ),
      {
        params: Promise.resolve({
          id: "project-moderation-1",
          applicationId: "application-pending-owner-only"
        })
      }
    );
    const approvePayload = await approveResponse.json();

    expect(approveResponse.status).toBe(403);
    expect(approvePayload.error).toContain("Somente o dono pode moderar candidaturas");

    const rejectResponse = await rejectRoute(
      new Request(
        "http://localhost/api/app/projects/project-moderation-1/applications/application-pending-owner-only/reject",
        {
          method: "POST",
          headers: {
            authorization: "Bearer mock-token",
            "x-dev-role": "member",
            "content-type": "application/json"
          },
          body: JSON.stringify({ reason: "" })
        }
      ),
      {
        params: Promise.resolve({
          id: "project-moderation-1",
          applicationId: "application-pending-owner-only"
        })
      }
    );
    const rejectPayload = await rejectResponse.json();

    expect(rejectResponse.status).toBe(422);
    expect(rejectPayload.error).toBeTruthy();
  });
});
