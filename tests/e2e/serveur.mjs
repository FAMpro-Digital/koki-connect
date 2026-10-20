// Serveur statique de test : sert le dépôt avec EXACTEMENT les en-têtes de sécurité de vercel.json (CSP comprise).
// Écoute sur 127.0.0.1 uniquement. Aucun accès à Supabase : les tests bloquent le réseau externe.
import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const racine = fileURLToPath(new URL('../../', import.meta.url));
const entetes = Object.fromEntries(JSON.parse(readFileSync(racine + 'vercel.json', 'utf8')).headers[0].headers.map((h) => [h.key.toLowerCase(), h.value]));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };
const port = Number(process.env.PORT || 4173);

createServer((req, res) => {
  let chemin = decodeURIComponent(req.url.split('?')[0]);
  if (chemin === '/') chemin = '/index.html';
  const fichier = path.join(racine, chemin);
  if (!fichier.startsWith(racine) || !existsSync(fichier) || statSync(fichier).isDirectory() || /\/(\.git|tests|node_modules)\//.test(chemin)) { res.writeHead(404); return res.end('introuvable'); }
  res.writeHead(200, { ...entetes, 'content-type': types[path.extname(fichier)] || 'application/octet-stream' });
  createReadStream(fichier).pipe(res);
}).listen(port, '127.0.0.1', () => console.log('http://127.0.0.1:' + port));
