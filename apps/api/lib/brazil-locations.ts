import type { BrazilCityOption, BrazilStateCode, BrazilStateOption } from "@elo/core";
import {
  BRAZIL_STATE_OPTIONS,
  isBrazilStateCode,
  normalizePtBrSearchText
} from "@elo/core";

const IBGE_BASE_URL = "https://servicodados.ibge.gov.br/api/v1/localidades";
const REQUEST_OPTIONS: RequestInit = {
  headers: {
    accept: "application/json"
  },
  next: {
    revalidate: 24 * 60 * 60
  }
};

type IbgeState = {
  sigla: string;
  nome: string;
};

type IbgeCity = {
  nome: string;
};

export class BrazilLocationsServiceError extends Error {}
export class BrazilLocationValidationError extends Error {}

function assertOk(response: Response, fallbackMessage: string) {
  if (!response.ok) {
    throw new BrazilLocationsServiceError(fallbackMessage);
  }
}

export async function listBrazilStates(fetchImpl: typeof fetch = fetch): Promise<BrazilStateOption[]> {
  let response: Response;

  try {
    response = await fetchImpl(`${IBGE_BASE_URL}/estados`, REQUEST_OPTIONS);
  } catch {
    throw new BrazilLocationsServiceError("Não foi possível consultar os estados do Brasil agora.");
  }

  assertOk(response, "Não foi possível consultar os estados do Brasil agora.");

  const payload = (await response.json()) as IbgeState[];

  return payload
    .map((state) => ({
      code: state.sigla.trim().toUpperCase() as BrazilStateCode,
      name: state.nome.trim()
    }))
    .filter((state) => isBrazilStateCode(state.code))
    .sort((first, second) => first.name.localeCompare(second.name, "pt-BR"));
}

export async function listBrazilCitiesByState(
  state: string,
  fetchImpl: typeof fetch = fetch
): Promise<BrazilCityOption[]> {
  const normalizedState = state.trim().toUpperCase();

  if (!isBrazilStateCode(normalizedState)) {
    throw new BrazilLocationValidationError("Selecione uma UF válida.");
  }

  let response: Response;

  try {
    response = await fetchImpl(
      `${IBGE_BASE_URL}/estados/${normalizedState}/municipios`,
      REQUEST_OPTIONS
    );
  } catch {
    throw new BrazilLocationsServiceError(
      `Não foi possível consultar as cidades de ${normalizedState} agora.`
    );
  }

  assertOk(response, `Não foi possível consultar as cidades de ${normalizedState} agora.`);

  const payload = (await response.json()) as IbgeCity[];

  return payload
    .map((city) => ({
      name: city.nome.trim()
    }))
    .sort((first, second) => first.name.localeCompare(second.name, "pt-BR"));
}

export async function assertBrazilCityBelongsToState(state: string, city: string) {
  const normalizedCity = city.trim();

  if (normalizedCity.length < 2) {
    throw new BrazilLocationValidationError("Selecione uma cidade.");
  }

  const cities = await listBrazilCitiesByState(state);
  const normalizedSelectedCity = normalizePtBrSearchText(normalizedCity);
  const belongsToState = cities.some(
    (currentCity) => normalizePtBrSearchText(currentCity.name) === normalizedSelectedCity
  );

  if (!belongsToState) {
    const normalizedState = state.trim().toUpperCase();
    const stateName =
      BRAZIL_STATE_OPTIONS.find((currentState) => currentState.code === normalizedState)?.name ??
      normalizedState;

    throw new BrazilLocationValidationError(
      `Selecione uma cidade válida para ${stateName}.`
    );
  }
}
