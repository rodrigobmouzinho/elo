export const BRAZIL_STATE_OPTIONS = [
  { code: "AC", name: "Acre" },
  { code: "AL", name: "Alagoas" },
  { code: "AP", name: "Amapá" },
  { code: "AM", name: "Amazonas" },
  { code: "BA", name: "Bahia" },
  { code: "CE", name: "Ceará" },
  { code: "DF", name: "Distrito Federal" },
  { code: "ES", name: "Espírito Santo" },
  { code: "GO", name: "Goiás" },
  { code: "MA", name: "Maranhão" },
  { code: "MT", name: "Mato Grosso" },
  { code: "MS", name: "Mato Grosso do Sul" },
  { code: "MG", name: "Minas Gerais" },
  { code: "PA", name: "Pará" },
  { code: "PB", name: "Paraíba" },
  { code: "PR", name: "Paraná" },
  { code: "PE", name: "Pernambuco" },
  { code: "PI", name: "Piauí" },
  { code: "RJ", name: "Rio de Janeiro" },
  { code: "RN", name: "Rio Grande do Norte" },
  { code: "RS", name: "Rio Grande do Sul" },
  { code: "RO", name: "Rondônia" },
  { code: "RR", name: "Roraima" },
  { code: "SC", name: "Santa Catarina" },
  { code: "SP", name: "São Paulo" },
  { code: "SE", name: "Sergipe" },
  { code: "TO", name: "Tocantins" }
] as const;

export type BrazilStateCode = (typeof BRAZIL_STATE_OPTIONS)[number]["code"];

export type BrazilStateOption = {
  code: BrazilStateCode;
  name: string;
};

export type BrazilCityOption = {
  name: string;
};

const BRAZIL_STATE_CODES = new Set<string>(BRAZIL_STATE_OPTIONS.map((state) => state.code));

export function normalizePtBrSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function isBrazilStateCode(value: string): value is BrazilStateCode {
  return BRAZIL_STATE_CODES.has(value.trim().toUpperCase());
}

export function normalizeBrazilianPhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length > 11 && digits.startsWith("55")) {
    return digits.slice(2, 13);
  }

  return digits.slice(0, 11);
}

export function isValidBrazilianPhone(value: string) {
  const digits = normalizeBrazilianPhone(value);
  return /^([1-9]{2})(?:9?\d{8})$/.test(digits);
}

export function isValidBrazilianMobile(value: string) {
  const digits = normalizeBrazilianPhone(value);
  return /^([1-9]{2})9\d{8}$/.test(digits);
}

export function formatBrazilianPhoneInput(value: string) {
  const digits = normalizeBrazilianPhone(value);

  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);

  if (rest.length <= 4) {
    return `(${ddd}) ${rest}`;
  }

  if (digits.length <= 10) {
    return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4, 8)}`;
  }

  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5, 9)}`;
}
