import { fail, ok } from "../../../../../lib/http";
import {
  BrazilLocationsServiceError,
  listBrazilStates
} from "../../../../../lib/brazil-locations";

export async function GET() {
  try {
    const states = await listBrazilStates();
    return ok(states);
  } catch (error) {
    if (error instanceof BrazilLocationsServiceError) {
      return fail(error.message, 503);
    }

    return fail(`Falha ao consultar os estados: ${(error as Error).message}`, 500);
  }
}
