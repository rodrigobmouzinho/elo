import { beforeEach, describe, expect, it, vi } from "vitest";

const PROJECT_ID = "project-open-47";
const OWNER_MEMBER_ID = "60948757-e688-41ec-b0fc-cf30cf8cc3d8";
const APPLICANT_MEMBER_ID = "f9e4f3e6-95ab-4be5-b513-c1bbf5b10b3e";

describe("projects idea application", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ALLOW_MOCK_AUTH = "true";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("applies to an open project and routes the application to the project owner", async () => {
    const { memoryStore } = await import("../../lib/store");
    const { POST: applyProjectPost } = await import("../../app/api/app/projects/[id]/apply/route");

    memoryStore.projectIdeas = [
      {
        id: PROJECT_ID,
        title: "Plataforma de eventos corporativos",
        summary: "Marketplace curado para operacao de eventos corporativos.",
        category: "SaaS",
        businessAreas: ["SaaS", "Eventos"],
        vision: "Conectar empresas e prestadores para eventos com curadoria, reduzindo friccao operacional e ampliando previsibilidade comercial.",
        needs: [
          {
            title: "Pessoa de produto",
            description: "Experiencia com roadmap, discovery e estrutura de MVP."
          }
        ],
        galleryImageUrls: [],
        description:
          "Marketplace curado para operacao de eventos corporativos.\n\nConectar empresas e prestadores para eventos com curadoria, reduzindo friccao operacional e ampliando previsibilidade comercial.",
        lookingFor: "Pessoa de produto",
        ownerName: "Pedro Nunes",
        ownerMemberId: OWNER_MEMBER_ID
      }
    ];
    memoryStore.projectApplications = [];

    const headers = {
      authorization: "Bearer mock-token",
      "x-dev-role": "member",
      "content-type": "application/json"
    };

    const firstResponse = await applyProjectPost(
      new Request(`http://localhost/api/app/projects/${PROJECT_ID}/apply`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: "Tenho experiencia com roadmap e discovery."
        })
      }),
      {
        params: Promise.resolve({ id: PROJECT_ID })
      }
    );
    const firstPayload = await firstResponse.json();

    expect(firstResponse.status).toBe(200);
    expect(firstPayload.success).toBe(true);
    expect(firstPayload.data.message).toBe("Candidatura enviada");
    expect(firstPayload.data.application.created).toBe(true);
    expect(firstPayload.data.application.ownerMemberId).toBe(OWNER_MEMBER_ID);
    expect(firstPayload.data.application.applicantMemberId).toBe(APPLICANT_MEMBER_ID);
    expect(memoryStore.projectApplications).toHaveLength(1);
    expect(memoryStore.projectApplications[0]).toMatchObject({
      projectId: PROJECT_ID,
      ownerMemberId: OWNER_MEMBER_ID,
      applicantMemberId: APPLICANT_MEMBER_ID,
      status: "applied"
    });

    const secondResponse = await applyProjectPost(
      new Request(`http://localhost/api/app/projects/${PROJECT_ID}/apply`, {
        method: "POST",
        headers,
        body: JSON.stringify({})
      }),
      {
        params: Promise.resolve({ id: PROJECT_ID })
      }
    );
    const secondPayload = await secondResponse.json();

    expect(secondResponse.status).toBe(200);
    expect(secondPayload.success).toBe(true);
    expect(secondPayload.data.message).toBe("Candidatura ja enviada");
    expect(secondPayload.data.application.created).toBe(false);
    expect(memoryStore.projectApplications).toHaveLength(1);
  });
});
