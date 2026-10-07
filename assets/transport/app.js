(function () {
  'use strict';
  const core = KokiTransportCore;
  const $ = id => document.getElementById('transport-' + id);
  const etat = { demo: false, categorie: 'Moto', depart: null, destination: null, choisi: null, chauffeurs: [], estimation: null, course: null };
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
      if (point) L.circleMarker([point.latitude,point.longitude],{radius:8,color:type==='depart'?'#087a3d':'#d8004f',fillOpacity:0.9}).bindPopup(cree('strong', point.nom)).addTo(points);
    });
    etat.chauffeurs.forEach(c => L.circleMarker([c.localisation.latitude,c.localisation.longitude],{radius:5,color:'#245d88',fillOpacity:0.9}).bindPopup(cree('strong', c.nom)).addTo(points));
    if (etat.depart && etat.destination) L.polyline([[etat.depart.latitude,etat.depart.longitude],[etat.destination.latitude,etat.destination.longitude]], {color:'#245d88',dashArray:'5 7'}).addTo(points);
  }
  function chauffeursDemo() {
    const point = etat.depart || {latitude:CENTRE_KOKI[0],longitude:CENTRE_KOKI[1]};
    return core.categories.map((categorie,index) => ({id:'demo-' + categorie,nom:'Chauffeur démo ' + categorie,categorie,vehicule:categorie + ' de démonstration',telephone:null,disponible:true,localisation:{latitude:point.latitude+0.002+index*0.0004,longitude:point.longitude+0.001},positionMiseAJour:new Date().toISOString(),demo:true}));
  }
  function selectionner(id) { if (courseActive()) return; etat.choisi = etat.chauffeurs.find(c => c.id === id) || null; actualiser(); }
  function rendreChauffeurs() {
    const liste = $('chauffeurs'); liste.replaceChildren();
    if (!etat.depart) { liste.append(cree('p','Choisissez un départ pour trouver les chauffeurs proches.')); return; }
    if (!etat.chauffeurs.length) { liste.append(cree('p', 'Aucun chauffeur disponible référencé pour cette catégorie.')); return; }
    etat.chauffeurs.forEach(c => {
      const fiche = cree('article'); fiche.className = 'transport-chauffeur';
      fiche.append(cree('h4', c.nom),cree('p', c.vehicule + ' · Disponible'),cree('p', c.distanceDepart.toFixed(2) + ' km du départ · ' + c.localisation.latitude.toFixed(5) + ', ' + c.localisation.longitude.toFixed(5)),cree('p',c.demo?'Téléphone : non fourni (démonstration)': 'Téléphone : ' + (c.telephone || 'non renseigné')));
      const actions = cree('div'); actions.className = 'transport-actions';
      const choisir = cree('button', etat.choisi && etat.choisi.id===c.id?'Sélectionné':'Choisir ce chauffeur'); choisir.type='button'; choisir.setAttribute('aria-pressed',String(!!etat.choisi && etat.choisi.id===c.id)); choisir.disabled=!!courseActive(); choisir.onclick=()=>selectionner(c.id); actions.append(choisir);
      const tel = core.telephone(c.telephone);
      if (tel && !c.demo) {
        const appel = cree('a','Appeler'); appel.className='transport-lien'; appel.href='tel:' + tel;
        const whatsapp = cree('a','WhatsApp'); whatsapp.className='transport-lien'; whatsapp.href='https://wa.me/' + tel.replace('+',''); whatsapp.target='_blank'; whatsapp.rel='noopener';
        actions.append(appel,whatsapp);
      } else {
        ['Appeler','WhatsApp'].forEach(label=>{const bouton=cree('button',label);bouton.type='button';bouton.disabled=true;bouton.title='Disponible avec le numéro d’un chauffeur réel.';actions.append(bouton);});
      }
      fiche.append(actions); liste.append(fiche);
    });
  }
  function rendreCourse() {
    const c=etat.demo?etat.course:null; $('course').hidden=!c;
    if (!c) return;
    $('statut').textContent='Démonstration · ' + c.statut;
    $('resume').textContent=c.depart.nom + ' → ' + c.destination.nom + ' · ' + c.categorie + ' · ' + c.chauffeur;
    document.querySelectorAll('#transport-course .transport-etapes li').forEach(li=>{if(li.textContent===c.statut)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');});
    const suivant=core.statuts[core.statuts.indexOf(c.statut)+1]; $('suivant').hidden=!suivant; $('suivant').textContent=suivant?'Simuler : ' + suivant:'Course terminée';
  }
  function actualiser() {
    if (!configuration) return;
    const active=!!courseActive();
    ['depart','destination','position','point-depart','point-destination'].forEach(id=>$(id).disabled=active);
    document.querySelectorAll('[data-vehicule]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.vehicule===etat.categorie));b.disabled=active;});
    $('mode-info').textContent=etat.demo?'Démonstration : chauffeurs et tarifs fictifs. Aucun appel, message ou réservation n’est envoyé.':'Service en préparation : les chauffeurs et tarifs réels seront ajoutés après validation.';
    $('reservation-info').textContent=etat.demo?'Ce bouton crée uniquement une course de démonstration sur cet appareil.':'Les réservations réelles ne sont pas encore ouvertes.';
    etat.estimation=null;
    if (etat.depart && etat.destination) {
      try {
        const tarif=etat.demo?configuration.demoTarifs[etat.categorie]:configuration.tarifs && configuration.tarifs[etat.categorie];
        etat.estimation=core.estimer(etat.depart,etat.destination,tarif);
        $('estimation').textContent=etat.estimation.distance.toFixed(2) + ' km à vol d’oiseau · ' + (etat.estimation.prix===null?'Tarif à confirmer':etat.estimation.prix.toLocaleString('fr-FR') + ' FCFA' + (etat.demo?' — tarif fictif de démonstration':''));
      } catch(e) { $('estimation').textContent=e.message; }
    } else $('estimation').textContent='Sélectionnez le départ et la destination.';
    etat.chauffeurs=etat.depart?core.proches(etat.demo?chauffeursDemo():configuration.chauffeurs,etat.depart,etat.categorie):[];
    if (etat.choisi) etat.choisi=etat.chauffeurs.find(c=>c.id===etat.choisi.id) || null;
    $('demander').disabled=!etat.demo || !etat.estimation || !etat.choisi || active;
    rendreChauffeurs(); rendreCourse(); dessinerPoints();
  }
  async function afficher() {
    document.querySelector('.search').hidden=true;
    document.querySelectorAll('body > .section').forEach(section=>{section.hidden=section.id!=='vue-transport';});
    document.getElementById('titre-transport').focus();
    document.getElementById('vue-transport').scrollIntoView({block:'start'});
    message('Chargement de Transport…');
    try { await initialiser(); carteInitialiser(); actualiser(); message('Choisissez votre trajet.'); }
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
    etat.demo=$('demo').checked;etat.choisi=null;cible=null;
    if (etat.demo && etat.course) {
      etat.depart={...etat.course.depart};etat.destination={...etat.course.destination};etat.categorie=etat.course.categorie;
      pointOption('depart',etat.depart);pointOption('destination',etat.destination);
    }
    cibleBoutons();actualiser();
  }
  function categorie(valeur) { if(courseActive() || !core.categories.includes(valeur))return;etat.categorie=valeur;etat.choisi=null;actualiser(); }
  function choisirPoint(type) { if(!carte){message('Carte indisponible. Choisissez un lieu dans les listes.');return;}cible=type;cibleBoutons();message('Touchez la carte pour placer ' + (type==='depart'?'le départ.':'la destination.')); }
  async function demander() {
    if(!etat.demo){try{await depot.demanderReelle();}catch(e){message(e.message);}return;}
    actualiser();
    if(!etat.estimation || !etat.choisi || courseActive())return;
    etat.course={schemaVersion:1,id:'demo-' + Date.now(),demo:true,depart:{...etat.depart},destination:{...etat.destination},categorie:etat.categorie,chauffeur:etat.choisi.nom,chauffeurId:etat.choisi.id,estimation:{...etat.estimation},statut:'En attente',creeLe:new Date().toISOString(),miseAJour:new Date().toISOString()};
    depot.sauverCourse(etat.course);actualiser();$('course').scrollIntoView({block:'center'});
  }
  function avancer() { if(!etat.demo || !etat.course)return;const suivant=core.statuts[core.statuts.indexOf(etat.course.statut)+1];if(!suivant)return;etat.course=core.transition(etat.course,suivant);depot.sauverCourse(etat.course);actualiser(); }
  function reinitialiserCourse() { etat.course=null;depot.sauverCourse(null);actualiser(); }
  window.KokiTransport=Object.freeze({afficher,changerLieu,utiliserPosition,changerMode,categorie,choisirPoint,demander,avancer,reinitialiserCourse});
  window.afficherTransport=afficher;
})();
