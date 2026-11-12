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
  let image = null;
  if (/^[a-f0-9-]+\/[a-f0-9-]+\.(jpg|png|webp)$/.test(x.image_path || '')) {
    try {
      // Lien d'une semaine : les messageries gardent l'aperçu en mémoire après le premier partage.
      const s = await fetcher(config.url + '/storage/v1/object/sign/koki-media/' + x.image_path, { method: 'POST', headers, body: JSON.stringify({ expiresIn: 604800 }) });
      const j = s.ok ? await s.json() : null;
      if (j && typeof j.signedURL === 'string' && j.signedURL.startsWith('/object/sign/koki-media/')) image = config.url + '/storage/v1' + j.signedURL;
    } catch (_) { image = null; }
  }
  return { id: x.id, titre: x.titre, resume: x.resume || '', type: x.type || '', image };
}

function page(x) {
  const cible = '/?publication=' + x.id, titre = echapper(court(x.titre, 110)), resume = echapper(court(x.resume || x.type || 'Koki Connect', 200));
  const image = echapper(x.image || SITE + '/assets/entete-horizontal.webp');
  return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
    + '<title>' + titre + ' — Koki Connect</title><meta name="description" content="' + resume + '">'
    + '<meta property="og:type" content="article"><meta property="og:site_name" content="Koki Connect"><meta property="og:locale" content="fr_FR">'
    + '<meta property="og:title" content="' + titre + '"><meta property="og:description" content="' + resume + '">'
    + '<meta property="og:image" content="' + image + '"><meta property="og:url" content="' + SITE + '/p/' + x.id + '">'
    + '<meta name="twitter:card" content="' + (x.image ? 'summary_large_image' : 'summary') + '">'
    + '<meta http-equiv="refresh" content="0;url=' + cible + '"><link rel="canonical" href="' + SITE + cible + '"></head>'
    + '<body><p><a href="' + cible + '">Ouvrir « ' + titre + ' » dans Koki Connect</a></p></body></html>';
}

async function handler(req, res, fetcher = fetch) {
  const id = String((req.query && req.query.id) || '').toLowerCase();
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id)) { res.statusCode = 302; res.setHeader('Location', '/'); res.end(); return; }
  let x = null;
  try { x = await publication(id, fetcher); } catch (_) { x = null; }
  // Publication introuvable, retirée ou serveur indisponible : l'application s'ouvre quand même (elle affichera l'accueil).
  if (!x) { res.statusCode = 302; res.setHeader('Location', '/?publication=' + id); res.end(); return; }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
  res.end(page(x));
}
module.exports = handler;
module.exports.page = page;
module.exports.publication = publication;
