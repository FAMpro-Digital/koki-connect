// Script d'accueil (date, carte de Koki, météo…) : sorti de index.html pour permettre une CSP sans 'unsafe-inline'.
    document.getElementById('date-entete').textContent = new Intl.DateTimeFormat('fr-SN', {
      timeZone: 'Africa/Dakar', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    }).format(new Date());
    const CENTRE_KOKI = [15.505949, -15.9919614];
    let servicesKoki = [];
    let donneesCarte = null;
    let chargementCarte = null;
    // Contenus publiés utiles à la carte. Sans connexion au serveur, la carte intégrée reste affichée seule.
    async function contenusPublies() {
      try {
        if (!window.KokiPublicFeed) return [];
        const flux = await KokiPublicFeed.charger();
        const C = window.KokiPortailCore;
        return (flux.contenus || []).filter(x => !C || C.visible(x));
      } catch (_) { return []; }
    }
    // Lieux gérés dans Koki Connect Admin (écran « Lieux de la carte ») et structures de santé positionnées.
    function lieuxAvecPublications(reference, rows) {
      const L = window.KokiLieuContract, S = window.KokiSanteContract;
      const lieux = L ? L.fusionner(reference, rows) : [...reference];
      if (S) for (const row of rows) {
        const v = S.decode(row);
        if (v && !v.archive && v.latitude !== null && v.longitude !== null)
          lieux.push({ id: 'sante-' + row.id, nom: row.titre, categorie: 'Santé', latitude: v.latitude, longitude: v.longitude, position: v.genre + (row.lieu ? ' · ' + row.lieu : ''), source: 'Koki Connect' });
      }
      if (window.KokiServiceContract) for (const row of rows) {
        const v = KokiServiceContract.decodeService(row);
        if (v && !v.archive && v.latitude !== null && v.longitude !== null)
          lieux.push({ id: 'service-' + row.id, nom: row.titre, categorie: 'Services publics', latitude: v.latitude, longitude: v.longitude, position: v.genre + (row.lieu ? ' · ' + row.lieu : ''), source: 'Koki Connect' });
      }
      return lieux;
    }
    async function chargerDonneesCarte() {
      if (donneesCarte) return donneesCarte;
      if (!chargementCarte) chargementCarte = fetch('assets/koki-carte.json').then(reponse => {
        if (!reponse.ok) throw new Error('Carte indisponible');
        return reponse.json();
      }).then(async donnees => {
        const lieux = lieuxAvecPublications(donnees.lieux, await contenusPublies());
        donneesCarte = { ...donnees, lieux };
        servicesKoki = lieux;
        return donneesCarte;
      }).catch(erreur => { chargementCarte = null; throw erreur; });
      return chargementCarte;
    }
