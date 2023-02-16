import {} from "react/experimental";

import React, { cache, createServerContext } from "react";
import { Timestamp } from "./types";
import { ClientProvider } from "./ClientProvider";
import process from "process";

export const currentTimestamp = cache(() => {
  // We pick a timestamp to render all child components at.  We use a half
  // second stale timestamp to avoid redundant waiting in case, due to rendering
  // server clock being ahead of the backend.
  // TODO(presley): This might be a problem since we don't advance the repeatable
  // read timestamp if the there are no writes to the server. We need to figure
  // out a solution. We can either pick even older timestamp or potentially force
  // bump the timestamp if such request arrives.
  const ts = Date.now() - 500;
  console.log("SSR starting at", ts);
  return ts;
});

type ServerContext = { ts: Timestamp } | null;

export const ConvexServerContext = createServerContext<ServerContext>(
  "convex-ts",
  null
);

export function ConvexServerProvider(props: {
  url?: string;
  children?: React.ReactNode;
}) {
  const url = props.url ?? process.env.NEXT_PUBLIC_CONVEX_URL ?? "";
  // Start evaluating a timestamp for the current request.
  const ts = currentTimestamp();
  return (
    <ConvexServerContext.Provider value={{ ts }}>
      <ClientProvider url={url}>{props.children}</ClientProvider>
    </ConvexServerContext.Provider>
  );
}
