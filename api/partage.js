// Page de partage d'une publication : /p/<id>. Les messageries (WhatsApp, Facebook…) y lisent le titre, le résumé et la photo
// de la publication ; le visiteur est aussitôt renvoyé vers l'application, qui ouvre la publication (/?publication=<id>).
// Lecture seule, avec la clé publique de l'application : seules les publications publiées sont visibles (règles du serveur).
'use strict';
const config = require('../assets/portail/backend.json');
const SITE = 'https://www.kokiconnect.com';
const echapper = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const court = (s, n) => { const t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t; };

async function publication(id, fetcher) {
  const headers = { apikey: config.publishableKey, 'Content-Type': 'application/json' };
  const r = await fetcher(config.url + '/rest/v1/koki_contents?id=eq.' + id + '&select=id,titre,resume,image_path,type&limit=1', { headers });
  if (!r.ok) return null;
  const rows = await r.json();
  const x = Array.isArray(rows) ? rows[0] : null;
  if (!x || x.id !== id || typeof x.titre !== 'string') return null;
  return { id: x.id, titre: x.titre, resume: x.resume || '', type: x.type || '', image: await signer(x.image_path, fetcher) };
}

// Photo : lien signé d'une semaine (les messageries gardent l'aperçu en mémoire après le premier partage).
async function signer(chemin, fetcher) {
  if (!/^[a-f0-9-]+\/[a-f0-9-]+\.(jpg|png|webp)$/.test(chemin || '')) return null;
  try {
    const headers = { apikey: config.publishableKey, 'Content-Type': 'application/json' };
    const s = await fetcher(config.url + '/storage/v1/object/sign/koki-media/' + chemin, { method: 'POST', headers, body: JSON.stringify({ expiresIn: 604800 }) });
    const j = s.ok ? await s.json() : null;
    return j && typeof j.signedURL === 'string' && j.signedURL.startsWith('/object/sign/koki-media/') ? config.url + '/storage/v1' + j.signedURL : null;
  } catch (_) { return null; }
}

// Fiche du catalogue (produit, service, boutique) : lue dans le catalogue public, le seul que le serveur montre aux visiteurs.
async function fiche(id, fetcher) {
  const headers = { apikey: config.publishableKey, 'Content-Type': 'application/json' };
  const r = await fetcher(config.url + '/rest/v1/rpc/koki_business', { method: 'POST', headers, body: JSON.stringify({ command: 'catalog', input: {} }) });
  if (!r.ok) return null;
  const rows = await r.json();
  if (!Array.isArray(rows)) return null;
  const x = rows.find((y) => y && y.id === id && ['produits', 'services', 'boutiques'].includes(y.kind));
  if (!x || typeof x.nom !== 'string') return null;
  const parent = x.parent_id ? rows.find((y) => y && y.id === x.parent_id) : null;
  const prix = Number.isInteger(x.prix) ? new Intl.NumberFormat('fr-FR').format(x.prix).replace(/\u202f|\u00a0/g, ' ') + ' FCFA' : (x.kind === 'produits' ? 'Prix sur demande' : '');
  const chez = parent && typeof parent.nom === 'string' ? 'Chez ' + parent.nom : '';
  const chemin = Array.isArray(x.photos) && typeof x.photos[0] === 'string' ? x.photos[0] : x.image_path;
  return { id: x.id, titre: x.nom + (prix ? ' — ' + prix : ''), resume: [chez, x.description].filter(Boolean).join(' · ') || 'Koki Connect', type: x.kind, image: await signer(chemin, fetcher), cible: '/?fiche=' + x.id, chemin: '/f/' + x.id };
}

function page(x) {
  const cible = x.cible || '/?publication=' + x.id, titre = echapper(court(x.titre, 110)), resume = echapper(court(x.resume || x.type || 'Koki Connect', 200));
  const image = echapper(x.image || SITE + '/assets/entete-horizontal.webp');
  return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
    + '<title>' + titre + ' — Koki Connect</title><meta name="description" content="' + resume + '">'
    + '<meta property="og:type" content="article"><meta property="og:site_name" content="Koki Connect"><meta property="og:locale" content="fr_FR">'
    + '<meta property="og:title" content="' + titre + '"><meta property="og:description" content="' + resume + '">'
    + '<meta property="og:image" content="' + image + '"><meta property="og:url" content="' + SITE + (x.chemin || '/p/' + x.id) + '">'
    + '<meta name="twitter:card" content="' + (x.image ? 'summary_large_image' : 'summary') + '">'
    + '<meta http-equiv="refresh" content="0;url=' + cible + '"><link rel="canonical" href="' + SITE + cible + '"></head>'
    + '<body><p><a href="' + cible + '">Ouvrir « ' + titre + ' » dans Koki Connect</a></p></body></html>';
}

async function handler(req, res, fetcher = fetch) {
  const estFiche = !!(req.query && req.query.fiche);
  const id = String((req.query && (req.query.fiche || req.query.id)) || '').toLowerCase();
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id)) { res.statusCode = 302; res.setHeader('Location', '/'); res.end(); return; }
  let x = null;
  try { x = estFiche ? await fiche(id, fetcher) : await publication(id, fetcher); } catch (_) { x = null; }
  // Introuvable, retiré ou serveur indisponible : l'application s'ouvre quand même (elle affichera l'accueil).
  if (!x) { res.statusCode = 302; res.setHeader('Location', (estFiche ? '/?fiche=' : '/?publication=') + id); res.end(); return; }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
  res.end(page(x));
}
module.exports = handler;
module.exports.page = page;
module.exports.publication = publication;
module.exports.fiche = fiche;