function obtenirPositionActuelle() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('La localisation n’est pas disponible sur cet appareil.')); return; }
    navigator.geolocation.getCurrentPosition(resolve, erreur => {
      const message = erreur.code === 1 ? 'Localisation refusée. Autorisez-la dans votre navigateur ou choisissez un départ sur la carte.' : erreur.code === 3 ? 'La localisation prend trop de temps. Réessayez ou choisissez un lieu.' : 'Position indisponible. Choisissez un départ sur la carte.';
      reject(new Error(message));
    }, {timeout:10000, maximumAge:60000});
  });
}
async function activerGeolocalisation() {
  const resultat = document.getElementById('service-proche');
  if (!navigator.geolocation) { resultat.textContent = 'La localisation n’est pas disponible sur cet appareil.'; return; }
  resultat.textContent = 'Chargement des lieux de Koki…';
  try { await chargerDonneesCarte(); } catch (erreur) { resultat.textContent = 'Impossible de charger les lieux. Réessayez plus tard.'; return; }
  try {
    const position = await obtenirPositionActuelle();
    const distance = lieu => {
      const rad = Math.PI / 180;
      const a = Math.sin((lieu.latitude-position.coords.latitude)*rad/2)**2 + Math.cos(position.coords.latitude*rad)*Math.cos(lieu.latitude*rad)*Math.sin((lieu.longitude-position.coords.longitude)*rad/2)**2;
      return 12742 * Math.asin(Math.min(1,Math.sqrt(a)));
    };
    resultat.replaceChildren();
    [...servicesKoki].sort((a,b)=>distance(a)-distance(b)).slice(0,10).forEach(lieu => {
      const ligne = document.createElement('p');
      ligne.textContent = lieu.nom + ' — ' + lieu.categorie + ' — ' + distance(lieu).toFixed(2) + ' km à vol d’oiseau ';
      const lien = document.createElement('a'); lien.textContent = 'Itinéraire';
      lien.href = 'https://www.google.com/maps/dir/?api=1&destination=' + lieu.latitude + ',' + lieu.longitude;
      lien.target = '_blank'; lien.rel = 'noopener'; ligne.append(lien); resultat.append(ligne);
    });
  } catch (erreur) { resultat.textContent = erreur.message; }
}
function filtrerOpportunites(rubrique) {
  const vue = document.getElementById('opportunites-jeunes');
  let visibles = 0;
  vue.querySelectorAll('[data-rubrique]').forEach(carte => {
    carte.hidden = rubrique !== 'Toutes' && carte.dataset.rubrique !== rubrique;
    if (!carte.hidden) visibles++;
  });
  vue.querySelectorAll('[data-filtre]').forEach(bouton => {
    bouton.setAttribute('aria-pressed', String(bouton.dataset.filtre === rubrique));
  });
  document.getElementById('statut-opportunites').textContent =
    visibles === 1 ? '1 rubrique affichée : ' + rubrique + '.' : visibles + ' rubriques affichées.';
}
function afficherOpportunites() {
  if (window.KokiOpportunites) { KokiOpportunites.ouvrir('Toutes'); return; }
  filtrerOpportunites('Toutes');
  document.querySelector('.search').hidden = true;
  document.querySelectorAll('body > .section').forEach(section => {
    section.hidden = section.id !== 'opportunites-jeunes';
  });
  document.getElementById('titre-opportunites').focus();
  window.scrollTo(0, 0);
}
function fermerOpportunites() {
  document.querySelector('.search').hidden = false;
  document.querySelectorAll('body > .section').forEach(section => {
    section.hidden = ['opportunites-jeunes', 'vue-rubrique', 'vue-notifications', 'vue-menu', 'vue-carte', 'vue-transport', 'vue-commerce', 'vue-portail'].includes(section.id);
  });
  // Retour du focus au bouton d'ouverture, s'il est affiché (il peut être absent ou dans une page masquée, ex. le menu).
  const ouverture = Array.from(document.querySelectorAll('[data-clic="afficherOpportunites()"]')).find(el => !el.closest('[hidden]'));
  if (ouverture) ouverture.focus();
  window.scrollTo(0, 0);
}
function afficherMenu() {
  document.querySelector('.search').hidden = true;
  document.querySelectorAll('body > .section').forEach(section => {
    section.hidden = section.id !== 'vue-menu';
  });
  document.getElementById('titre-menu').focus();
  window.scrollTo(0, 0);
}
function afficherNotifications() {
  document.querySelector('.search').hidden = true;
  document.querySelectorAll('body > .section').forEach(section => {
    section.hidden = section.id !== 'vue-notifications';
  });
  document.getElementById('titre-notifications').focus();
  window.scrollTo(0, 0);
}
function afficherRubrique(titre) {
  if(window.KokiPortail && KokiPortail.rubrique(titre))return;
  document.querySelector('.search').hidden = true;
  document.querySelectorAll('body > .section').forEach(section => {
    section.hidden = section.id !== 'vue-rubrique';
  });
  const heading = document.getElementById('titre-rubrique');
  heading.textContent = titre;
  heading.focus();
  window.scrollTo(0, 0);
}
function rechercherRubriques(texte) {
  const normaliser = valeur => valeur.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  let visibles = 0;
  document.querySelectorAll('[data-recherche]').forEach(bouton => {
    bouton.hidden = !normaliser(bouton.dataset.recherche).includes(normaliser(texte.trim()));
    if (!bouton.hidden) visibles++;
  });
  document.getElementById('resultat-recherche').textContent = texte.trim() ? visibles + ' rubrique(s) trouvée(s).' : '';
}
function decrireMeteo(code, jour) {
  if (code === 0) return [jour ? '☀️' : '🌙', jour ? 'Ciel dégagé' : 'Nuit dégagée'];
  if (code === 1 || code === 2) return [jour ? '🌤️' : '☁️', 'Peu nuageux'];
  if (code === 3) return ['☁️', 'Ciel couvert'];
  if (code === 45 || code === 48) return ['🌫️', 'Brouillard'];
  if ([51,53,55,56,57].includes(code)) return ['🌦️', 'Bruine'];
  if ([61,63,65,66,67,80,81,82].includes(code)) return ['🌧️', 'Pluie'];
  if ([71,73,75,77,85,86].includes(code)) return ['🌨️', 'Neige'];
  if ([95,96,99].includes(code)) return ['⛈️', 'Orages'];
  return ['🌡️', 'Conditions actuelles'];
}
let meteoEnCours = false;
async function chargerMeteo() {
  if (meteoEnCours) return;
  meteoEnCours = true;
  const bouton = document.getElementById('actualiser-meteo');
  const temperature = document.getElementById('temperature-meteo');
  const condition = document.getElementById('condition-meteo');
  bouton.disabled = true;
  condition.textContent = 'Chargement…';
  const controleur = new AbortController();
  const delai = setTimeout(() => controleur.abort(), 10000);
  try {
    const reponse = await fetch('https://api.open-meteo.com/v1/forecast?latitude=15.505949&longitude=-15.9919614&current=temperature_2m,weather_code,is_day&timezone=Africa%2FDakar', { signal: controleur.signal });
    if (!reponse.ok) throw new Error('Météo indisponible');
    const donnees = await reponse.json();
    const actuelle = donnees.current;
    if (!actuelle || !Number.isFinite(actuelle.temperature_2m) || !Number.isInteger(actuelle.weather_code)) throw new Error('Données météo invalides');
    const [icone, description] = decrireMeteo(actuelle.weather_code, actuelle.is_day === 1);
    document.getElementById('icone-meteo').textContent = icone;
    temperature.textContent = Math.round(actuelle.temperature_2m) + ' °C';
    condition.textContent = description;
    temperature.title = 'Météo de Koki · ' + actuelle.time.replace('T', ' ');
  } catch (erreur) {
    temperature.textContent = '— °C';
    document.getElementById('icone-meteo').textContent = '🌡️';
    condition.textContent = 'Météo indisponible';
    temperature.removeAttribute('title');
  } finally {
    clearTimeout(delai);
    bouton.disabled = false;
    meteoEnCours = false;
  }
}
chargerMeteo();
setInterval(chargerMeteo, 15 * 60 * 1000);
let carteKoki = null;
let marqueursKoki = null;
let limiteKoki = null;
async function afficherCarte() {
  document.querySelector('.search').hidden = true;
  document.querySelectorAll('body > .section').forEach(section => { section.hidden = section.id !== 'vue-carte'; });
  document.getElementById('titre-carte').focus();
  window.scrollTo(0,0);
  const statut = document.getElementById('statut-carte');
  statut.textContent = 'Chargement de la carte…';
  try {
    await chargerDonneesCarte();
    if (!window.L && window.KokiLeaflet) await window.KokiLeaflet.charger();
    if (!window.L) throw new Error('Carte indisponible');
    if (!carteKoki) {
      carteKoki = L.map('carte-koki').setView(CENTRE_KOKI,12);
      const fond = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19, attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(carteKoki);
      fond.on('tileerror', () => { statut.textContent = 'Fond de carte indisponible. La liste des lieux reste accessible.'; });
      limiteKoki = L.geoJSON(donneesCarte.limite,{style:{color:'#087a3d',weight:2,fillOpacity:0.06}}).addTo(carteKoki);
      marqueursKoki = L.layerGroup().addTo(carteKoki);
    }
    carteKoki.invalidateSize();
    recentrerCarte();
    filtrerCarte();
  } catch (erreur) { statut.textContent = 'Impossible de charger la carte. Cliquez sur Carte pour réessayer.'; }
}
function recentrerCarte() {
  if (carteKoki && limiteKoki) carteKoki.fitBounds(limiteKoki.getBounds(),{padding:[12,12]});
}
function filtrerCarte() {
  if (!donneesCarte || !marqueursKoki) return;
  const normaliser = valeur => valeur.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const recherche = normaliser(document.getElementById('recherche-carte').value.trim());
  const categorie = document.getElementById('categorie-carte').value;
  const lieux = donneesCarte.lieux.filter(lieu => (!categorie || lieu.categorie===categorie) && normaliser(lieu.nom).includes(recherche));
  marqueursKoki.clearLayers();
  const liste = document.getElementById('liste-carte'); liste.replaceChildren();
  document.getElementById('statut-carte').textContent = lieux.length + ' lieu(x) référencé(s).';
  lieux.forEach(lieu => {
    const popup = document.createElement('div');
    const titre = document.createElement('strong'); titre.textContent = lieu.nom;
    const details = document.createElement('p'); details.textContent = lieu.categorie + ' · ' + lieu.position;
    const lien = document.createElement('a'); lien.textContent = 'Itinéraire'; lien.href = 'https://www.google.com/maps/dir/?api=1&destination=' + lieu.latitude + ',' + lieu.longitude; lien.target='_blank'; lien.rel='noopener';
    const coordonnees = document.createElement('p');
    coordonnees.textContent = 'Latitude : ' + lieu.latitude.toFixed(6) + ' · Longitude : ' + lieu.longitude.toFixed(6);
    popup.append(titre,details);
    if (lieu.description) { const d = document.createElement('p'); d.textContent = lieu.description; popup.append(d); }
    popup.append(coordonnees,lien);
    const marker = L.circleMarker([lieu.latitude,lieu.longitude],{radius:7,color:lieu.categorie==='Villages et quartiers'?'#245d88':'#087a3d',fillOpacity:0.9}).bindPopup(popup).addTo(marqueursKoki);
    const bouton = document.createElement('button'); bouton.type='button'; bouton.textContent=lieu.nom + ' — ' + lieu.categorie;
    bouton.onclick=()=>{carteKoki.setView([lieu.latitude,lieu.longitude],16);marker.openPopup();document.getElementById('carte-koki').scrollIntoView({block:'center'});}; liste.append(bouton);
  });
}
