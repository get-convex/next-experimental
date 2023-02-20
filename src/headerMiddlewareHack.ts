import { NextResponse } from "next/server"

// HACK: https://github.com/vercel/next.js/issues/43704#issuecomment-1411186664
export function headerMiddlewareHack(request: Request) {
    // Store current request url in a custom header, which you can read later
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-url', request.url);

    return NextResponse.next({
    request: {
        // Apply new request headers
        headers: requestHeaders,
    }
    });
}