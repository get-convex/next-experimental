"use client";

import { GenericAPI, NamedQuery, QueryNames } from "convex/api";
import { useQueryGeneric } from "convex/react";
import { jsonToConvex } from "convex/values";
import { useMemo } from "react";
import { PreloadedQuery } from "./preloadQuery";

export function usePreloadedQueryGeneric<
  API extends GenericAPI,
  Name extends QueryNames<API>
>(q: PreloadedQuery<API, Name>): ReturnType<NamedQuery<API, Name>> {
  const args = useMemo(
    () => jsonToConvex(q._argsJSON),
    [q._argsJSON]
  ) as Parameters<NamedQuery<API, Name>>;
  const value = useMemo(
    () => jsonToConvex(q._valueJSON),
    [q._valueJSON]
  ) as ReturnType<NamedQuery<API, Name>>;
  const result = useQueryGeneric(q._name, ...args) ?? value;
  return result;
}

export type UsePreloadedQueryForAPI<API extends GenericAPI> = <
  Name extends QueryNames<API>
>(
  q: PreloadedQuery<API, Name>
) => ReturnType<NamedQuery<API, Name>>;
