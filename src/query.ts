import { GenericAPI, NamedQuery, QueryNames } from "convex/api";
import { convexToJson, jsonToConvex } from "convex/values";
import { currentTimestamp } from "./ConvexServerProvider";

export async function convexFetch(
  convexURL: string,
  name: string,
  arglist: any[],
  ts?: number
): Promise<any> {
  const version = "0.8.0";
  const address = `${convexURL}/api`;
  const argsJSON = JSON.stringify(convexToJson(arglist));
  const argsComponent = encodeURIComponent(argsJSON);
  let url = `${address}/${version}/udf?path=${name}&args=${argsComponent}`;
  if (ts) {
    url += `&ts=${ts}`;
  }
  const response = await fetch(url);
  const respJSON = await response.json();
  const value = jsonToConvex(respJSON.value);
  if (!respJSON.success) {
    throw new Error("UDF failed");
  }
  return value;
}

export function queryGeneric<
  API extends GenericAPI,
  Name extends QueryNames<API>
>(
  name: Name,
  ...args: Parameters<NamedQuery<API, Name>>
): Promise<ReturnType<NamedQuery<API, Name>>> {
  // TODO: Provide a way for developers to explicitly configure the client URL.
  const url = process.env.NEXT_PUBLIC_CONVEX_URL ?? "";
  const ts = currentTimestamp();
  return convexFetch(url, name, args, ts);
}

export type QueryForAPI<API extends GenericAPI> = <
  Name extends QueryNames<API>
>(
  name: Name,
  ...args: Parameters<NamedQuery<API, Name>>
) => Promise<ReturnType<NamedQuery<API, Name>>>;
