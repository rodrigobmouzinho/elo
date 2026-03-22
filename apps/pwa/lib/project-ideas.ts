export type ProjectNeed = {
  title: string;
  description: string;
};

export type ProjectIdea = {
  id: string;
  title: string;
  summary: string;
  category: string;
  description: string;
  lookingFor: string;
  businessAreas: string[];
  vision: string;
  needs: ProjectNeed[];
  galleryImageUrls: string[];
  ownerName?: string;
  ownerAvatarUrl?: string | null;
  ownerMemberId?: string | null;
};

export type ProjectDraft = {
  title: string;
  summary: string;
  businessAreas: string[];
  vision: string;
  needs: ProjectNeed[];
  galleryImageUrls: string[];
};

export function createEmptyProjectNeed(): ProjectNeed {
  return {
    title: "",
    description: ""
  };
}

export function createEmptyProjectDraft(): ProjectDraft {
  return {
    title: "",
    summary: "",
    businessAreas: [""],
    vision: "",
    needs: [createEmptyProjectNeed()],
    galleryImageUrls: [""]
  };
}

export function normalizeApiError(raw: string) {
  const normalized = raw.trim().toLowerCase();

  if (normalized.includes("network") || normalized.includes("conexao")) {
    return "Nao foi possivel conectar ao servidor. Tente novamente em instantes.";
  }

  return raw;
}

export function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function excerpt(value: string, max = 120) {
  if (value.length <= max) return value;
  return `${value.slice(0, max).trimEnd()}...`;
}

function cleanStringList(value: string[], max: number) {
  const cleaned = value
    .map((entry) => entry.trim())
    .filter(Boolean);

  return [...new Set(cleaned)].slice(0, max);
}

function cleanNeeds(needs: ProjectNeed[]) {
  return needs
    .map((need) => ({
      title: need.title.trim(),
      description: need.description.trim()
    }))
    .filter((need) => need.title.length > 0 && need.description.length > 0)
    .slice(0, 6);
}

export function buildProjectSearchIndex(project: ProjectIdea) {
  return normalizeSearchValue(
    [
      project.title,
      project.summary,
      project.category,
      project.businessAreas.join(" "),
      project.vision,
      project.lookingFor,
      project.needs.map((need) => `${need.title} ${need.description}`).join(" ")
    ].join(" ")
  );
}

export function projectDraftFromIdea(project: ProjectIdea): ProjectDraft {
  return {
    title: project.title,
    summary: project.summary,
    businessAreas: project.businessAreas.length > 0 ? [...project.businessAreas] : [project.category],
    vision: project.vision,
    needs: project.needs.length > 0 ? project.needs.map((need) => ({ ...need })) : [createEmptyProjectNeed()],
    galleryImageUrls:
      project.galleryImageUrls.length > 0 ? [...project.galleryImageUrls] : [""]
  };
}

export function projectPayloadFromDraft(draft: ProjectDraft) {
  return {
    title: draft.title.trim(),
    summary: draft.summary.trim(),
    businessAreas: cleanStringList(draft.businessAreas, 5),
    vision: draft.vision.trim(),
    needs: cleanNeeds(draft.needs),
    galleryImageUrls: cleanStringList(draft.galleryImageUrls, 8)
  };
}
