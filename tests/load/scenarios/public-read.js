// Lecture publique anonyme : ouverture de l'application, rubriques, boutiques, tarifs de transport.
// Cible : Supabase TEST (ou local) uniquement. Aucune écriture. Le site statique n'est JAMAIS chargé (Vercel Hobby).
//
// Exemple (depuis la racine du dépôt) :
//   k6 run -e NIVEAU=100 -e SUPABASE_URL=https://<réf-TEST>.supabase.co -e KOKI_TEST_PROJECT_REF=<réf-TEST> \
//          -e SUPABASE_PUBLISHABLE_KEY=sb_publishable_… -e AUTORISATION_CHARGE=OUI-100-<réf-TEST> \
//          tests/load/scenarios/public-read.js
import http from 'k6/http';
import { check } from 'k6';
import { verifierExecution } from '../config/guard.mjs';
import { NIVEAUX_CONFIG } from '../config/levels.mjs';
import { seuils } from '../thresholds/thresholds.mjs';
import { entetes, pause, rpc, commande, lectureTable, jsonSur, sondeFlux, resumer } from './lib.js';

const { niveau, cible } = verifierExecution(__ENV);
const CLE = __ENV.SUPABASE_PUBLISHABLE_KEY;
const PART_FLUX = 0.4; // part approximative des requêtes qui sont des lectures du flux public

export const options = {
  scenarios: {
    lecture_publique: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: NIVEAUX_CONFIG[niveau].etapes,
      gracefulRampDown: '30s',
    },
  },
  thresholds: seuils(niveau),
  tags: { niveau: String(niveau), scenario: 'public-read' },
};

export function setup() {
  return sondeFlux(cible.url, CLE, niveau, PART_FLUX);
}

const CHEMIN_IMAGE = /^[a-f0-9-]+\/[a-f0-9-]+\.(jpg|png|webp)$/;

export default function () {
  // 1. Ouverture de l'application : flux public (aucun cache côté navigateur, comme feed.js).
  const flux = rpc(cible.url, CLE, 'koki_public_feed', {}, null, 'flux_public');
  const donnees = jsonSur(flux);
  check(flux, {
    'flux : statut 200': (r) => r.status === 200,
    'flux : version 1 et liste de contenus': () => !!donnees && donnees.version === 1 && Array.isArray(donnees.contenus),
  });

  // 2. Signature des images par lot (une requête, comme feed.js), si le flux en contient.
  const chemins = donnees && Array.isArray(donnees.contenus)
    ? donnees.contenus.map((x) => x && x.image_path).filter((p) => typeof p === 'string' && CHEMIN_IMAGE.test(p))
    : [];
  if (chemins.length) {
    const lot = http.post(
      cible.url + '/storage/v1/object/sign/koki-media',
      JSON.stringify({ expiresIn: 120, paths: chemins }),
      { headers: entetes(CLE), tags: { name: 'signature_images' }, timeout: '15s' },
    );
    check(lot, { 'images : statut 200': (r) => r.status === 200 });
  }
  pause();

  // 3. Rubrique Boutique : catalogue public (boutiques, produits, services validés).
  if (Math.random() < 0.6) {
    const cat = commande(cible.url, CLE, null, 'catalog', {}, 'catalogue');
    check(cat, { 'catalogue : statut 200': (r) => r.status === 200 });
    pause();
  }

  // 4. Rubrique Transport : tarifs validés.
  if (Math.random() < 0.4) {
    const tarifs = lectureTable(cible.url, CLE, 'koki_transport_rates?select=*&order=category', null, 'tarifs_transport');
    check(tarifs, { 'tarifs : statut 200': (r) => r.status === 200 });
    pause();
  }
}

export function handleSummary(data) {
  return resumer(data, 'public-read', niveau);
}
