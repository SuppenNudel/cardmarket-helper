const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const SESSION_TTL_SECONDS = 10 * 60;
const STATE_PATTERN = /^[A-Za-z0-9_-]{43,128}$/;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function getRedirectUri(url, env) {
  return env.GOOGLE_REDIRECT_URI || `${url.origin}/callback`;
}

function validateEnvironment(env) {
  const missing = [];
  if (!env.GOOGLE_CLIENT_ID) missing.push("GOOGLE_CLIENT_ID");
  if (!env.GOOGLE_CLIENT_SECRET) missing.push("GOOGLE_CLIENT_SECRET");
  if (!env.OAUTH_SESSIONS) missing.push("OAUTH_SESSIONS KV binding");
  if (missing.length > 0) {
    throw new Error(`Worker OAuth environment is missing: ${missing.join(", ")}.`);
  }
}

async function prepareAuthorization(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }
  const state = body.state || "";
  if (!STATE_PATTERN.test(state)) {
    return jsonResponse({ error: "Invalid OAuth state." }, 400);
  }

  await env.OAUTH_SESSIONS.put(`oauth:${state}`, JSON.stringify({ status: "pending" }), {
    expirationTtl: SESSION_TTL_SECONDS,
  });
  return jsonResponse({ status: "pending" });
}

async function startAuthorization(url, env) {
  const state = url.searchParams.get("state") || "";
  if (!STATE_PATTERN.test(state)) {
    return new Response("Invalid OAuth state.", { status: 400 });
  }
  if (!await env.OAUTH_SESSIONS.get(`oauth:${state}`)) {
    return new Response("OAuth session expired or was not prepared by the extension.", { status: 400 });
  }

  const authUrl = new URL(GOOGLE_AUTH_URL);
  authUrl.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: getRedirectUri(url, env),
    response_type: "code",
    scope: GOOGLE_DRIVE_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  }).toString();
  return Response.redirect(authUrl.toString(), 302);
}

async function handleCallback(url, env) {
  const state = url.searchParams.get("state") || "";
  if (!STATE_PATTERN.test(state)) {
    return new Response("Invalid OAuth state.", { status: 400 });
  }

  const sessionKey = `oauth:${state}`;
  const pendingSession = await env.OAUTH_SESSIONS.get(sessionKey);
  if (!pendingSession) {
    return new Response("OAuth session expired or was not started by the extension.", { status: 400 });
  }

  const oauthError = url.searchParams.get("error");
  if (oauthError) {
    await env.OAUTH_SESSIONS.put(sessionKey, JSON.stringify({ status: "error", error: oauthError }), {
      expirationTtl: SESSION_TTL_SECONDS,
    });
    return new Response("Google Drive access was not granted. You can close this tab.", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=UTF-8", "Cache-Control": "no-store" },
    });
  }

  const code = url.searchParams.get("code");
  if (!code) {
    return new Response("Missing authorization code.", { status: 400 });
  }

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: getRedirectUri(url, env),
      grant_type: "authorization_code",
    }),
  });
  const tokens = await tokenResponse.json();

  if (!tokenResponse.ok || !tokens.access_token || !tokens.refresh_token) {
    const error = tokens.error_description || tokens.error || "Google token exchange failed.";
    await env.OAUTH_SESSIONS.put(sessionKey, JSON.stringify({ status: "error", error }), {
      expirationTtl: SESSION_TTL_SECONDS,
    });
    return new Response("Google token exchange failed. You can close this tab.", {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=UTF-8", "Cache-Control": "no-store" },
    });
  }

  await env.OAUTH_SESSIONS.put(sessionKey, JSON.stringify({
    status: "complete",
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in || 3600,
  }), { expirationTtl: SESSION_TTL_SECONDS });

  return new Response("Google Drive connected. You can close this tab and return to Cardmarket Helper.", {
    headers: { "Content-Type": "text/plain; charset=UTF-8", "Cache-Control": "no-store" },
  });
}

async function getAuthorizationStatus(url, env) {
  const state = url.searchParams.get("state") || "";
  if (!STATE_PATTERN.test(state)) {
    return jsonResponse({ error: "Invalid OAuth state." }, 400);
  }

  const sessionKey = `oauth:${state}`;
  const session = await env.OAUTH_SESSIONS.get(sessionKey, "json");
  if (!session) {
    return jsonResponse({ error: "OAuth session expired." }, 404);
  }
  if (session.status === "pending") {
    return jsonResponse({ status: "pending" }, 202);
  }

  await env.OAUTH_SESSIONS.delete(sessionKey);
  return jsonResponse(session, session.status === "complete" ? 200 : 400);
}

async function refreshAccessToken(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }
  if (!body.refreshToken) {
    return jsonResponse({ error: "Missing refreshToken." }, 400);
  }

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: body.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const tokens = await tokenResponse.json();
  return jsonResponse(tokens, tokenResponse.status);
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    try {
      validateEnvironment(env);
      const url = new URL(request.url);
      if (url.pathname === "/session" && request.method === "POST") {
        return prepareAuthorization(request, env);
      }
      if (url.pathname === "/auth" && request.method === "GET") {
        return startAuthorization(url, env);
      }
      if (url.pathname === "/callback" && request.method === "GET") {
        return handleCallback(url, env);
      }
      if (url.pathname === "/status" && request.method === "GET") {
        return getAuthorizationStatus(url, env);
      }
      if (url.pathname === "/refresh" && request.method === "POST") {
        return refreshAccessToken(request, env);
      }
      return new Response("Not Found", { status: 404 });
    } catch (error) {
      return jsonResponse({ error: error.message || String(error) }, 500);
    }
  },
};
