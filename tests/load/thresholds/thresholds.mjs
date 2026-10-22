// Seuils initiaux, par niveau. À AJUSTER selon les mesures réelles et les besoins métier (voir README).
// abortOnFail : k6 arrête immédiatement le test quand un seuil critique est franchi.
// delayAbortEval : laisse 30 s de montée avant d'évaluer, pour ne pas arrêter sur un démarrage à froid.

import { NIVEAUX_CONFIG } from '../config/levels.mjs';

// p95 / p99 tolérés (ms) par niveau : lecture publique, réseau mobile du Sénégal non simulé (mesures depuis un seul site).
const LATENCE = {
  100: { p95: 800, p99: 2000 },
  500: { p95: 1000, p99: 2500 },
  1000: { p95: 1500, p99: 3500 },
  5000: { p95: 2500, p99: 6000 },
};

// Taux d'erreur HTTP toléré (hors 4xx attendus, déclarés via expectedStatuses dans les scénarios).
const ERREUR = { 100: 0.01, 500: 0.01, 1000: 0.02, 5000: 0.05 };

export function seuils(niveau) {
  const l = LATENCE[niveau];
  const cfg = NIVEAUX_CONFIG[niveau];
  return {
    // Critique : taux d'erreur.
    http_req_failed: [{ threshold: 'rate<' + ERREUR[niveau], abortOnFail: true, delayAbortEval: '30s' }],
    // Critique : latence extrême = arrêt (protège la base et le quota).
    http_req_duration: [
      'p(95)<' + l.p95,
      'p(99)<' + l.p99,
      { threshold: 'p(99)<' + l.p99 * 3, abortOnFail: true, delayAbortEval: '60s' },
    ],
    // Vérifications fonctionnelles (statut, forme de la réponse).
    checks: [{ threshold: 'rate>0.99', abortOnFail: true, delayAbortEval: '30s' }],
    // Protection contre les dépenses imprévues : plafond dur du nombre de requêtes du niveau.
    http_reqs: [{ threshold: 'count<' + cfg.maxRequetes, abortOnFail: true }],
    // Un système saturé laisse tomber des itérations : signal d'arrêt.
    dropped_iterations: [{ threshold: 'count<' + Math.max(50, Math.round(cfg.maxRequetes / 100)), abortOnFail: true, delayAbortEval: '60s' }],
    // Volume sortant mesuré par k6 (octets reçus), converti en Mo.
    data_received: [{ threshold: 'count<' + cfg.budgetSortieMo * 1024 * 1024, abortOnFail: true }],
  };
}
