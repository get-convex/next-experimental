"use client";

import React, { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation"
import { useConvexGeneric } from "convex/react";
import { convexToJson, jsonToConvex } from "convex/values";

export function ReactiveServerContext(props: {children: React.ReactNode}) {
    const convex = useConvexGeneric();
    // TODO: Figure out the proper path or component.
    const pathname = "";
    const router = useRouter();

    const serverQueries = useMemo(() => {
        if (typeof window === "undefined") {
            return [];
        }
        const rsc = (window as any).__convexRSC;
        const queries: Map<string, any> = rsc ?? new Map();
        return Array.from(queries.entries()).map(q => {
            const key = JSON.parse(q[0]);
            const name = key.query;
            const args = jsonToConvex(key.args);
            const watch = convex.watchQuery(name, args as any);
            const result = JSON.parse(q[1].value);
            const serverValue = jsonToConvex(result);
            return { name, args, watch, serverValue };
        });
    }, [pathname, convex])

    useEffect(() => {
        const destructors: any[] = [];
        for (const query of serverQueries) {
            const watch = query.watch;
            const d = watch.onUpdate(() => {
                const currentResult = watch.localQueryResult();
                if (currentResult !== undefined) {
                    if (JSON.stringify(convexToJson(currentResult)) !== JSON.stringify(convexToJson(query.serverValue))) {
                        router.refresh();
                    }
                }
            })
            destructors.push(d);
        }
        return () => {
            for (const d of destructors) {
                d();
            }
        }
    }, serverQueries);

    return <>{props.children}</>;
}