import app from "../src/app.js";
import { initializeDatabase } from "../src/database.js";

export default async function handler(request, response) {
  await initializeDatabase();
  const url = new URL(request.url, "http://localhost");
  const routePath = url.searchParams.get("__route");
  if (routePath !== null) {
    url.searchParams.delete("__route");
    request.url = routePath === "__root" ? `/${url.search}` : `/api/${routePath}${url.search}`;
  }
  return app(request, response);
}
