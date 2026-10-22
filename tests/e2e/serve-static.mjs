// Serveur statique LOCAL (127.0.0.1 uniquement) de l'application publique, pour les tests Playwright.
//  - sert la racine du dépôt sans la modifier ;
//  - remplace UNIQUEMENT à la volée assets/portail/backend.json par une cible fictive (aucun accès à la production) ;
//  - applique les en-têtes de vercel.json (CSP, HSTS…) en remplaçant la référence de production par l'hôte fictif,
//    pour que le test détecte les violations de CSP comme en ligne.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { extname, join, normalize, sep } from 'node:path';

import { HOTE_FICTIF } from './helpers/constantes.mjs';
const RACINE = fileURLToPath(new URL('../../', import.meta.url));
const PORT = Number(process.env.KOKI_E2E_PORT || 4173);
const REF_PRODUCTION = 'qsbmzzbiztfqysstepxm';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.jpg': 'image/jpeg', '.woff2': 'font/woff2',
};

const vercel = JSON.parse(await readFile(join(RACINE, 'vercel.json'), 'utf8'));
const ENTETES = Object.fromEntries((vercel.headers?.[0]?.headers ?? []).map((h) => [h.key, String(h.value).split(REF_PRODUCTION).join(HOTE_FICTIF.split('.')[0])]));

const BACKEND_FICTIF = JSON.stringify({ url: 'https://' + HOTE_FICTIF, publishableKey: 'sb_publishable_FICTIF_TEST_UNIQUEMENT' });

const serveur = http.createServer(async (req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
    const url = new URL(req.url, 'http://127.0.0.1');
    let chemin = decodeURIComponent(url.pathname);
    if (chemin.endsWith('/')) chemin += 'index.html';
    const entetes = { ...ENTETES, 'Cache-Control': 'no-store' };
    if (chemin === '/assets/portail/backend.json') {
      res.writeHead(200, { ...entetes, 'Content-Type': TYPES['.json'] }).end(BACKEND_FICTIF);
      return;
    }
    const complet = normalize(join(RACINE, chemin));
    if (!complet.startsWith(RACINE.endsWith(sep) ? RACINE : RACINE + sep)) { res.writeHead(403).end(); return; }
    const relatif = complet.slice(RACINE.length);
    // Même périmètre que la publication (scripts/prepare-preview.mjs) : rien d'autre n'est servi.
    if (!/^(index\.html|assets\/|favicon\.ico$|manifest\.webmanifest$|sw\.js$)/.test(relatif.split(sep).join('/'))) { res.writeHead(404).end(); return; }
    const info = await stat(complet);
    if (!info.isFile()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { ...entetes, 'Content-Type': TYPES[extname(complet)] || 'application/octet-stream' });
    res.end(req.method === 'HEAD' ? undefined : await readFile(complet));
  } catch {
    res.writeHead(404).end();
  }
});

// Écoute exclusivement sur la boucle locale : jamais accessible depuis le réseau.
serveur.listen(PORT, '127.0.0.1', () => console.log('KOKI CONNECT (test local) : http://127.0.0.1:' + PORT));
