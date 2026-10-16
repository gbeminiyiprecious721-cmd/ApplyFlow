// Every HTML response, including errors, declares its actual UTF-8 encoding.
export function createStaticHandler(lookup) {
  return async function fetch(request) {
    if (!["GET", "HEAD"].includes(request.method))
      return new Response("<!doctype html><p>Method not allowed</p>", {
        status: 405,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          Allow: "GET, HEAD",
        },
      });
    const path = new URL(request.url).pathname;
    const asset = await lookup(path === "/" ? "/index.html" : path);
    if (!asset)
      return new Response(
        request.method === "HEAD"
          ? null
          : "<!doctype html><p>Page not found</p>",
        {
          status: 404,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        },
      );
    const type = asset.type.startsWith("text/html")
      ? "text/html; charset=utf-8"
      : asset.type;
    return new Response(request.method === "HEAD" ? null : asset.body, {
      headers: { "Content-Type": type, "X-Content-Type-Options": "nosniff" },
    });
  };
}
