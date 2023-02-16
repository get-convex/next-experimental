"use client";

import {
  use,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import { GenericAPI, NamedQuery, QueryNames } from "convex/api";
import { convexToJson, jsonToConvex } from "convex/values";
import { useConvexGeneric } from "convex/react";
import { ConvexServerContext } from "./ConvexServerProvider";
import { convexFetch } from "./query";

const cached = new Map();

const isServer = typeof window === "undefined";

// Hacky cache implementation that doesn't clear on Suspense, like useMemo.
// React should have some solution for this eventually per
// https://github.com/acdlite/rfcs/blob/first-class-promises/text/0000-first-class-support-for-promises.md#unresolved-questions
function cache<T>(factory: () => Promise<T>, args: any[]): Promise<T> {
  const key = JSON.stringify(args);
  let promise;
  if (cached.has(key)) {
    promise = cached.get(key);
  } else {
    // Cache the promise while it is running.
    promise = (async (): Promise<T> => {
      const result = await factory();
      cached.delete(key);
      return result;
    })();
    cached.set(key, promise);
  }
  return promise;
}

const escapeQuote = (str: string) => str.replace(/"/g, '\\"');

export function useQueryGeneric<
  API extends GenericAPI,
  Name extends QueryNames<API>
>(
  name: Name,
  ...args: Parameters<NamedQuery<API, Name>>
): ReturnType<NamedQuery<API, Name>> {
  const client = useConvexGeneric();
  const convexURL: string = (client as any).address;

  const ts = useContext(ConvexServerContext)?.ts;

  const watch = useMemo(
    () => client.watchQuery(name, args),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [name, client, JSON.stringify(convexToJson(args))]
  );

  // We use the following just to distinguish between components that were
  // initially rendered on the server vs components who were initially rendered
  // on the client.
  const [previouslyUsedServerSnapshot, setPreviouslyUsedServerSnapshot] =
    useState(false);
  const useServerSnapshot = useSyncExternalStore(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (onStoreChange: () => void) => () => {
      /* do nothing */
    },
    () => false,
    () => true
  );

  // Detect if this component was rendered on the server and hydrated on the client.
  if (!previouslyUsedServerSnapshot && useServerSnapshot) {
    setPreviouslyUsedServerSnapshot(true);
  }

  // For some reason, `useSyncExternalStore` throws errors during hydration. Perhaps
  // it is the same bug as https://github.com/vercel/next.js/issues/44686, but it
  // gives different stack traces. Perhaps it is different one. For now, just use our
  // manual `useEffect` and `useState` dance. Also, I can't seem to get the `setState`
  // code from `use_subscription.ts` to not infinite loop here.
  const [updatedValue, setUpdatedValue] = useState<any>(undefined);
  useEffect(() => {
    // NB: This code will not run on the server, so `updatedValue` will always
    // be undefined there.
    return watch.onUpdate(() => {
      setUpdatedValue(watch.localQueryResult());
    });
  }, [watch]);

  if (updatedValue !== undefined) {
    console.log(`${name} Rendering using value fetched from client`);
    return updatedValue;
  }

  if (useServerSnapshot || previouslyUsedServerSnapshot) {
    const key = JSON.stringify([name, args, ts]);

    // Since we `use` the initial value promise, hydration on the client will suspend until
    // the request completes. Then, it's important we guarantee that the value returned here
    // is exactly the same as the server to prevent hydration mismatches.
    if (isServer) {
      console.log(`${name} Rendering using ssr timestamp ${ts}.`);
      const promise = cache(
        () => convexFetch(convexURL, name, args, ts ?? 0),
        [convexURL, name, args, ts]
      );
      const result = use(promise);

      const injectToStream = (globalThis as any).nextInjectToStream;
      if (injectToStream !== undefined) {
        console.log(`${name} Injecting SSR data into stream`);
        const k = escapeQuote(key);
        const v = escapeQuote(JSON.stringify(convexToJson(result)));
        injectToStream(
          `<script>(self.__convexHydration = self.__convexHydration ?? {})["${k}"] = "${v}"</script>`
        );
      }
      return result;
    } else {
      const result = (self as any).__convexHydration?.[key];
      if (result !== undefined) {
        console.log(`${name} Hydrating on client using stream data`);
        return jsonToConvex(JSON.parse(result)) as any;
      } else {
        console.log(`${name} Hydrating on client using fetch`);
        const promise = cache(
          () => convexFetch(convexURL, name, args, ts ?? 0),
          [convexURL, name, args, ts]
        );
        return use(promise);
      }
    }
  }

  // Suspend the rendering instead of returning undefined. Developers can use
  // custom Suspense / loading.js patterns to show loading state.
  console.log(`${name} Initial render on client.`);
  // TODO(presley): This is a quite hacky since I only create subscription until
  // the the future, and later create a brand new one in useEffect. We should figure
  // out how to reuse onUpdate. Alternatively, we extend the API, so I can do a
  // single shot.
  const promise = cache(
    () =>
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      new Promise<ReturnType<NamedQuery<API, Name>>>((resolve, _) => {
        let unsubscribe: (() => void) | null = null;
        const onUpdate = () => {
          if (watch.localQueryResult() !== undefined) {
            setUpdatedValue(watch.localQueryResult());
            resolve(watch.localQueryResult());
            if (unsubscribe) {
              unsubscribe();
              unsubscribe = null;
            }
          }
        };
        unsubscribe = watch.onUpdate(onUpdate);
        onUpdate();
      }),
    [convexURL, name, args]
  );

  return use(promise);
}

export type UseQueryForAPI<API extends GenericAPI> = <
  Name extends QueryNames<API>
>(
  name: Name,
  ...args: Parameters<NamedQuery<API, Name>>
) => ReturnType<NamedQuery<API, Name>>;
