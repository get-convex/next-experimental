"use client";

import React, { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation"
import { useConvexGeneric } from "convex/react";
import { convexToJson, jsonToConvex } from "convex/values";

export function ReactiveServerContext(props: {children: React.ReactNode}) {
    const convex = useConvexGeneric();
    const pathname = usePathname();
    const router = useRouter();

    const serverQueries = useMemo(() => {
        if (typeof window === "undefined" || !pathname) {
            return [];
        }
        const rsc = (window as any).__convexRSC;
        const queries: any[] = (rsc && rsc[pathname]) ?? [];
        return queries.map(q => {
            const parsed = JSON.parse(q);
            const name = parsed.query;
            const args = jsonToConvex(parsed.args);
            const watch = convex.watchQuery(name, args as any);
            const serverValue = jsonToConvex(parsed.value);
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