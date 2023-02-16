import { GenericAPI, NamedQuery, QueryNames } from "convex/api";
import { convexToJson } from "convex/values";
import { currentTimestamp } from "./ConvexServerProvider";
import { convexFetch } from "./query";

export type PreloadedQuery<
  API extends GenericAPI,
  Name extends QueryNames<API>
> = {
  _name: Name;
  _argsJSON: any;
  _valueJSON: any;
};

export async function preloadQueryGeneric<
  API extends GenericAPI,
  Name extends QueryNames<API>
>(
  name: Name,
  ...args: Parameters<NamedQuery<API, Name>>
): Promise<[ReturnType<NamedQuery<API, Name>>, PreloadedQuery<API, Name>]> {
  // TODO: Provide a way for developers to explicitly configure the client URL.
  const url = process.env.NEXT_PUBLIC_CONVEX_URL ?? "";
  const ts = currentTimestamp();
  const value = await convexFetch(url, name, args, ts);
  const preloaded = {
    _name: name,
    _argsJSON: convexToJson(args),
    _valueJSON: convexToJson(value),
  };
  return [value, preloaded];
}

export type PreloadQueryForAPI<API extends GenericAPI> = <
  Name extends QueryNames<API>
>(
  name: Name,
  ...args: Parameters<NamedQuery<API, Name>>
) => Promise<[ReturnType<NamedQuery<API, Name>>, PreloadedQuery<API, Name>]>;
