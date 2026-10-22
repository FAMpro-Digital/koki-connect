// Garde-fous des tests de charge KOKI CONNECT.
// Ce module est importé par TOUS les scénarios k6 ET par un test Node (tests/performance-garde-fous.test.cjs).
// Il ne dépend d'aucune API k6 ni Node : uniquement du JavaScript pur.
//
// Règles (aucune ne peut être contournée par une variable d'environnement) :
//  1. Jamais la production : références de projets bloquées, quel que soit le reste.
//  2. Jamais une URL *.vercel.app, ni un domaine de l'application (offre Vercel Hobby : tests de charge interdits).
//  3. Seul un projet Supabase TEST explicitement nommé (KOKI_TEST_PROJECT_REF) ou une base locale (loopback) est accepté.
//  4. Une exécution distante exige une autorisation écrite et propre au niveau et au projet (AUTORISATION_CHARGE).
//  5. Les écritures (commandes, courses fictives) exigent en plus ALLOW_WRITES=oui.

export const REFERENCES_BLOQUEES = ['qsbmzzbiztfqysstepxm', 'paegdthtusbwxuarhacb'];
export const NIVEAUX = [100, 500, 1000, 5000];

const RE_SUPABASE = /^https:\/\/([a-z0-9]{20})\.supabase\.co$/;
const RE_LOOPBACK = /^http:\/\/(127\.0\.0\.1|localhost|\[::1\]):\d{2,5}$/;

export function refus(message) {
  const e = new Error('REFUS KOKI : ' + message);
  e.refusKoki = true;
  return e;
}

// Texte exact à fournir pour autoriser un niveau sur un projet TEST précis.
export function autorisationAttendue(niveau, reference) {
  return 'OUI-' + niveau + '-' + reference;
}

// Vérifie l'URL Supabase visée. Retourne {url, reference, local}.
export function cibleSupabase(env) {
  const url = String(env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  if (!url) throw refus('SUPABASE_URL manquante.');
  if (RE_LOOPBACK.test(url)) return { url, reference: null, local: true };
  const m = RE_SUPABASE.exec(url);
  if (!m) throw refus('SUPABASE_URL doit être https://<référence>.supabase.co (TEST) ou une base locale 127.0.0.1.');
  const reference = m[1];
  if (REFERENCES_BLOQUEES.includes(reference)) throw refus('projet de production ou projet bloqué (' + reference + ').');
  const voulue = String(env.KOKI_TEST_PROJECT_REF || '').trim();
  if (!/^[a-z0-9]{20}$/.test(voulue)) throw refus('KOKI_TEST_PROJECT_REF (référence du projet TEST) est obligatoire.');
  if (REFERENCES_BLOQUEES.includes(voulue)) throw refus('KOKI_TEST_PROJECT_REF vise un projet bloqué.');
  if (voulue !== reference) throw refus('SUPABASE_URL ne correspond pas à KOKI_TEST_PROJECT_REF.');
  return { url, reference, local: false };
}

// L'application statique n'est jamais chargée à distance. Seule une adresse locale est tolérée.
export function verifierSiteStatique(env) {
  const base = String(env.BASE_URL || '').trim().replace(/\/+$/, '');
  if (!base) return null;
  if (RE_LOOPBACK.test(base)) return base;
  throw refus('BASE_URL distante refusée (Vercel Hobby : aucun test de charge ; production interdite). Utilisez 127.0.0.1.');
}

export function niveauDemande(env) {
  const niveau = Number(env.NIVEAU);
  if (!NIVEAUX.includes(niveau)) throw refus('NIVEAU doit valoir 100, 500, 1000 ou 5000.');
  return niveau;
}

// Contrôle complet avant toute requête. Appelé dans le contexte d'initialisation de chaque scénario.
export function verifierExecution(env, { ecritures = false } = {}) {
  const niveau = niveauDemande(env);
  const cible = cibleSupabase(env);
  verifierSiteStatique(env);
  if (!cible.local) {
    const attendu = autorisationAttendue(niveau, cible.reference);
    if (env.AUTORISATION_CHARGE !== attendu) {
      throw refus('autorisation écrite absente ou incorrecte pour ce niveau et ce projet (AUTORISATION_CHARGE).');
    }
  }
  if (ecritures && env.ALLOW_WRITES !== 'oui') throw refus('scénario avec écritures : ALLOW_WRITES=oui requis.');
  if (!/^sb_publishable_/.test(String(env.SUPABASE_PUBLISHABLE_KEY || ''))) {
    throw refus('seule une clé publishable (sb_publishable_…) est acceptée ; jamais service_role ni clé secrète.');
  }
  return { niveau, cible };
}
