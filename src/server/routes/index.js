import { handleProfileRoutes } from './profile.js';
import { serveFrontend } from './static.js';
import { writeJson } from './http.js';
export const createRequestHandler = (handleRoomRoutes) => async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const apiPath = pathname.replace(/^\/tablebones(?=\/api)/, '');
  try {
    await handleProfileRoutes(req, res, apiPath);
    if (res.writableEnded) return;
    await handleRoomRoutes(req, res, apiPath);
    if (res.writableEnded) return;
  } catch (error) {
    console.error('API request failed', error);
    writeJson(res, 400, { error: error instanceof Error ? error.message : 'Request failed.' });
    return;
  }
  serveFrontend(req, res, pathname);
};
