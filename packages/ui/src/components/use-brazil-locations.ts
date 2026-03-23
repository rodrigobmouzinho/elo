"use client";

import type { BrazilCityOption, BrazilStateOption } from "@elo/core";
import { BRAZIL_STATE_OPTIONS, isBrazilStateCode } from "@elo/core";
import { useCallback, useEffect, useMemo, useState } from "react";

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: string;
};

type UseBrazilLocationsOptions = {
  selectedState: string;
  selectedCity?: string;
  basePath?: string;
};

type UseBrazilLocationsResult = {
  states: BrazilStateOption[];
  cities: BrazilCityOption[];
  loadingStates: boolean;
  loadingCities: boolean;
  statesError: string | null;
  citiesError: string | null;
  reloadStates: () => Promise<void>;
  reloadCities: () => Promise<void>;
};

async function parseEnvelope<T>(response: Response, fallbackError: string) {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    throw new Error(fallbackError);
  }

  const payload = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || !payload.success || payload.data === undefined) {
    throw new Error(payload.error ?? fallbackError);
  }

  return payload.data;
}

export function useBrazilLocations({
  selectedState,
  selectedCity = "",
  basePath = "/backend/public/locations"
}: UseBrazilLocationsOptions): UseBrazilLocationsResult {
  const [states, setStates] = useState<BrazilStateOption[]>([]);
  const [cities, setCities] = useState<BrazilCityOption[]>([]);
  const [loadingStates, setLoadingStates] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);
  const [statesError, setStatesError] = useState<string | null>(null);
  const [citiesError, setCitiesError] = useState<string | null>(null);

  const normalizedState = selectedState.trim().toUpperCase();

  const loadStates = useCallback(async () => {
    setLoadingStates(true);
    setStatesError(null);

    try {
      const response = await fetch(`${basePath}/states`, { cache: "force-cache" });
      const data = await parseEnvelope<BrazilStateOption[]>(
        response,
        "Não foi possível carregar os estados agora."
      );
      setStates(data);
    } catch (error) {
      setStates([...BRAZIL_STATE_OPTIONS]);
      setStatesError(null);
    } finally {
      setLoadingStates(false);
    }
  }, [basePath]);

  const loadCities = useCallback(async () => {
    if (!isBrazilStateCode(normalizedState)) {
      setCities([]);
      setCitiesError(null);
      setLoadingCities(false);
      return;
    }

    setLoadingCities(true);
    setCitiesError(null);

    try {
      const response = await fetch(`${basePath}/states/${normalizedState}/cities`, {
        cache: "force-cache"
      });
      const data = await parseEnvelope<BrazilCityOption[]>(
        response,
        "Não foi possível carregar as cidades agora."
      );
      setCities(data);
    } catch (error) {
      setCities([]);
      setCitiesError((error as Error).message);
    } finally {
      setLoadingCities(false);
    }
  }, [basePath, normalizedState]);

  useEffect(() => {
    void loadStates();
  }, [loadStates]);

  useEffect(() => {
    void loadCities();
  }, [loadCities]);

  const resolvedCities = useMemo(() => {
    const cityName = selectedCity.trim();

    if (!cityName) {
      return cities;
    }

    const exists = cities.some((city) => city.name === cityName);
    return exists ? cities : [{ name: cityName }, ...cities];
  }, [cities, selectedCity]);

  return {
    states,
    cities: resolvedCities,
    loadingStates,
    loadingCities,
    statesError,
    citiesError,
    reloadStates: loadStates,
    reloadCities: loadCities
  };
}
