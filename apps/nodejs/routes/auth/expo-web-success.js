import { getToken } from '@auth/core/jwt';

export default async function expoWebSuccess(req, res) {
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
      return res.status(401).send(`
        <html>
          <body>
            <script>
              window.parent.postMessage({ type: 'AUTH_ERROR', error: 'Unauthorized' }, '*');
            </script>
          </body>
        </html>
      `);
    }

    const message = {
      type: 'AUTH_SUCCESS',
      jwt: token,
      user: {
        id: jwt.sub,
        email: jwt.email,
        name: jwt.name,
      },
    };

    return res.send(`
      <html>
        <body>
          <script>
            window.parent.postMessage(${JSON.stringify(message)}, '*');
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Expo web success error:', error);
    return res.status(500).send(`
      <html>
        <body>
          <script>
            window.parent.postMessage({ type: 'AUTH_ERROR', error: 'Internal server error' }, '*');
          </script>
        </body>
      </html>
    `);
  }
}

