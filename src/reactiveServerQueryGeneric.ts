import { GenericAPI, NamedQuery, QueryNames } from "convex/api";
import { convexToJson } from "convex/values";
import { preloadQueryGeneric } from "./preloadQuery";
import { cache } from "react"

export const escapeQuote = (str: string) => str.replace(/"/g, '\\"');

const queryCache = (() => new Set());

export async function reactiveServerQueryGeneric<
  API extends GenericAPI,
  Name extends QueryNames<API>
>(
  name: Name,
  ...args: Parameters<NamedQuery<API, Name>>
): Promise<ReturnType<NamedQuery<API, Name>>> {
    // TODO: Figure out the proper path or component.
    const pathname = "";
    const [result] = await preloadQueryGeneric(name, ...args);

    const k = escapeQuote(pathname);
    const query = {
        page: pathname,
        query: name,
        args: convexToJson(args),
        value: convexToJson(result),
    };
    const v = escapeQuote(JSON.stringify(query));

    const injectToStream = (globalThis as any).nextInjectToStream;
    const sent = queryCache();
    if (!sent.has(v)) {
      sent.add(v);
      injectToStream(
        `<script>self.__convexRSC = self.__convexRSC ?? {}; (self.__convexRSC["${k}"] = self.__convexRSC["${k}"] ?? new Set()).add("${v}");</script>`
      );
    }

    return result;
}

export type ReactiveServerQueryForAPI<API extends GenericAPI> = <
  Name extends QueryNames<API>
>(
    name: Name,
    ...args: Parameters<NamedQuery<API, Name>>
  ) => Promise<ReturnType<NamedQuery<API, Name>>>;