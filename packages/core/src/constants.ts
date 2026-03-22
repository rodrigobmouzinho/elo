export const ELO_BRAND = {
  colorPrimary: "#865AFF",
  colorDark: "#000000",
  colorLight: "#F0F5FF",
  typographyPrimary: "Kurino",
  typographySecondary: "Anek Latin"
} as const;

export const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/gamificacao", label: "Gamificacao" },
  { href: "/membros", label: "Membros" },
  { href: "/projetos", label: "Projetos" }
] as const;

export const PROJECT_ASSET_BUCKET = "project-assets";
export const PROJECT_GALLERY_MAX_FILES = 8;
export const PROJECT_DOCUMENT_MAX_FILES = 3;
export const PROJECT_IMAGE_SOURCE_MAX_BYTES = 10 * 1024 * 1024;
export const PROJECT_IMAGE_UPLOAD_MAX_BYTES = 3 * 1024 * 1024;
export const PROJECT_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
export const PROJECT_IMAGE_MAX_DIMENSION = 1600;
export const PROJECT_GALLERY_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp"
] as const;
export const PROJECT_DOCUMENT_ACCEPTED_TYPES = ["application/pdf"] as const;
