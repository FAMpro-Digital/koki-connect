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
      ['depart', 'destination'].forEach(type => {
        const select = $(type);
        donnees.lieux.forEach(lieu => { const option = cree('option', lieu.nom + ' — ' + lieu.categorie); option.value = lieu.id; select.append(option); });
      });
      etat.course = depot.lireCourse();
      if (etat.course) {
        etat.demo = true; $('demo').checked = true;
        etat.depart = etat.course.depart; etat.destination = etat.course.destination; etat.categorie = etat.course.categorie;
        pointOption('depart', etat.depart); pointOption('destination', etat.destination);
      }
    }).catch(erreur => { initialisation = null; throw erreur; });
    return initialisation;
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
        pointOption(type, etat[type]); cible = null; cibleBoutons();
        message('Point enregistré.'); actualiser();
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
      if (point) L.circleMarker([point.latitude,point.longitude],{radius:9,weight:4,color:'#ffffff',fillColor:type==='depart'?'#0B6B3A':'#F28C28',fillOpacity:1}).bindPopup(cree('strong', point.nom)).addTo(points);
    });
    etat.chauffeurs.forEach(c => L.circleMarker([c.localisation.latitude,c.localisation.longitude],{radius:7,weight:3,color:'#ffffff',fillColor:'#C2570C',fillOpacity:1}).bindPopup(cree('strong', c.nom)).addTo(points));
    if (etat.depart && etat.destination) L.polyline([[etat.depart.latitude,etat.depart.longitude],[etat.destination.latitude,etat.destination.longitude]], {color:'#0B6B3A',weight:5,opacity:0.85,dashArray:'2 9',lineCap:'round'}).addTo(points);
  }
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
    try { await initialiser(); carteInitialiser(); actualiser(); await window.KokiBusiness?.show('transport',etat.demo); actualiser(); message('Choisissez votre trajet.'); }
    catch(e) { message(e.message); }
  }
  function changerLieu(type) {
    if (courseActive()) return;
    const valeur=$(type).value;
    if (valeur==='personnalise') return;
    const lieu=donneesCarte && donneesCarte.lieux.find(l=>l.id===valeur);
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
    cibleBoutons();actualiser();window.KokiBusiness?.show('transport',etat.demo);
  }
  function categorie(valeur) { if(courseActive() || !core.categories.includes(valeur))return;etat.categorie=valeur;etat.choisi=null;etat.reel=null;actualiser(); }
  function choisirPoint(type) { if(!carte){message('Carte indisponible. Choisissez un lieu dans les listes.');return;}cible=type;cibleBoutons();message('Touchez la carte pour placer ' + (type==='depart'?'le départ.':'la destination.')); }
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
        document.getElementById('business-transport')?.scrollIntoView({block:'start'});
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
  window.KokiTransport=Object.freeze({connectedTrip:()=>({depart:etat.depart,destination:etat.destination,categorie:etat.categorie}),afficher,changerLieu,utiliserPosition,changerMode,categorie,choisirPoint,demander,avancer,reinitialiserCourse,preparerTrajet});
  window.afficherTransport=afficher;
  // Connexion ou déconnexion dans la rubrique : les prix réels sont recalculés.
  window.addEventListener('koki-transport-session',()=>{etat.prixCle=null;etat.reel=null;actualiser();});
})();
