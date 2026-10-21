// Isolation totale des tests : aucun accès réseau distant, Supabase simulé avec des données FICTIVES.
// Un test échoue si une requête vise un hôte Supabase autre que l'hôte fictif, une URL vercel.app, ou une référence de production.
import { test as base, expect } from '@playwright/test';
import { HOTE_FICTIF } from './constantes.mjs';

const REFERENCES_INTERDITES = ['qsbmzzbiztfqysstepxm', 'paegdthtusbwxuarhacb'];

export const UUID_BOUTIQUE = '11111111-1111-4111-8111-111111111111';
export const UUID_PRODUIT = '22222222-2222-4222-8222-222222222222';
export const UUID_CONTENU = '33333333-3333-4333-8333-333333333333';

const FLUX = {
  version: 1,
  contenus: [
    { id: UUID_CONTENU, titre: 'TEST Actualité fictive', resume: 'Contenu fictif pour les tests automatiques.', statut: 'publié', type: 'Actualités', rubrique: 'Actualités', publication: '2026-10-01T08:00:00Z', image_path: null },
  ],
};
const CATALOGUE = [
  { id: UUID_BOUTIQUE, kind: 'boutiques', nom: 'TEST Boutique fictive', statut: 'Actif', parent_id: null, village: 'Koki', categorie: 'Alimentation' },
  { id: UUID_PRODUIT, kind: 'produits', nom: 'TEST Produit fictif', statut: 'Disponible', parent_id: UUID_BOUTIQUE, prix: 1500, stock: 2, categorie: 'Alimentation' },
];
const TARIFS = [
  { category: 'Moto', base_fcfa: 200, per_km_fcfa: 100 },
  { category: 'Taxi', base_fcfa: 500, per_km_fcfa: 250 },
];

function entetesCors(requete) {
  const h = requete.headers();
  return {
    'access-control-allow-origin': h.origin || '*',
    'access-control-allow-headers': h['access-control-request-headers'] || '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-expose-headers': '*',
    vary: 'Origin',
  };
}

function json(route, status, corps) {
  return route.fulfill({ status, headers: entetesCors(route.request()), contentType: 'application/json', body: JSON.stringify(corps) });
}

function simulerSupabase(route, journal) {
  const requete = route.request();
  const chemin = new URL(requete.url()).pathname;
  if (requete.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: entetesCors(requete) });
  if (chemin === '/rest/v1/rpc/koki_public_feed') { journal.flux += 1; return json(route, 200, FLUX); }
  if (chemin === '/rest/v1/rpc/koki_business') {
    let commande = '';
    try { commande = JSON.parse(requete.postData() || '{}').command || ''; } catch { /* corps invalide : traité comme inconnu */ }
    journal.commandes.push(commande);
    if (commande === 'catalog') return json(route, 200, CATALOGUE);
    // Toute autre commande exige un compte connecté : le visiteur est refusé comme sur le vrai serveur.
    return json(route, 401, { code: '42501', message: 'Compte permanent connecté requis' });
  }
  if (chemin === '/rest/v1/koki_transport_rates') return json(route, 200, TARIFS);
  if (chemin === '/auth/v1/user') return json(route, 401, { message: 'invalid JWT' });
  if (chemin.startsWith('/auth/v1/')) { journal.authentifications += 1; return json(route, 400, { error: 'invalid_grant', error_description: 'test' }); }
  journal.nonPrevues.push(requete.method() + ' ' + chemin);
  return json(route, 404, { message: 'simulation : appel non prévu' });
}

export const test = base.extend({
  // Journal de ce que la page a tenté ; vérifié automatiquement à la fin de chaque test.
  journal: [async ({ context }, use) => {
    const journal = { flux: 0, commandes: [], authentifications: 0, nonPrevues: [], interdites: [], externesBloquees: [] };
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url());
      const hote = url.hostname;
      if (hote === '127.0.0.1') return route.continue();
      if (hote === HOTE_FICTIF) return simulerSupabase(route, journal);
      const interdit = hote.endsWith('.supabase.co') || hote.endsWith('.vercel.app') || REFERENCES_INTERDITES.some((r) => url.href.includes(r));
      if (interdit) journal.interdites.push(url.href);
      else journal.externesBloquees.push(hote);
      return route.abort('blockedbyclient');
    });
    await use(journal);
    expect(journal.interdites, 'Aucune requête vers la production, vercel.app ou un autre Supabase').toEqual([]);
  }, { auto: true }],
  // Erreurs JavaScript non gérées de la page : jamais tolérées.
  erreursPage: [async ({ page }, use) => {
    const erreurs = [];
    page.on('pageerror', (e) => erreurs.push(String(e && e.message ? e.message : e)));
    await use(erreurs);
    expect(erreurs, 'Aucune erreur JavaScript non gérée').toEqual([]);
  }, { auto: true }],
});

export { expect };
