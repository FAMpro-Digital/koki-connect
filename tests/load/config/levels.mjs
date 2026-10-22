// Quatre niveaux de charge progressifs. Les utilisateurs virtuels (VU) ne sont pas des utilisateurs simultanés réels :
// chaque VU alterne actions et pauses (voir scenarios/), donc 100 VU ≈ quelques dizaines de requêtes par seconde.
// « maxRequetes » est un plafond DUR : au-delà, k6 s'arrête (seuil http_reqs avec abortOnFail).
// « budgetSortieMo » est une estimation de la bande passante sortante maximale acceptée (plan gratuit Supabase : 5 Go/mois).
// Les durées sont des valeurs de départ à ajuster après le niveau précédent.

export const NIVEAUX_CONFIG = {
  100: {
    objectif: 'Fonctionnement initial',
    etapes: [
      { duration: '2m', target: 100 },
      { duration: '5m', target: 100 },
      { duration: '1m', target: 0 },
    ],
    maxRequetes: 40000,
    budgetSortieMo: 300,
  },
  500: {
    objectif: 'Charge intermédiaire',
    etapes: [
      { duration: '5m', target: 250 },
      { duration: '5m', target: 500 },
      { duration: '8m', target: 500 },
      { duration: '2m', target: 0 },
    ],
    maxRequetes: 250000,
    budgetSortieMo: 1500,
  },
  1000: {
    objectif: 'Charge importante',
    etapes: [
      { duration: '8m', target: 500 },
      { duration: '8m', target: 1000 },
      { duration: '10m', target: 1000 },
      { duration: '3m', target: 0 },
    ],
    maxRequetes: 600000,
    budgetSortieMo: 3500,
  },
  5000: {
    objectif: 'Résistance de l’infrastructure',
    etapes: [
      { duration: '10m', target: 1000 },
      { duration: '10m', target: 2500 },
      { duration: '10m', target: 5000 },
      { duration: '10m', target: 5000 },
      { duration: '5m', target: 0 },
    ],
    maxRequetes: 2000000,
    budgetSortieMo: 12000,
  },
};

// Un niveau ne peut être lancé que si le précédent a réussi (rapport conservé) : vérifié par le workflow et par le README.
export const NIVEAU_PRECEDENT = { 100: null, 500: 100, 1000: 500, 5000: 1000 };

// Pauses réalistes entre actions (secondes) : lecture d'un écran, puis navigation.
export const PAUSE_MIN_S = 2;
export const PAUSE_MAX_S = 9;

// Plafond d'actions « proximité » par compte : la base limite à 10/min et 60/h (voir docs/TRANSPORT.md).
export const MAX_RECHERCHES_PROXIMITE_PAR_MINUTE = 8;
