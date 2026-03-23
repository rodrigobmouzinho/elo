import { fail, ok } from "../../../../../../../lib/http";
import {
  BrazilLocationsServiceError,
  BrazilLocationValidationError,
  listBrazilCitiesByState
} from "../../../../../../../lib/brazil-locations";

type RouteContext = {
  params: Promise<{ uf: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { uf } = await context.params;
    const cities = await listBrazilCitiesByState(uf);
    return ok(cities);
  } catch (error) {
    if (error instanceof BrazilLocationValidationError) {
      return fail(error.message, 400);
    }

    if (error instanceof BrazilLocationsServiceError) {
      return fail(error.message, 503);
    }

    return fail(`Falha ao consultar as cidades: ${(error as Error).message}`, 500);
  }
}
