import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `https://${process.env.VERCEL_URL}/api/auth`
);

export default async function handler(req, res) {
  const { code } = req.query;
  
  if (!code) {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });
    return res.redirect(authUrl);
  }
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    const accessToken = tokens.access_token;
    
    let userEmail = 'user';
    try {
      const decoded = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64').toString());
      userEmail = decoded.email || 'user';
    } catch (e) {}
    
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    
    const sheets = google.sheets({ version: 'v4', auth });
    await sheets.spreadsheets.get({ spreadsheetId: process.env.SHEET_ID });
    
    res.send(`<html><body><h1>✓ Conectado</h1><script>window.opener.postMessage({token:'${accessToken}',email:'${userEmail}'},'*');setTimeout(()=>window.close(),1500);</script></body></html>`);
  } catch(err) {
    res.status(500).send(`<html><body><h1>Error: ${err.message}</h1></body></html>`);
  }
}
