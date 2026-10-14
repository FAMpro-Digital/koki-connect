(function () {
  'use strict';
  const core = KokiTransportCore;
  const $ = id => document.getElementById('transport-' + id);
  const etat = { demo: false, categorie: 'Moto', depart: null, destination: null, choisi: null, chauffeurs: [], estimation: null, course: null, prix: {}, reel: null };
  let generationPrix = 0, minuterie = null;
  let configuration = null, initialisation = null, carte = null, points = null, cible = null;
  const cleCourse = 'koki.transport.demo.course.v1';
  // Replace this repository with authenticated driver and ride APIs when available.
  const depot = {
    async config() {
      const reponse = await fetch('assets/transport/config.json');
      if (!reponse.ok) throw new Error('Impossible de charger Transport. Réessayez.');
      return reponse.json();
    },
    lireCourse() {
      try {
        const c = JSON.parse(localStorage.getItem(cleCourse));
        if (c && c.demo === true && core.statuts.includes(c.statut) && core.pointValide(c.depart) && core.pointValide(c.destination) && core.categories.includes(c.categorie) && typeof c.chauffeur === 'string' && typeof c.id === 'string') return c;
      } catch (_) { /* Storage may be unavailable. The demo still works in memory. */ }
      return null;
    },
    sauverCourse(course) {
      try { if (course) localStorage.setItem(cleCourse, JSON.stringify(course)); else localStorage.removeItem(cleCourse); }
      catch (_) { $('message').textContent = 'La course démo reste disponible pendant cette visite ; son enregistrement est indisponible.'; }
    },
    async demanderReelle() { throw new Error('Le service de réservation n’est pas encore connecté. Aucune demande n’a été envoyée.'); }
  };
  function message(texte) { $('message').textContent = texte; }
  function cree(tag, texte) { const element = document.createElement(tag); if (texte !== undefined) element.textContent = texte; return element; }
  async function initialiser() {
    if (initialisation) return initialisation;
    initialisation = Promise.all([chargerDonneesCarte(), depot.config()]).then(([donnees, config]) => {
      if (!config || !Array.isArray(config.chauffeurs) || !config.demoTarifs) throw new Error('Configuration Transport invalide.');
      configuration = config;
      remplirLieux(donnees.lieux);
      ajouterStructuresSante();
      etat.course = depot.lireCourse();
      if (etat.course) {
        etat.demo = true; $('demo').checked = true;
        etat.depart = etat.course.depart; etat.destination = etat.course.destination; etat.categorie = etat.course.categorie;
        pointOption('depart', etat.depart); pointOption('destination', etat.destination);
      }
    }).catch(erreur => { initialisation = null; throw erreur; });
    return initialisation;
  }
  // Lieux proposés : vrais sites de la carte de Koki (OpenStreetMap, noms complétés par le village le plus proche),
  // regroupés par catégorie, puis structures de santé publiées par Koki Connect quand leur position est connue.
  const lieuxTransport = new Map();
  const ORDRE = ['Villages et quartiers', 'Santé', 'Éducation', 'Commerces', 'Services publics', 'Lieux religieux', 'Sports', 'Eau'];
  function remplirLieux(lieux) {
    const groupes = new Map();
    for (const l of lieux) {
      if (!core.pointValide(l) || !l.nom) continue;
      lieuxTransport.set(l.id, l);
      if (!groupes.has(l.categorie)) groupes.set(l.categorie, []);
      groupes.get(l.categorie).push(l);
    }
    const cats = [...groupes.keys()].sort((a, b) => (ORDRE.indexOf(a) + 1 || 99) - (ORDRE.indexOf(b) + 1 || 99) || a.localeCompare(b, 'fr'));
    ['depart', 'destination'].forEach(type => {
      const select = $(type);
      for (const cat of cats) {
        let g = select.querySelector('optgroup[label="' + cat + '"]');
        if (!g) { g = document.createElement('optgroup'); g.label = cat; const avant = [...select.querySelectorAll('optgroup')].find(x => (ORDRE.indexOf(x.label) + 1 || 99) > (ORDRE.indexOf(cat) + 1 || 99)); select.insertBefore(g, avant || select.querySelector('option[value="personnalise"]')); }
        groupes.get(cat).sort((a, b) => a.nom.localeCompare(b.nom, 'fr')).forEach(l => { if (g.querySelector('option[value="' + CSS.escape(l.id) + '"]')) return; const o = cree('option', l.nom); o.value = l.id; g.append(o); });
      }
    });
  }
  async function ajouterStructuresSante() {
    try {
      if (!window.KokiPublicFeed || !window.KokiSanteContract) return;
      const flux = await KokiPublicFeed.charger();
      const lieux = [];
      for (const row of flux.contenus || []) {
        const v = KokiSanteContract.decode(row);
        if (!v || v.archive || v.latitude == null || v.longitude == null) continue;
        lieux.push({ id: 'sante-' + row.id, nom: row.titre, categorie: 'Santé', latitude: Number(v.latitude), longitude: Number(v.longitude) });
      }
      if (lieux.length) remplirLieux(lieux);
    } catch (_) { /* Sans le flux, les lieux de la carte restent proposés. */ }
  }
  function pointOption(type, point) {
    const select = $(type);
    let option = select.querySelector('option[value="personnalise"]');
    if (!option) { option = cree('option'); option.value = 'personnalise'; select.append(option); }
    option.textContent = point.nom; select.value = 'personnalise';
  }
  function carteInitialiser() {
    if (!window.L) { message('Carte indisponible. Utilisez les listes de lieux.'); return; }
    if (!carte) {
      carte = L.map('transport-carte').setView(CENTRE_KOKI, 14);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19, attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(carte);
      points = L.layerGroup().addTo(carte);
      carte.on('click', evenement => {
        if (!cible || courseActive()) return;
        const type = cible;
        etat[type] = { nom: (type === 'depart' ? 'Départ' : 'Destination') + ' sur la carte', latitude: evenement.latlng.lat, longitude: evenement.latlng.lng };
        pointOption(type, etat[type]); cible = null; cibleBoutons(); consigneCarte(null);
        message(type === 'depart' ? 'Départ placé sur la carte.' : 'Destination placée sur la carte.'); actualiser();
        setTimeout(() => document.querySelector('#vue-transport .tr-ligne' + (type === 'destination' ? '-destination' : '')) ?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 350);
      });
    }
    carte.invalidateSize();
  }
  function courseActive() { return etat.demo && etat.course && etat.course.statut !== 'Terminée'; }
  function cibleBoutons() {
    ['depart', 'destination'].forEach(type => $('point-' + type).setAttribute('aria-pressed', String(cible === type)));
  }
  function dessinerPoints() {
    if (!points) return;
    points.clearLayers();
    ['depart', 'destination'].forEach(type => {
      const point = etat[type];
      if (point) L.marker([point.latitude,point.longitude],{icon:L.divIcon({className:'tr-epingle tr-epingle-'+type,html:'<span></span>',iconSize:[26,26],iconAnchor:[13,13]}),keyboard:false}).bindPopup(cree('strong', point.nom)).addTo(points);
    });
    etat.chauffeurs.forEach(c => L.marker([c.localisation.latitude,c.localisation.longitude],{icon:iconeVehicule(),keyboard:false}).bindPopup(cree('strong', c.nom)).addTo(points));
    if (etat.depart && etat.destination) L.polyline([[etat.depart.latitude,etat.depart.longitude],[etat.destination.latitude,etat.destination.longitude]], {color:'#0B6B3A',weight:5,opacity:0.85,dashArray:'2 9',lineCap:'round'}).addTo(points);
  }
  const ICONE_MOTO = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5.5" cy="17" r="3"/><circle cx="18.5" cy="17" r="3"/><path d="M5.5 17l4-7h5l4 7M12 10l-2-4H7"/></svg>';
  const iconeVehicule = () => L.divIcon({className:'tr-marqueur-vehicule',html:'<span>'+ICONE_MOTO+'</span>',iconSize:[40,40],iconAnchor:[20,20]});
  function chauffeursDemo() {
    const point = etat.depart || {latitude:CENTRE_KOKI[0],longitude:CENTRE_KOKI[1]};
    return core.categories.map((categorie,index) => ({id:'demo-' + categorie,nom:'Chauffeur démo ' + categorie,categorie,vehicule:categorie + ' de démonstration',telephone:null,disponible:true,localisation:{latitude:point.latitude+0.002+index*0.0004,longitude:point.longitude+0.001},positionMiseAJour:new Date().toISOString(),demo:true}));
  }
  function selectionner(id) { if (courseActive()) return; etat.choisi = etat.chauffeurs.find(c => c.id === id) || null; actualiser(); }
  const initiales = nom => String(nom || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0].toUpperCase()).join('');
  function ligneChauffeur(nom, detail, choisi, onclick) {
    const b = cree('button'); b.type = 'button'; b.className = 'tr-chauffeur'; b.setAttribute('aria-pressed', String(!!choisi));
    const avatar = cree('span', initiales(nom)); avatar.className = 'tr-avatar'; avatar.setAttribute('aria-hidden', 'true');
    const texte = cree('span'); texte.className = 'tr-texte'; texte.append(cree('strong', nom), cree('span', detail));
    b.append(avatar, texte); b.onclick = onclick; return b;
  }
  function rendreChauffeurs() {
    const liste = $('chauffeurs'); liste.replaceChildren();
    if (etat.reel) {
      liste.append(cree('p', etat.reel.chauffeurs.length > 1 ? 'Chauffeurs disponibles, le plus proche d’abord :' : 'Chauffeur disponible :'));
      etat.reel.chauffeurs.forEach(d => liste.append(ligneChauffeur(d.name, d.category + ' · ' + d.proximity, etat.reel.choisi === d, () => { etat.reel.choisi = d; rendreChauffeurs(); rendreBouton(); })));
      return;
    }
    if (!etat.demo || !etat.depart) return;
    if (!etat.chauffeurs.length) { liste.append(cree('p', 'Aucun chauffeur de démonstration pour cette catégorie.')); return; }
    const c = etat.choisi || etat.chauffeurs[0];
    liste.append(ligneChauffeur(c.nom, c.vehicule + ' · à ' + c.distanceDepart.toFixed(1).replace('.', ',') + ' km', true, () => {}));
  }
  function rendreCourse() {
    const c=etat.demo?etat.course:null; $('course').hidden=!c;
    if (!c) return;
    $('statut').textContent='Démonstration · ' + c.statut;
    $('resume').textContent=c.depart.nom + ' → ' + c.destination.nom + ' · ' + c.categorie + ' · ' + c.chauffeur;
    document.querySelectorAll('#transport-course .transport-etapes li').forEach(li=>{if(li.textContent===c.statut)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');});
    const suivant=core.statuts[core.statuts.indexOf(c.statut)+1]; $('suivant').hidden=!suivant; $('suivant').textContent=suivant?'Simuler : ' + suivant:'Course terminée';
  }
  const montant = n => Number(n).toLocaleString('fr-FR') + ' F';
  const cleTrajet = () => JSON.stringify([etat.depart, etat.destination]);
  function rendreVehicules() {
    document.querySelectorAll('[data-vehicule]').forEach(b => {
      const cat = b.dataset.vehicule, p = etat.prix[cat], span = b.querySelector('[data-prix]');
      b.setAttribute('aria-pressed', String(cat === etat.categorie)); b.disabled = !!courseActive();
      if (!span) return;
      span.textContent = p ? p.texte : '—'; span.classList.toggle('tr-prix-attente', !!p && !p.montant);
    });
  }
  function rendreBouton() {
    const bouton = $('demander'), p = etat.prix[etat.categorie];
    if (etat.reel && etat.reel.choisi) { bouton.textContent = 'Confirmer avec ' + etat.reel.choisi.name + (p && p.montant ? ' · ' + montant(p.montant) : ''); bouton.disabled = false; return; }
    bouton.textContent = 'Commander · ' + etat.categorie + (p && p.montant ? ' · ' + montant(p.montant) : '');
    bouton.disabled = !etat.depart || !etat.destination || !!courseActive() || (etat.demo && !etat.chauffeurs.length);
    if (!etat.demo && p && p.erreur) { bouton.textContent = etat.categorie + ' · ' + p.texte; bouton.disabled = true; }
  }
  // Prix réels : une estimation serveur par catégorie (connecté) ; démonstration : tarifs fictifs locaux.
  async function estimerReel() {
    const g = ++generationPrix, cle = cleTrajet(), KB = window.KokiBusiness;
    const connecte = KB && KB.actif && KB.actif('transport') && await KB.transportConnecte?.();
    if (g !== generationPrix) return;
    if (!connecte) { core.categories.forEach(cat => { etat.prix[cat] = { texte: 'Connectez-vous pour le prix' }; }); rendreVehicules(); rendreBouton(); return; }
    core.categories.forEach(cat => { etat.prix[cat] = { texte: '…' }; }); rendreVehicules();
    await Promise.all(core.categories.map(async cat => {
      try { const q = await KB.estimer(cat, etat.depart, etat.destination); if (g === generationPrix && cle === cleTrajet()) etat.prix[cat] = { texte: montant(q.fare_fcfa), montant: q.fare_fcfa, quote: q, cle }; }
      catch (e) { if (g === generationPrix) etat.prix[cat] = { texte: /Tarif|tarif/.test(e.message) ? 'Tarif non publié' : 'Indisponible', erreur: e.message }; }
    }));
    if (g === generationPrix) { rendreVehicules(); rendreBouton(); }
  }
  function actualiser() {
    if (!configuration) return;
    const active = !!courseActive();
    ['depart','destination','position','point-depart','point-destination'].forEach(id => $(id).disabled = active);
    $('mode-info').textContent = etat.demo ? 'Démonstration : chauffeurs et tarifs fictifs. Aucun appel, message ou réservation n’est envoyé.' : 'Course fictive sur cet appareil, sans chauffeur réel.';
    $('reservation-info').textContent = etat.demo ? 'Démonstration : la course reste sur cet appareil.' : 'Prix estimé à vol d’oiseau, confirmé par Koki Connect avant la réservation.';
    etat.estimation = null;
    if (etat.reel && etat.reel.cle !== cleTrajet() + etat.categorie) etat.reel = null;
    if (etat.depart && etat.destination) {
      try {
        etat.estimation = core.estimer(etat.depart, etat.destination, etat.demo ? configuration.demoTarifs[etat.categorie] : null);
        $('estimation').textContent = etat.estimation.distance.toFixed(1).replace('.', ',') + ' km à vol d’oiseau · ' + etat.depart.nom + ' → ' + etat.destination.nom;
      } catch (e) { $('estimation').textContent = e.message; }
      if (etat.demo) core.categories.forEach(cat => { try { const x = core.estimer(etat.depart, etat.destination, configuration.demoTarifs[cat]); etat.prix[cat] = { texte: montant(x.prix), montant: x.prix }; } catch (_) { etat.prix[cat] = { texte: '—' }; } });
      else if (etat.prixCle !== cleTrajet()) { etat.prixCle = cleTrajet(); etat.prix = {}; clearTimeout(minuterie); minuterie = setTimeout(estimerReel, 350); }
    } else { $('estimation').textContent = 'Choisissez le départ et la destination.'; etat.prix = {}; etat.prixCle = null; }
    etat.chauffeurs = etat.depart && etat.demo ? core.proches(chauffeursDemo(), etat.depart, etat.categorie) : [];
    etat.choisi = etat.demo ? etat.chauffeurs[0] || null : null;
    rendreVehicules(); rendreBouton(); rendreChauffeurs(); rendreCourse(); dessinerPoints();
  }
  async function afficher() {
    document.querySelector('.search').hidden=true;
    document.querySelectorAll('body > .section').forEach(section=>{section.hidden=section.id!=='vue-transport';});
    document.getElementById('titre-transport').focus();
    document.getElementById('vue-transport').scrollIntoView({block:'start'});
    message('Chargement de Transport…');
    try { await initialiser(); carteInitialiser(); actualiser(); await window.KokiBusiness?.show('transport',etat.demo); actualiser(); message(''); await suivre(); }
    catch(e) { message(e.message); }
  }
  function changerLieu(type) {
    if (courseActive()) return;
    const valeur=$(type).value;
    if (valeur==='personnalise') return;
    const lieu=lieuxTransport.get(valeur);
    etat[type]=lieu?{nom:lieu.nom,latitude:lieu.latitude,longitude:lieu.longitude}:null;
    etat.choisi=null; actualiser();
  }
  async function utiliserPosition() {
    if (courseActive()) return;
    const bouton=$('position');bouton.disabled=true;message('Recherche de votre position…');
    try {
      const position=await obtenirPositionActuelle();
      if (courseActive()) return;
      etat.depart={nom:'Ma position actuelle',latitude:position.coords.latitude,longitude:position.coords.longitude};
      pointOption('depart',etat.depart);etat.choisi=null;
      if(carte)carte.setView([etat.depart.latitude,etat.depart.longitude],15);
      actualiser();message('Position utilisée comme départ (précision estimée : ' + Math.round(position.coords.accuracy) + ' m).');
    } catch(e) { message(e.message); }
    finally { bouton.disabled=!!courseActive(); }
  }
  function changerMode() {
    etat.demo=$('demo').checked;etat.choisi=null;etat.reel=null;etat.prix={};etat.prixCle=null;cible=null;
    if (etat.demo && etat.course) {
      etat.depart={...etat.course.depart};etat.destination={...etat.course.destination};etat.categorie=etat.course.categorie;
      pointOption('depart',etat.depart);pointOption('destination',etat.destination);
    }
    cibleBoutons();actualiser();window.KokiBusiness?.show('transport',etat.demo);if(etat.demo)masquerSuivi();else suivre();
  }
  function categorie(valeur) { if(courseActive() || !core.categories.includes(valeur))return;etat.categorie=valeur;etat.choisi=null;etat.reel=null;actualiser(); }
  function consigneCarte(type) {
    const zone = document.querySelector('#vue-transport .tr-carte-zone'); if (!zone) return;
    let c = zone.querySelector('.tr-consigne');
    if (!type) { if (c) c.remove(); zone.classList.remove('tr-mode-placement'); return; }
    if (!c) { c = cree('div'); c.className = 'tr-consigne'; c.setAttribute('role', 'status'); zone.append(c); }
    c.replaceChildren(cree('span', 'Touchez la carte pour placer ' + (type === 'depart' ? 'le départ' : 'la destination')));
    const annuler = cree('button', 'Annuler'); annuler.type = 'button'; annuler.onclick = () => { cible = null; cibleBoutons(); consigneCarte(null); };
    c.append(annuler); zone.classList.add('tr-mode-placement');
  }
  function choisirPoint(type) {
    if (!carte) { message('Carte indisponible. Choisissez un lieu dans les listes.'); return; }
    cible = type; cibleBoutons(); consigneCarte(type); message('');
    const zone = document.querySelector('#vue-transport .tr-carte-zone');
    if (zone) zone.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    setTimeout(() => carte && carte.invalidateSize(), 300);
  }
  async function demander() {
    const bouton = $('demander');
    if (etat.demo) {
      actualiser();
      if (!etat.estimation || !etat.choisi || courseActive()) return;
      etat.course = {schemaVersion:1,id:'demo-' + Date.now(),demo:true,depart:{...etat.depart},destination:{...etat.destination},categorie:etat.categorie,chauffeur:etat.choisi.nom,chauffeurId:etat.choisi.id,estimation:{...etat.estimation},statut:'En attente',creeLe:new Date().toISOString(),miseAJour:new Date().toISOString()};
      depot.sauverCourse(etat.course); actualiser(); $('course').scrollIntoView({block:'center'}); return;
    }
    const KB = window.KokiBusiness;
    if (!KB || !KB.actif || !KB.actif('transport')) { message('La réservation en ligne n’est pas disponible pour le moment.'); return; }
    if (!etat.depart || !etat.destination) { message('Choisissez le départ et la destination.'); return; }
    bouton.disabled = true;
    try {
      if (!await KB.transportConnecte()) { KB.ouvrirConnexion('transport'); message('Connectez-vous (ou créez votre compte) pour commander une course.'); return; }
      // 2e appui : réservation auprès du chauffeur choisi, sur une estimation encore valable.
      if (etat.reel && etat.reel.choisi) {
        let q = etat.reel.quote;
        if (!q || Date.parse(q.expires_at) <= Date.now() + 15000) q = await KB.estimer(etat.categorie, etat.depart, etat.destination);
        const course = await KB.reserver(q, etat.reel.choisi.vehicle_id);
        etat.reel = null; actualiser();
        message('Course demandée · référence ' + course.id.slice(0, 8) + '. ' + 'Le chauffeur doit accepter : suivez la réponse dans « Mes courses et historique ».');
        await suivre(); document.getElementById('vue-transport').scrollIntoView({block:'start'});
        return;
      }
      // 1er appui : estimation valable et chauffeurs disponibles, le plus proche présélectionné.
      const p = etat.prix[etat.categorie];
      let q = p && p.quote && p.cle === cleTrajet() && Date.parse(p.quote.expires_at) > Date.now() + 15000 ? p.quote : null;
      if (!q) q = await KB.estimer(etat.categorie, etat.depart, etat.destination);
      const chauffeurs = await KB.chauffeursProches(etat.categorie, etat.depart);
      if (!chauffeurs.length) { etat.reel = null; message('Aucun chauffeur ' + etat.categorie.toLowerCase() + ' validé n’est disponible près du départ. Essayez une autre catégorie ou réessayez dans quelques minutes.'); return; }
      etat.reel = { quote: q, chauffeurs, choisi: chauffeurs[0], cle: cleTrajet() + etat.categorie };
      message('Vérifiez le chauffeur puis confirmez la course.');
    } catch (e) { message(/Tarif validé indisponible/.test(e.message) ? 'Les tarifs « ' + etat.categorie + ' » ne sont pas encore publiés par Koki Connect. Essayez une autre catégorie.' : e.message); }
    finally { rendreChauffeurs(); rendreBouton(); }
  }
  function avancer() { if(!etat.demo || !etat.course)return;const suivant=core.statuts[core.statuts.indexOf(etat.course.statut)+1];if(!suivant)return;etat.course=core.transition(etat.course,suivant);depot.sauverCourse(etat.course);actualiser(); }
  function reinitialiserCourse() { etat.course=null;depot.sauverCourse(null);actualiser(); }
  async function preparerTrajet(trajet) {
    if (!core.pointValide(trajet.depart) || !core.pointValide(trajet.destination)) return;
    await afficher();
    if (courseActive()) { message('Une course démo est déjà active. Terminez-la avant de préparer ce déplacement.'); return; }
    etat.depart={...trajet.depart};etat.destination={...trajet.destination};etat.choisi=null;
    pointOption('depart',etat.depart);pointOption('destination',etat.destination);
    actualiser();
    if (carte) carte.fitBounds([[etat.depart.latitude,etat.depart.longitude],[etat.destination.latitude,etat.destination.longitude]],{padding:[20,20],maxZoom:15});
    message('Trajet préparé depuis Commerces & Services. Aucun chauffeur ni livreur n’est réservé.');
  }

  // ——— Course réelle : suivi en direct, code de départ, contacts, partage, sécurité, note ———
  const ACTIVES = ['En attente','Acceptée','Chauffeur en route','Course en cours'];
  const ETAPES = ['En attente','Acceptée','Chauffeur en route','Course en cours','Terminée'];
  const cleNotes = 'koki.transport.notees.v1', DELAI_REPONSE = 120000;
  let suiviTimer = null, suiviGen = 0, marqueurChauffeur = null, suiviCourse = null, suiviContacts = null, compte = null, urgences = null;
  const notees = () => { try { const x = JSON.parse(localStorage.getItem(cleNotes)); return Array.isArray(x) ? x : []; } catch (_) { return []; } };
  const marquerNotee = id => { try { localStorage.setItem(cleNotes, JSON.stringify([...notees(), id].slice(-50))); } catch (_) {} };
  const ICONES = {
    tel: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-3 2a11 11 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>',
    msg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z"/></svg>',
    partage: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/></svg>',
    securite: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M12 8v5M12 16v.5"/></svg>',
    etoile: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/></svg>'
  };
  function outil(label, icone, action, href) {
    const e = href ? cree('a') : cree('button'); e.className = 'tr-outil' + (icone === 'securite' ? ' tr-outil-alerte' : '');
    if (href) { e.href = href; if (href.startsWith('https:')) { e.target = '_blank'; e.rel = 'noopener'; } } else { e.type = 'button'; e.onclick = action; }
    const i = cree('span'); i.innerHTML = ICONES[icone]; e.append(i.firstChild, cree('span', label)); return e;
  }
  function masquerSuivi() {
    suiviCourse = null; clearTimeout(suiviTimer); clearInterval(compte);
    $('suivi').hidden = true; $('suivi').replaceChildren(); $('reservation').hidden = false;
    document.getElementById('titre-transport').textContent = 'Où allez-vous ?';
    if (marqueurChauffeur) { marqueurChauffeur.remove(); marqueurChauffeur = null; }
  }
  function planifier() {
    clearTimeout(suiviTimer);
    if (!suiviCourse || !ACTIVES.includes(suiviCourse.statut)) return;
    suiviTimer = setTimeout(() => { if (!document.getElementById('vue-transport').hidden && !document.hidden) suivre(); else planifier(); }, 10000);
  }
  async function suivre() {
    const g = ++suiviGen, KB = window.KokiBusiness, S = KB && KB.transportSuivi;
    if (etat.demo || !S || !KB.actif || !KB.actif('transport')) { masquerSuivi(); return; }
    let course = null; try { course = await S.courseClient(); } catch (_) { course = null; }
    if (g !== suiviGen) return;
    if (!course || (course.statut === 'Terminée' && notees().includes(course.id))) { masquerSuivi(); return; }
    let code = null, position = null, contacts = null;
    if (['Acceptée','Chauffeur en route'].includes(course.statut)) { try { code = (await S.code(course.id)).code; } catch (_) {} }
    if (['Acceptée','Chauffeur en route','Course en cours'].includes(course.statut)) {
      try { position = (await S.position(course.id)).position; } catch (_) {}
      try { contacts = suiviContacts && suiviContacts.id === course.id ? suiviContacts : { id: course.id, ...(await S.contacts(course.id)) }; suiviContacts = contacts; } catch (_) {}
    }
    if (g !== suiviGen) return;
    suiviCourse = course; rendreSuivi(course, code, position, contacts); planifier();
  }
  function placerChauffeur(course, position) {
    if (!carte || !window.L) return;
    if (!position || !core.pointValide(position)) { if (marqueurChauffeur) { marqueurChauffeur.remove(); marqueurChauffeur = null; } return; }
    const ll = [position.latitude, position.longitude];
    if (marqueurChauffeur) marqueurChauffeur.setLatLng(ll); else marqueurChauffeur = L.marker(ll, {icon: iconeVehicule(), keyboard: false, zIndexOffset: 500}).addTo(carte);
    const depart = course.payload && course.payload.depart;
    if (depart && core.pointValide(depart)) carte.fitBounds([ll, [depart.latitude, depart.longitude]], {padding: [40, 40], maxZoom: 16});
  }
  function texteCourse(course, contacts) {
    const p = course.payload || {};
    return 'Je suis en course avec Koki Connect : ' + (p.categorie || 'véhicule') + (contacts && contacts.name ? ' avec ' + contacts.name : '') + ', statut « ' + course.statut + ' ».' +
      (p.destination && core.pointValide(p.destination) ? ' Destination : https://www.openstreetmap.org/?mlat=' + p.destination.latitude + '&mlon=' + p.destination.longitude + '#map=16/' + p.destination.latitude + '/' + p.destination.longitude : '') + ' Référence ' + course.id.slice(0, 8) + '.';
  }
  async function partager(course, contacts) {
    const texte = texteCourse(course, contacts);
    try { if (navigator.share) { await navigator.share({ title: 'Ma course Koki Connect', text: texte }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    window.open('https://wa.me/?text=' + encodeURIComponent(texte), '_blank', 'noopener');
  }
  async function panneauSecurite(zone, course) {
    if (!zone.hidden) { zone.hidden = true; return; }
    zone.hidden = false; zone.replaceChildren(cree('h4', 'Sécurité'));
    if (!urgences) { try { const d = await (await fetch('assets/portail/numeros-utiles.json')).json(); urgences = (d.groupes.find(g => g.titre === 'Urgences nationales') || {numeros: []}).numeros.slice(0, 3); } catch (_) { urgences = [{nom: 'Police secours', telephone: '17'}, {nom: 'Sapeurs-pompiers', telephone: '18'}, {nom: 'SAMU national', telephone: '1515'}]; } }
    const liste = cree('div'); liste.className = 'tr-urgences';
    urgences.forEach(u => { const a = cree('a', u.nom + ' · ' + u.telephone); a.href = 'tel:' + String(u.telephone).replace(/\s/g, ''); liste.append(a); });
    zone.append(liste, cree('p', 'Signaler un problème à Koki Connect :'));
    const motif = cree('select'); motif.setAttribute('aria-label', 'Motif du signalement');
    ['Sécurité','Comportement','Itinéraire','Prix','Objet perdu','Autre'].forEach(m => motif.append(cree('option', m)));
    const details = cree('textarea'); details.rows = 2; details.maxLength = 1000; details.setAttribute('aria-label', 'Détails du signalement'); details.placeholder = 'Décrivez ce qui s’est passé (facultatif)';
    const envoyer = cree('button', 'Envoyer le signalement'); envoyer.type = 'button'; envoyer.className = 'tr-secondaire';
    envoyer.onclick = async () => { envoyer.disabled = true; try { await window.KokiBusiness.transportSuivi.signaler(course.id, motif.value, details.value.trim()); zone.replaceChildren(cree('p', 'Signalement envoyé à Koki Connect. En cas de danger, appelez immédiatement les urgences.')); } catch (e) { message(e.message); envoyer.disabled = false; } };
    zone.append(motif, details, envoyer);
  }
  function rendreSuivi(course, code, position, contacts) {
    const box = $('suivi'), p = course.payload || {}, S = window.KokiBusiness.transportSuivi;
    clearInterval(compte); box.replaceChildren(); box.hidden = false; $('reservation').hidden = true;
    document.getElementById('titre-transport').textContent = course.statut === 'Terminée' ? 'Course terminée' : 'Votre course';
    if (course.statut === 'Terminée') { placerChauffeur(course, null); rendreNote(box, course, contacts); return; }
    const titres = {'En attente': ['Demande envoyée', 'Le chauffeur doit accepter votre course.'], 'Acceptée': ['Chauffeur trouvé', 'Il se prépare à venir vous chercher.'], 'Chauffeur en route': ['Votre chauffeur arrive', 'Préparez-vous au point de départ.'], 'Course en cours': ['Course en cours', 'Bon trajet avec Koki Connect.']};
    const bandeau = cree('div'); bandeau.className = 'tr-bandeau';
    const t = cree('div'); t.append(cree('strong', titres[course.statut][0]), cree('span', titres[course.statut][1])); bandeau.append(t);
    if (code) { const c = cree('div'); c.className = 'tr-code'; c.append(cree('span', 'Code de départ')); const n = cree('strong', code.split('').join(' ')); n.setAttribute('aria-label', 'Code ' + code.split('').join(' ')); c.append(n); bandeau.append(c); }
    box.append(bandeau);
    if (code) box.append(cree('p', 'Donnez ce code au chauffeur à son arrivée : la course ne peut pas démarrer sans lui.'));
    if (course.statut === 'En attente') {
      const reste = cree('p'); reste.className = 'tr-compte'; reste.setAttribute('aria-live', 'polite'); box.append(reste);
      const fin = Date.parse(course.created_at) + DELAI_REPONSE;
      const maj = () => {
        const ms = fin - Date.now();
        if (ms > 0) { const sec = Math.ceil(ms / 1000); reste.textContent = 'Réponse attendue sous ' + Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); return; }
        clearInterval(compte); reste.textContent = 'Pas de réponse du chauffeur.';
        const autre = cree('button', 'Choisir un autre chauffeur'); autre.type = 'button'; autre.className = 'tr-commander';
        autre.onclick = async () => { autre.disabled = true; try { await S.annuler(course); } catch (_) {} masquerSuivi(); etat.reel = null; actualiser(); message('Demande annulée. Choisissez un autre chauffeur.'); };
        reste.after(autre);
      };
      maj(); compte = setInterval(maj, 1000);
    }
    const etapes = cree('ol'); etapes.className = 'tr-etapes'; etapes.setAttribute('aria-label', 'Étapes de la course');
    ETAPES.forEach(e => { const li = cree('li', e); if (e === course.statut) li.setAttribute('aria-current', 'step'); etapes.append(li); });
    box.append(etapes);
    const fiche = cree('div'); fiche.className = 'tr-chauffeur';
    const nom = contacts && contacts.name ? contacts.name : 'Votre chauffeur';
    const avatar = cree('span', initiales(nom)); avatar.className = 'tr-avatar'; avatar.setAttribute('aria-hidden', 'true');
    const tx = cree('span'); tx.className = 'tr-texte'; tx.append(cree('strong', nom), cree('span', (p.categorie || '') + ' · vérifié par Koki Connect'));
    const prix = cree('strong', p.tarif != null ? montant(p.tarif) : ''); prix.className = 'tr-prix';
    fiche.append(avatar, tx, prix); box.append(fiche);
    const outils = cree('div'); outils.className = 'tr-outils';
    const tel = contacts && core.telephone(contacts.phone || contacts.telephone);
    if (tel) outils.append(outil('Appeler', 'tel', null, 'tel:' + tel), outil('WhatsApp', 'msg', null, 'https://wa.me/' + tel.replace('+', '')));
    const securite = cree('div'); securite.className = 'tr-securite'; securite.hidden = true;
    outils.append(outil('Partager', 'partage', () => partager(course, contacts)), outil('Sécurité', 'securite', () => panneauSecurite(securite, course)));
    box.append(outils, securite);
    if (['En attente','Acceptée'].includes(course.statut)) {
      const annuler = cree('button', 'Annuler la course'); annuler.type = 'button'; annuler.className = 'tr-lien-annuler';
      annuler.onclick = async () => { if (!confirm('Annuler cette course ?')) return; annuler.disabled = true; try { await S.annuler(course); masquerSuivi(); actualiser(); message('Course annulée.'); } catch (e) { message(e.message); annuler.disabled = false; } };
      box.append(annuler);
    }
    placerChauffeur(course, position);
  }
  function rendreNote(box, course, contacts) {
    const S = window.KokiBusiness.transportSuivi, p = course.payload || {};
    const tete = cree('div'); tete.className = 'tr-fin'; tete.append(cree('strong', 'Vous êtes arrivé'), cree('span', 'À payer en espèces : ' + (p.tarif != null ? montant(p.tarif) : '—')));
    box.append(tete, cree('h3', 'Comment s’est passée la course ?'));
    let note = 5; const tags = new Set();
    const etoiles = cree('div'); etoiles.className = 'tr-etoiles'; etoiles.setAttribute('role', 'group'); etoiles.setAttribute('aria-label', 'Note du chauffeur');
    const dessiner = () => etoiles.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', String(i < note)));
    for (let i = 1; i <= 5; i++) { const b = cree('button'); b.type = 'button'; b.setAttribute('aria-label', i + ' étoile' + (i > 1 ? 's' : '')); const s = cree('span'); s.innerHTML = ICONES.etoile; b.append(s.firstChild); b.onclick = () => { note = i; dessiner(); }; etoiles.append(b); }
    dessiner(); box.append(etoiles);
    const puces = cree('div'); puces.className = 'tr-puces';
    ['Ponctuel','Conduite prudente','Courtois','Casque fourni','Véhicule propre','Prix respecté'].forEach(t => { const b = cree('button', t); b.type = 'button'; b.setAttribute('aria-pressed', 'false'); b.onclick = () => { if (tags.has(t)) tags.delete(t); else tags.add(t); b.setAttribute('aria-pressed', String(tags.has(t))); }; puces.append(b); });
    const commentaire = cree('textarea'); commentaire.rows = 2; commentaire.maxLength = 500; commentaire.placeholder = 'Un commentaire (facultatif)'; commentaire.setAttribute('aria-label', 'Commentaire sur la course');
    const envoyer = cree('button', 'Envoyer et terminer'); envoyer.type = 'button'; envoyer.className = 'tr-commander';
    envoyer.onclick = async () => { envoyer.disabled = true; try { await S.noter(course.id, note, [...tags], commentaire.value.trim()); marquerNotee(course.id); masquerSuivi(); actualiser(); message('Merci ! Votre note aide les autres clients de Koki.'); } catch (e) { if (/déjà notée/.test(e.message)) { marquerNotee(course.id); masquerSuivi(); actualiser(); return; } message(e.message); envoyer.disabled = false; } };
    const plusTard = cree('button', 'Plus tard'); plusTard.type = 'button'; plusTard.className = 'tr-lien-annuler'; plusTard.onclick = () => { marquerNotee(course.id); masquerSuivi(); actualiser(); };
    const securite = cree('div'); securite.className = 'tr-securite'; securite.hidden = true;
    const signaler = cree('button', 'Signaler un problème'); signaler.type = 'button'; signaler.className = 'tr-lien-annuler'; signaler.onclick = () => panneauSecurite(securite, course);
    box.append(puces, commentaire, envoyer, plusTard, signaler, securite);
  }
  window.KokiTransport=Object.freeze({connectedTrip:()=>({depart:etat.depart,destination:etat.destination,categorie:etat.categorie}),afficher,changerLieu,utiliserPosition,changerMode,categorie,choisirPoint,demander,avancer,reinitialiserCourse,preparerTrajet});
  window.afficherTransport=afficher;
  // Connexion ou déconnexion dans la rubrique : les prix réels sont recalculés.
  window.addEventListener('koki-transport-session',()=>{etat.prixCle=null;etat.reel=null;actualiser();suivre();});
})();
