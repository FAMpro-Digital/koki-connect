// Prépare mobile/www/ : copie des seuls fichiers de l'application publique (pas de tests, documentation,
// fonction serveur ni données de collecte), puis ajoute dans index.html une politique de sécurité (CSP)
// équivalente aux en-têtes Vercel, absents dans l'application. Le site public n'est pas modifié.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ici = path.dirname(fileURLToPath(import.meta.url));
export const RACINE = path.resolve(ici, '..', '..');
export const A_COPIER = ['index.html', 'manifest.webmanifest', 'favicon.ico', 'confidentialite.html', 'conditions.html', 'suppression-compte.html', 'tests-application.html', 'assistance.html', 'assets'];

// CSP de l'application : celle du site, sans les directives qu'une balise <meta> ignore ou refuse.
export function cspApplication(vercel) {
  const brute = vercel.headers.flatMap((h) => h.headers).find((h) => h.key === 'Content-Security-Policy');
  if (!brute) throw new Error('CSP introuvable dans vercel.json');
  return brute.value.split(';').map((d) => d.trim()).filter((d) => d && !/^(frame-ancestors|report-uri|report-to|sandbox)\b/.test(d)).join('; ');
}

export function preparerIndex(html, csp) {
  if (!html.includes('<head>')) throw new Error('index.html sans <head>');
  if (html.includes('http-equiv="Content-Security-Policy"')) return html;
  const echappee = csp.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  return html.replace('<head>', '<head>\n  <meta http-equiv="Content-Security-Policy" content="' + echappee + '">');
}

export function construire(sortie = path.join(RACINE, 'mobile', 'www')) {
  fs.rmSync(sortie, { recursive: true, force: true });
  fs.mkdirSync(sortie, { recursive: true });
  for (const f of A_COPIER) fs.cpSync(path.join(RACINE, f), path.join(sortie, f), { recursive: true });
  const vercel = JSON.parse(fs.readFileSync(path.join(RACINE, 'vercel.json'), 'utf8'));
  const index = path.join(sortie, 'index.html');
  fs.writeFileSync(index, preparerIndex(fs.readFileSync(index, 'utf8'), cspApplication(vercel)));
  return sortie;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const sortie = construire(process.argv[2] ? path.resolve(process.argv[2]) : undefined);
  console.log('Fichiers de l’application prêts dans ' + sortie);
}
