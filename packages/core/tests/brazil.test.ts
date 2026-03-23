import { describe, expect, it } from "vitest";
import {
  formatBrazilianPhoneInput,
  isBrazilStateCode,
  isValidBrazilianMobile,
  isValidBrazilianPhone,
  normalizeBrazilianPhone,
  normalizePtBrSearchText
} from "../src/brazil";

describe("helpers do Brasil", () => {
  it("normaliza telefone com ou sem codigo do pais", () => {
    expect(normalizeBrazilianPhone("+55 (11) 91234-5678")).toBe("11912345678");
    expect(normalizeBrazilianPhone("(83) 3333-4444")).toBe("8333334444");
  });

  it("formata telefone brasileiro para exibicao", () => {
    expect(formatBrazilianPhoneInput("11912345678")).toBe("(11) 91234-5678");
    expect(formatBrazilianPhoneInput("8333334444")).toBe("(83) 3333-4444");
  });

  it("valida celular e telefone brasileiros", () => {
    expect(isValidBrazilianMobile("11912345678")).toBe(true);
    expect(isValidBrazilianMobile("1132345678")).toBe(false);
    expect(isValidBrazilianPhone("8333334444")).toBe(true);
  });

  it("valida siglas oficiais de UF", () => {
    expect(isBrazilStateCode("PB")).toBe(true);
    expect(isBrazilStateCode("XX")).toBe(false);
  });

  it("normaliza texto pt-BR para comparacoes", () => {
    expect(normalizePtBrSearchText(" São José do Rio Preto ")).toBe("sao jose do rio preto");
  });
});
