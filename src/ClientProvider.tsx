"use client";

import React from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

// TODO(presley): Do we need module level cache or is it ok to create a new
// client every time the ClientContext gets rerendered?
const urlToClient = new Map();

export function ClientProvider(props: {
  url: string;
  children?: React.ReactNode;
}) {
  let client;
  if (urlToClient.has(props.url)) {
    client = urlToClient.get(props.url);
  } else {
    client = new ConvexReactClient(props.url);
    urlToClient.set(props.url, client);
  }
  return <ConvexProvider client={client}>{props.children}</ConvexProvider>;
}
