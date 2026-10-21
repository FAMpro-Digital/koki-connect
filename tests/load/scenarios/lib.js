// Fonctions communes aux scénarios k6. Aucune clé secrète : uniquement la clé publishable (sb_publishable_…).
import http from 'k6/http';
import exec from 'k6/execution';
import crypto from 'k6/crypto';
import { sleep } from 'k6';
import { PAUSE_MIN_S, PAUSE_MAX_S, NIVEAUX_CONFIG } from '../config/levels.mjs';

// Seules les réponses 200 sont « attendues » : tout autre statut compte comme échec et nourrit les seuils d'arrêt.
http.setResponseCallback(http.expectedStatuses(200));

export function entetes(cle, jeton) {
  const h = { apikey: cle, 'Content-Type': 'application/json' };
  if (jeton) h.Authorization = 'Bearer ' + jeton;
  return h;
}

export function pause() {
  sleep(PAUSE_MIN_S + Math.random() * (PAUSE_MAX_S - PAUSE_MIN_S));
}

export function rpc(url, cle, nom, corps, jeton, etiquette) {
  return http.post(url + '/rest/v1/rpc/' + nom, JSON.stringify(corps || {}), {
    headers: entetes(cle, jeton),
    tags: { name: etiquette || nom },
    timeout: '15s',
  });
}

export function commande(url, cle, jeton, commandeNom, input, etiquette) {
  return rpc(url, cle, 'koki_business', { command: commandeNom, input: input || {} }, jeton, etiquette || 'koki_business:' + commandeNom);
}

export function lectureTable(url, cle, chemin, jeton, etiquette) {
  return http.get(url + '/rest/v1/' + chemin, { headers: entetes(cle, jeton), tags: { name: etiquette || chemin.split('?')[0] }, timeout: '15s' });
}

export function jsonSur(reponse) {
  try { return reponse.json(); } catch { return null; }
}

// Sonde unique avant la montée en charge : valide la cible et estime le volume sortant AVANT d'envoyer la charge.
// Arrête le test (exec.test.abort) si la projection dépasse le budget du niveau.
export function sondeFlux(url, cle, niveau, partFlux) {
  const r = rpc(url, cle, 'koki_public_feed', {}, null, 'sonde_flux');
  if (r.status !== 200) exec.test.abort('Sonde refusée (statut ' + r.status + ') : cible indisponible ou mal configurée.');
  const octets = r.body ? r.body.length : 0;
  const cfg = NIVEAUX_CONFIG[niveau];
  const projeteMo = (octets * cfg.maxRequetes * partFlux) / (1024 * 1024);
  if (projeteMo > cfg.budgetSortieMo) {
    exec.test.abort('Budget de sortie dépassé : ' + projeteMo.toFixed(0) + ' Mo projetés pour ' + cfg.budgetSortieMo + ' Mo autorisés (réponse du flux : ' + octets + ' octets).');
  }
  return { octetsFlux: octets, projeteMo: Math.round(projeteMo) };
}

// Résumé de fin de test : JSON complet dans tests/load/reports/ (à lancer depuis la racine du dépôt) + court texte lisible.
export function resumer(data, nom, niveau) {
  const m = data.metrics;
  const v = (metrique, cle) => (m[metrique] && m[metrique].values && m[metrique].values[cle] !== undefined ? m[metrique].values[cle] : null);
  const f = (x, d) => (x === null ? 'n/d' : Number(x).toFixed(d === undefined ? 0 : d));
  const lignes = [
    '== KOKI CONNECT · ' + nom + ' · niveau ' + niveau + ' ==',
    'Requêtes : ' + f(v('http_reqs', 'count')) + ' (' + f(v('http_reqs', 'rate'), 1) + '/s)',
    'Échecs HTTP : ' + (v('http_req_failed', 'rate') === null ? 'n/d' : (v('http_req_failed', 'rate') * 100).toFixed(2) + ' %'),
    'Durée moyenne / p95 / p99 (ms) : ' + f(v('http_req_duration', 'avg')) + ' / ' + f(v('http_req_duration', 'p(95)')) + ' / ' + f(v('http_req_duration', 'p(99)')),
    'Reçu : ' + (v('data_received', 'count') === null ? 'n/d' : (v('data_received', 'count') / 1048576).toFixed(1) + ' Mo'),
    'VU max : ' + f(v('vus_max', 'max')),
    '',
  ];
  const sorties = { stdout: lignes.join('\n') };
  sorties['tests/load/reports/' + nom + '-niveau-' + niveau + '.json'] = JSON.stringify(data, null, 2);
  return sorties;
}

// Identifiant d'idempotence (request_id) : une valeur neuve par opération d'écriture, comme client.mjs.
export function uuid() {
  const b = new Uint8Array(crypto.randomBytes(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
}

// Ouvre une session par compte FICTIF (e-mail + mot de passe TEST), une seule fois, dans setup().
// Les jetons sont réutilisés par les VU : on ne simule pas des milliers de connexions (limite d'Auth par adresse IP).
// Un jeton Supabase dure 1 h par défaut : les niveaux longs doivent rester sous cette durée (voir README).
export function ouvrirSessions(url, cle, comptes, max) {
  const sessions = [];
  for (let i = 0; i < Math.min(max, comptes.length); i++) {
    const c = comptes[i];
    const r = http.post(url + '/auth/v1/token?grant_type=password', JSON.stringify({ email: c.email, password: c.password }), {
      headers: entetes(cle),
      tags: { name: 'connexion_setup' },
      timeout: '15s',
    });
    const j = jsonSur(r);
    if (r.status === 200 && j && j.access_token && j.user) sessions.push({ jeton: j.access_token, uid: j.user.id });
  }
  if (!sessions.length) exec.test.abort('Aucune connexion de compte TEST réussie : vérifiez accounts.json et le projet TEST.');
  return sessions;
}
