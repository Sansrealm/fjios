import { getToken } from '@auth/core/jwt';

export default async function getTokenRoute(req, res) {
  try {
    // Convert Express request to Web API Request for getToken
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const webRequest = new Request(url, {
      method: req.method,
      headers: req.headers,
    });

    const [token, jwt] = await Promise.all([
      getToken({
        req: webRequest,
        secret: process.env.AUTH_SECRET,
        secureCookie: process.env.AUTH_URL?.startsWith('https'),
        raw: true,
      }),
      getToken({
        req: webRequest,
        secret: process.env.AUTH_SECRET,
        secureCookie: process.env.AUTH_URL?.startsWith('https'),
      }),
    ]);

    if (!jwt) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.json({
      jwt: token,
      user: {
        id: jwt.sub,
        email: jwt.email,
        name: jwt.name,
      },
    });
  } catch (error) {
    console.error('Token error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

