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
          summary: "Produto para aproximar founders e investidores com networking validado.",
          businessAreas: ["Marketplace", "B2B"],
          vision:
            "Criar um ambiente de conexoes de negocio que ajude founders e investidores a se encontrarem com mais contexto, afinidade estrategica e velocidade.",
          needs: [
            {
              title: "Cofounder de tecnologia",
              description: "Experiencia com produto digital e arquitetura de marketplace B2B."
            }
          ],
          galleryImageUrls: ["https://example.com/mockup-1.png"]
        })
      })
    );
    const createPayload = await createResponse.json();
    const createdId = createPayload.data.id as string;

    expect(createResponse.status).toBe(201);
    expect(createPayload.success).toBe(true);
    expect(createPayload.data.title).toBe("Plataforma de conexoes B2B");
    expect(createPayload.data.summary).toBe(
      "Produto para aproximar founders e investidores com networking validado."
    );
    expect(createPayload.data.documentationFiles).toEqual([]);

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

  it("uploads project media in mock mode and persists documentation metadata on publish", async () => {
    const { POST: uploadProjectFilesPost } = await import(
      "../../app/api/app/projects/uploads/route"
    );
    const { POST: createProjectPost } = await import("../../app/api/app/projects/route");

    const uploadForm = new FormData();
    uploadForm.append("kind", "documentation");
    uploadForm.append(
      "files",
      new File(["%PDF-1.4 mock"], "pitch-deck.pdf", {
        type: "application/pdf"
      })
    );

    const uploadResponse = await uploadProjectFilesPost(
      new Request("http://localhost/api/app/projects/uploads", {
        method: "POST",
        headers: {
          authorization: "Bearer mock-token",
          "x-dev-role": "member"
        },
        body: uploadForm
      })
    );
    const uploadPayload = await uploadResponse.json();

    expect(uploadResponse.status).toBe(201);
    expect(uploadPayload.success).toBe(true);
    expect(uploadPayload.data.files).toHaveLength(1);
    expect(uploadPayload.data.files[0].contentType).toBe("application/pdf");
    expect(uploadPayload.data.files[0].url).toContain("data:application/pdf;base64,");

    const createResponse = await createProjectPost(
      new Request("http://localhost/api/app/projects", {
        method: "POST",
        headers: {
          authorization: "Bearer mock-token",
          "x-dev-role": "member",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          title: "Projeto com documentacao",
          summary: "Projeto com anexo PDF e mockups reais.",
          businessAreas: ["Marketplace", "B2B"],
          vision:
            "Criar um ambiente com proposta objetiva, documentacao em PDF e provas visuais para a captacao de parceiros.",
          needs: [
            {
              title: "Produto",
              description: "Pessoa para acelerar produto e estrutura de MVP."
            }
          ],
          galleryImageUrls: ["https://example.com/mockup-1.webp"],
          documentationFiles: uploadPayload.data.files
        })
      })
    );
    const createPayload = await createResponse.json();

    expect(createResponse.status).toBe(201);
    expect(createPayload.data.documentationFiles).toHaveLength(1);
    expect(createPayload.data.documentationFiles[0]).toMatchObject({
      name: "pitch-deck.pdf",
      contentType: "application/pdf"
    });
  });
});
