import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `https://${process.env.VERCEL_URL}/api/auth/google/callback`
);

export default async function handler(req, res) {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).send('No authorization code provided');
  }
  
  try {
    // Obtén tokens
    const { tokens } = await oauth2Client.getToken(code);
    const accessToken = tokens.access_token;
    
    // Decodifica ID token para obtener email
    let userEmail = 'unknown';
    if (tokens.id_token) {
      try {
        const decodedToken = JSON.parse(
          Buffer.from(tokens.id_token.split('.')[1], 'base64').toString()
        );
        userEmail = decodedToken.email;
      } catch (e) {
        console.warn('Could not decode email from token');
      }
    }
    
    // Verifica acceso al Sheet
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    
    const sheets = google.sheets({ version: 'v4', auth });
    await sheets.spreadsheets.get({
      spreadsheetId: process.env.SHEET_ID
    });
    
    // OK — devuelve token a v37
    res.send(`
      <html>
        <head>
          <title>Conectado</title>
          <style>
            body { font-family: Arial; text-align: center; padding: 50px; }
            h1 { color: #00D47E; }
          </style>
        </head>
        <body>
          <h1>✓ Conectado correctamente</h1>
          <p>Cierra esta ventana y vuelve al generador.</p>
          <script>
            window.opener.postMessage({
              token: '${accessToken}',
              email: '${userEmail}'
            }, '*');
            setTimeout(() => window.close(), 2000);
          </script>
        </body>
      </html>
    `);
  } catch(err) {
    console.error('OAuth error:', err.message);
    
    if(err.status === 403) {
      return res.status(403).send(`
        <html>
          <head>
            <title>Sin acceso</title>
            <style>
              body { font-family: Arial; text-align: center; padding: 50px; }
              h1 { color: #FF4040; }
            </style>
          </head>
          <body>
            <h1>❌ Sin acceso</h1>
            <p>La cuenta no tiene acceso al Sheet Glosario.</p>
            <p>Pide a Xcellence que comparta el Sheet contigo.</p>
          </body>
        </html>
      `);
    }
    
    res.status(500).send(`
      <html>
        <head>
          <title>Error</title>
          <style>
            body { font-family: Arial; text-align: center; padding: 50px; }
            h1 { color: #FF4040; }
          </style>
        </head>
        <body>
          <h1>⚠️ Error</h1>
          <p>${err.message}</p>
        </body>
      </html>
    `);
  }
}
