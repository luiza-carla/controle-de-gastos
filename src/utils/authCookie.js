const AUTH_COOKIE_NAME = 'auth_token';

function getAuthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}

function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
}

function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME, getAuthCookieOptions());
}

function extractAuthToken(req) {
  const cookieHeader = req?.headers?.cookie;
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [rawName, ...rawValueParts] = cookie.trim().split('=');
    if (rawName !== AUTH_COOKIE_NAME) {
      continue;
    }

    const rawValue = rawValueParts.join('=');
    return rawValue ? decodeURIComponent(rawValue) : null;
  }

  return null;
}

module.exports = {
  AUTH_COOKIE_NAME,
  setAuthCookie,
  clearAuthCookie,
  extractAuthToken,
};
