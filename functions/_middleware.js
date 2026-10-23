// Hide internal project files (database schemas, Cloudflare config) from the public site.
// Only the paths listed in /_routes.json (the API plus these files) run through Functions,
// so normal pages and images are still served directly without using Function requests.
export async function onRequest(context) {
  const path = new URL(context.request.url).pathname.toLowerCase();
  if (path.endsWith('.sql') || path.endsWith('.toml')) {
    return new Response('No encontrado', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
  return context.next();
}
