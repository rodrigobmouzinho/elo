import { beforeEach, describe, expect, it, vi } from "vitest";

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json"
    }
  });
}

describe("localidades do Brasil", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("normaliza estados vindos do IBGE", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse([
          { sigla: "SP", nome: "São Paulo" },
          { sigla: "PB", nome: "Paraíba" }
        ])
      )
    );

    const { listBrazilStates } = await import("../../lib/brazil-locations");
    const states = await listBrazilStates();

    expect(states).toEqual([
      { code: "PB", name: "Paraíba" },
      { code: "SP", name: "São Paulo" }
    ]);
  });

  it("valida cidade dentro da UF selecionada", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        Promise.resolve(
          jsonResponse([
          { nome: "João Pessoa" },
          { nome: "Campina Grande" }
          ])
        )
      )
    );

    const { assertBrazilCityBelongsToState } = await import("../../lib/brazil-locations");

    await expect(assertBrazilCityBelongsToState("PB", "Joao Pessoa")).resolves.toBeUndefined();
    await expect(assertBrazilCityBelongsToState("PB", "Recife")).rejects.toThrow(
      "Selecione uma cidade válida para Paraíba."
    );
  });

  it("retorna os estados pela rota pública", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse([{ sigla: "PB", nome: "Paraíba" }]))
    );

    const { GET } = await import("../../app/api/public/locations/states/route");
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data).toEqual([{ code: "PB", name: "Paraíba" }]);
  });

  it("retorna erro 400 para UF inválida na rota de cidades", async () => {
    const { GET } = await import("../../app/api/public/locations/states/[uf]/cities/route");
    const response = await GET(new Request("http://localhost/api/public/locations/states/XX/cities"), {
      params: Promise.resolve({ uf: "XX" })
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Selecione uma UF válida.");
  });
});
