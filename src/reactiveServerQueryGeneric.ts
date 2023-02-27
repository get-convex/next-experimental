import { GenericAPI, NamedQuery, QueryNames } from "convex/api";
import { convexToJson } from "convex/values";
import { preloadQueryGeneric } from "./preloadQuery";
import { cache } from "react"

export const escapeQuote = (str: string) => str.replace(/"/g, '\\"');

const queryCache = cache(() => new Set());

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
    const q = escapeQuote(JSON.stringify({
        page: pathname,
        query: name,
        args: convexToJson(args),
    }));
    const v = escapeQuote(JSON.stringify(convexToJson(result)));

    const injectToStream = (globalThis as any).nextInjectToStream;
    const sent = queryCache();
    if (!sent.has(q+v)) {
      sent.add(q+v);
      injectToStream(
        `<script>self.__convexRSC = self.__convexRSC ?? {}; (self.__convexRSC["${k}"] = self.__convexRSC["${k}"] ?? new Map()).set("${q}", "${v}");</script>`
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