import { GenericAPI, NamedQuery, QueryNames } from "convex/api";
import { convexToJson } from "convex/values";
import { preloadQueryGeneric } from "./preloadQuery";
import { cache } from "react"
import { currentTimestamp } from "./ConvexServerProvider";

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
    const [result] = await preloadQueryGeneric(name, ...args);

    const k = escapeQuote(JSON.stringify({
        query: name,
        args: convexToJson(args),
    }));
    const ts = currentTimestamp();
    const v = escapeQuote(JSON.stringify(convexToJson(result)));

    const injectToStream = (globalThis as any).nextInjectToStream;
    const sent = queryCache();
    if (!sent.has(k+ts)) {
      sent.add(k+ts);
      injectToStream(
        `<script>self.__convexRSC = self.__convexRSC ?? new Map(); oldTs = self.__convexRSC.get("${k}")?.ts ?? 0; if (${ts} > oldTs) { self.__convexRSC.set("${k}", { ts: ${ts}, value: "${v}"}); };</script>`
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