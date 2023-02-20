import { GenericAPI, NamedQuery, QueryNames } from "convex/api";
import { convexToJson } from "convex/values";
import { headers } from "next/headers";
import { preloadQueryGeneric } from "./preloadQuery";

export const escapeQuote = (str: string) => str.replace(/"/g, '\\"');

export async function reactiveServerQueryGeneric<
  API extends GenericAPI,
  Name extends QueryNames<API>
>(
  name: Name,
  ...args: Parameters<NamedQuery<API, Name>>
): Promise<ReturnType<NamedQuery<API, Name>>> {
    const url = new URL(headers().get("x-url")!);
    const [result] = await preloadQueryGeneric(name, ...args);

    const k = escapeQuote(url.pathname);
    const query = {
        page: url.pathname,
        query: name,
        args: convexToJson(args),
        value: convexToJson(result),
    };
    const v = escapeQuote(JSON.stringify(query));

    const injectToStream = (globalThis as any).nextInjectToStream;
    injectToStream(
        `<script>self.__convexRSC = self.__convexRSC ?? {}; (self.__convexRSC["${k}"] = self.__convexRSC["${k}"] ?? []).push("${v}");</script>`
    );

    return result;
}

export type ReactiveServerQueryForAPI<API extends GenericAPI> = <
  Name extends QueryNames<API>
>(
    name: Name,
    ...args: Parameters<NamedQuery<API, Name>>
  ) => Promise<ReturnType<NamedQuery<API, Name>>>;