(function (root) {
  'use strict';
  const categories = ['Moto', 'Taxi', 'Voiture', 'Minicar'];
  const statuts = ['En attente', 'Acceptée', 'Chauffeur en route', 'Course en cours', 'Terminée'];
  function pointValide(point) {
    return !!point && Number.isFinite(point.latitude) && Number.isFinite(point.longitude) && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180;
  }
  function distanceKm(a, b) {
    if (!pointValide(a) || !pointValide(b)) throw new Error('Sélectionnez un départ et une destination valides.');
    const rad = Math.PI / 180;
    const h = Math.sin((b.latitude - a.latitude) * rad / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin((b.longitude - a.longitude) * rad / 2) ** 2;
    return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  function estimer(a, b, tarif) {
    const distance = distanceKm(a, b);
    if (distance < 0.05) throw new Error('Choisissez deux points distincts, espacés d’au moins 50 mètres.');
    const prix = tarif && Number.isFinite(tarif.base) && Number.isFinite(tarif.parKm) && tarif.base >= 0 && tarif.parKm >= 0 ? Math.ceil((tarif.base + distance * tarif.parKm) / 50) * 50 : null;
    return { distance, prix, methode: 'À vol d’oiseau' };
  }
  function proches(chauffeurs, depart, categorie, maintenant = Date.now()) {
    return chauffeurs.filter(c => c.disponible === true && c.categorie === categorie && pointValide(c.localisation) && Number.isFinite(Date.parse(c.positionMiseAJour)) && maintenant - Date.parse(c.positionMiseAJour) <= 15 * 60 * 1000 && maintenant >= Date.parse(c.positionMiseAJour))
      .map(c => ({ ...c, distanceDepart: distanceKm(depart, c.localisation) }))
      .filter(c => c.distanceDepart <= 10).sort((a, b) => a.distanceDepart - b.distanceDepart);
  }
  function transition(course, prochain) {
    if (!course || prochain !== statuts[statuts.indexOf(course.statut) + 1]) throw new Error('Transition de course non autorisée.');
    return { ...course, statut: prochain, miseAJour: new Date().toISOString() };
  }
  function telephone(valeur) {
    const nettoye = String(valeur || '').replace(/[\s().-]/g, '');
    return /^\+?[1-9]\d{7,14}$/.test(nettoye) ? nettoye : null;
  }
  const api = Object.freeze({ categories, statuts, pointValide, distanceKm, estimer, proches, transition, telephone });
  root.KokiTransportCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
