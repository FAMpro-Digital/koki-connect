#!/usr/bin/env python3
"""Convertit le classeur de collecte rempli en fichiers prêts à importer.

Usage :
    python3 collecte/convertir_collecte.py Koki_Collecte_Donnees.xlsx [dossier_de_sortie]

Seules les lignes avec « Autorisation de publier = Oui » ET « Vérifié = Oui » sont converties.
Chaque ligne est contrôlée avec les règles du serveur (téléphone international, longueurs, coordonnées) ;
les lignes en erreur sont exclues et listées dans rapport.md.

Fichiers produits (dossier collecte/sortie/ par défaut) :
  numeros-utiles.json       -> à copier dans assets/portail/numeros-utiles.json (affiché dans « Numéros utiles »)
  contenus-admin.json       -> brouillons « Informations utiles » (écoles, santé, services publics) pour Koki Connect Admin
  commercants-a-inviter.csv -> commerçants d'accord pour l'annuaire, à inviter à créer leur fiche (validation dans l'admin)
  rapport.md                -> contrôle ligne par ligne
"""
import json
import math
import re
import sys
from datetime import date, datetime
from pathlib import Path

from openpyxl import load_workbook

CENTRE = (15.505949, -15.9919614)  # centre de Koki (assets/koki-carte.json)
NIVEAUX = ["Préscolaire", "Élémentaire", "Moyen", "Secondaire", "Enseignement religieux",
           "Formation professionnelle", "Supérieur", "Autre"]
SECTEURS = ["Public", "Privé", "Communautaire", "Autre"]
PROFILS = ["Commerçant", "Prestataire de services", "Les deux"]
GROUPES = ["Urgences nationales", "Santé", "Sécurité", "Administration", "Eau et électricité", "Transport", "Autre"]
CATEGORIES_LIEUX = ["Santé", "Services publics"]
CONTROLE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


class Erreur(Exception):
    pass


def texte(v):
    if v is None:
        return ""
    if isinstance(v, (datetime, date)):
        return v.strftime("%Y-%m-%d")
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    return re.sub(r"\s+", " ", str(v)).strip()


def champ(ligne, nom, mini=0, maxi=500, obligatoire=False):
    v = texte(ligne.get(nom))
    if not v:
        if obligatoire:
            raise Erreur(f"« {nom} » est obligatoire")
        return ""
    if CONTROLE.search(v):
        raise Erreur(f"« {nom} » contient des caractères non autorisés")
    if not mini <= len(v) <= maxi:
        raise Erreur(f"« {nom} » doit avoir de {mini} à {maxi} caractères (actuellement {len(v)})")
    return v


def choix(ligne, nom, valeurs):
    v = champ(ligne, nom, obligatoire=True)
    if v not in valeurs:
        raise Erreur(f"« {nom} » doit être l'une des valeurs : {', '.join(valeurs)}")
    return v


def date_iso(ligne, nom, obligatoire=True):
    v = champ(ligne, nom, obligatoire=obligatoire)
    if not v:
        return ""
    try:
        d = datetime.strptime(v, "%Y-%m-%d").date()
    except ValueError:
        raise Erreur(f"« {nom} » doit être une date AAAA-MM-JJ (reçu : {v})")
    if d > date.today():
        raise Erreur(f"« {nom} » est dans le futur ({v})")
    return v


def tel_international(ligne, nom, obligatoire=True):
    v = champ(ligne, nom, 1, 40, obligatoire)
    if not v:
        return ""
    n = re.sub(r"[\s().-]", "", v)
    if re.fullmatch(r"7[05-8]\d{7}", n):
        n = "+221" + n
    if not re.fullmatch(r"\+[1-9]\d{7,14}", n):
        raise Erreur(f"« {nom} » : format international attendu (+221 77 123 45 67), reçu « {v} »")
    return n


def tel_affichage(ligne, nom, obligatoire=False):
    """Numéro affiché tel quel (numéros courts d'urgence acceptés)."""
    v = champ(ligne, nom, 2, 24, obligatoire)
    if v and not re.fullmatch(r"\+?[0-9][0-9 ().-]{1,22}", v):
        raise Erreur(f"« {nom} » : numéro invalide « {v} »")
    return v


def decimal(ligne, nom, borne, obligatoire):
    v = ligne.get(nom)
    if v is None or texte(v) == "":
        if obligatoire:
            raise Erreur(f"« {nom} » est obligatoire")
        return None
    try:
        x = float(str(v).replace(",", "."))
    except ValueError:
        raise Erreur(f"« {nom} » doit être un nombre décimal avec un point (reçu : {v})")
    if abs(x) > borne:
        raise Erreur(f"« {nom} » hors limites (±{borne})")
    return x


def distance_km(a, b):
    r = math.pi / 180
    h = math.sin((b[0] - a[0]) * r / 2) ** 2 + math.cos(a[0] * r) * math.cos(b[0] * r) * math.sin((b[1] - a[1]) * r / 2) ** 2
    return 12742 * math.asin(min(1, math.sqrt(h)))


def lire_feuille(wb, nom):
    if nom not in wb.sheetnames:
        raise SystemExit(f"Feuille introuvable : « {nom} ». Utilisez le classeur fourni.")
    ws = wb[nom]
    entetes = [re.sub(r"\s*\*$", "", texte(c.value)) for c in ws[1]]
    lignes = []
    for i, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        if all(texte(v) == "" for v in row):
            continue
        lignes.append((i, {entetes[j]: row[j] for j in range(len(entetes)) if entetes[j]}))
    return lignes


def eligible(ligne):
    """Retourne None si la ligne peut être importée, sinon la raison de l'exclusion."""
    if texte(ligne.get("Autorisation de publier")) != "Oui":
        return "autorisation de publier ≠ Oui"
    if texte(ligne.get("Vérifié")) != "Oui":
        return "non vérifié"
    return None


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    fichier = Path(sys.argv[1])
    sortie = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(__file__).resolve().parent / "sortie"
    sortie.mkdir(parents=True, exist_ok=True)
    wb = load_workbook(fichier, data_only=True)

    rapport, erreurs, avertissements = [], 0, 0
    compte = {}

    def consigner(feuille, ligne_no, message, niveau="ERREUR"):
        nonlocal erreurs, avertissements
        if niveau == "ERREUR":
            erreurs += 1
        else:
            avertissements += 1
        rapport.append(f"- **{niveau}** — {feuille}, ligne {ligne_no} : {message}")

    def ignorer(feuille, ligne_no, nom, raison):
        rapport.append(f"- Ignorée — {feuille}, ligne {ligne_no} (« {nom} ») : {raison}")

    # ---------------------------------------------------------------- Numéros utiles
    groupes = {g: [] for g in GROUPES}
    vus = set()
    for no, l in lire_feuille(wb, "Numéros utiles"):
        nom = texte(l.get("Nom du service"))
        raison = eligible(l)
        if raison:
            ignorer("Numéros utiles", no, nom, raison)
            continue
        try:
            groupe = choix(l, "Groupe", GROUPES)
            item = {
                "nom": champ(l, "Nom du service", 2, 120, True),
                "telephone": tel_affichage(l, "Téléphone", True),
                "description": champ(l, "Description", 0, 300),
                "source": champ(l, "Source", 3, 300, True),
                "verifie_le": date_iso(l, "Date de vérification (AAAA-MM-JJ)"),
            }
        except Erreur as e:
            consigner("Numéros utiles", no, str(e))
            continue
        cle = (item["nom"].lower(), re.sub(r"\D", "", item["telephone"]))
        if cle in vus:
            consigner("Numéros utiles", no, "doublon (même nom et même numéro)", "AVERTISSEMENT")
            continue
        vus.add(cle)
        groupes[groupe].append(item)
    numeros = {"version": 1, "groupes": [{"titre": g, "numeros": v} for g, v in groupes.items() if v]}
    # Mêmes numéros, en brouillons pour Koki Connect Admin (contrat assets/portail/numeros-contract.js).
    contenus_numeros = []
    for g, v in groupes.items():
        for item in v:
            structure = {"schema": "koki.numero.utile", "version": 1, "groupe": g, "telephone": item["telephone"],
                         "description": item["description"], "verifie_le": item["verifie_le"], "archive": False}
            contenus_numeros.append({"type": "Informations utiles", "categorie": "Numéros utiles", "titre": item["nom"],
                                     "resume": item["description"] or g, "source": item["source"], "lieu": "",
                                     "texte": json.dumps(structure, ensure_ascii=False, separators=(",", ":")),
                                     "statut": "brouillon"})
    compte["Numéros utiles"] = sum(len(v) for v in groupes.values())

    # ---------------------------------------------------------------- Contenus pour l'administration
    contenus = list(contenus_numeros)
    for no, l in lire_feuille(wb, "Écoles"):
        nom = texte(l.get("Nom de l'établissement"))
        raison = eligible(l)
        if raison:
            ignorer("Écoles", no, nom, raison)
            continue
        try:
            titre = champ(l, "Nom de l'établissement", 3, 180, True)
            niveau = choix(l, "Niveau", NIVEAUX)
            secteur = choix(l, "Secteur", SECTEURS)
            adresse = champ(l, "Adresse / village", 2, 300, True)
            tel = tel_affichage(l, "Téléphone public")
            if tel and not re.fullmatch(r"\+?[0-9 ()-]{6,24}", tel):
                raise Erreur("« Téléphone public » : 6 à 24 chiffres attendus")
            horaires = champ(l, "Horaires", 0, 500)
            description = champ(l, "Description", 0, 10000)
            source = champ(l, "Source", 3, 300, True)
            date_iso(l, "Date de vérification (AAAA-MM-JJ)")
        except Erreur as e:
            consigner("Écoles", no, str(e))
            continue
        # Même contrat que assets/portail/education-contract.js (ordre des clés compris).
        structure = {"schema": "koki.education.school", "version": 1, "niveau": niveau, "secteur": secteur,
                     "telephone": tel, "horaires": horaires, "description": description, "archive": False}
        contenus.append({"type": "Informations utiles", "categorie": "Éducation", "titre": titre,
                         "resume": f"{niveau} · {secteur} — {adresse}",
                         "texte": json.dumps(structure, ensure_ascii=False, separators=(",", ":")),
                         "lieu": adresse, "source": source, "statut": "brouillon"})
    compte["Écoles"] = len(contenus) - len(contenus_numeros)

    n_lieux = 0
    for no, l in lire_feuille(wb, "Lieux et services"):
        nom = texte(l.get("Nom"))
        raison = eligible(l)
        if raison:
            ignorer("Lieux et services", no, nom, raison)
            continue
        try:
            categorie = choix(l, "Catégorie", CATEGORIES_LIEUX)
            typ = champ(l, "Type", 2, 60, True)
            titre = champ(l, "Nom", 3, 180, True)
            adresse = champ(l, "Adresse / village", 2, 300, True)
            tel = tel_affichage(l, "Téléphone public")
            horaires = champ(l, "Horaires", 0, 500)
            garde = texte(l.get("Garde 24 h"))
            lat = decimal(l, "Latitude", 90, False)
            lon = decimal(l, "Longitude", 180, False)
            if (lat is None) != (lon is None):
                raise Erreur("renseignez latitude ET longitude, ou aucune des deux")
            description = champ(l, "Description", 0, 2000)
            source = champ(l, "Source", 3, 300, True)
            date_iso(l, "Date de vérification (AAAA-MM-JJ)")
        except Erreur as e:
            consigner("Lieux et services", no, str(e))
            continue
        if lat is not None and distance_km(CENTRE, (lat, lon)) > 30:
            consigner("Lieux et services", no, f"« {titre} » est à {distance_km(CENTRE, (lat, lon)):.0f} km du centre de Koki : vérifiez le signe (-) de la longitude", "AVERTISSEMENT")
        lignes_texte = [description] if description else []
        if tel:
            lignes_texte.append(f"Téléphone : {tel}")
        if horaires:
            lignes_texte.append(f"Horaires : {horaires}")
        if garde == "Oui":
            lignes_texte.append("Garde 24 h sur 24")
        if lat is not None:
            lignes_texte.append(f"Position : {lat:.6f}, {lon:.6f}")
        contenus.append({"type": "Informations utiles", "categorie": categorie, "titre": titre,
                         "resume": f"{typ} — {adresse}", "texte": "\n".join(lignes_texte),
                         "lieu": adresse, "source": source, "statut": "brouillon"})
        n_lieux += 1
    compte["Lieux et services"] = n_lieux

    # ---------------------------------------------------------------- Professionnels (annuaire)
    inserts, vus_pro = [], set()
    for no, l in lire_feuille(wb, "Commerces et artisans"):
        nom = texte(l.get("Nom commercial"))
        raison = eligible(l)
        if raison:
            ignorer("Commerces et artisans", no, nom, raison)
            continue
        try:
            payload = {
                "nom": champ(l, "Nom commercial", 2, 180, True),
                "type": choix(l, "Profil", PROFILS),
                "categorie": champ(l, "Catégorie / métier", 2, 100, True),
                "telephone": tel_international(l, "Téléphone WhatsApp professionnel"),
                "adresse": champ(l, "Adresse / localisation", 3, 500, True),
                "horaires": champ(l, "Horaires", 0, 500),
                "description": champ(l, "Description (10 caractères minimum)", 10, 2000, True),
                "photos": [],
            }
            lat = decimal(l, "Latitude", 90, True)
            lon = decimal(l, "Longitude", 180, True)
            payload["localisation"] = {"latitude": lat, "longitude": lon}
            autorisation = date_iso(l, "Date de l'autorisation (AAAA-MM-JJ)")
        except Erreur as e:
            consigner("Commerces et artisans", no, str(e))
            continue
        cle = (payload["nom"].lower(), payload["telephone"])
        if cle in vus_pro:
            consigner("Commerces et artisans", no, "doublon (même nom et même téléphone)", "AVERTISSEMENT")
            continue
        vus_pro.add(cle)
        if distance_km(CENTRE, (lat, lon)) > 30:
            consigner("Commerces et artisans", no, f"« {payload['nom']} » est à {distance_km(CENTRE, (lat, lon)):.0f} km du centre de Koki : vérifiez le signe (-) de la longitude", "AVERTISSEMENT")
        inserts.append({**payload, "latitude": lat, "longitude": lon,
                        "responsable": champ(l, "Responsable (NON publié)", 0, 120), "autorisation_le": autorisation})
    compte["Commerces et artisans"] = len(inserts)

    # ---------------------------------------------------------------- Écriture
    (sortie / "numeros-utiles.json").write_text(json.dumps(numeros, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (sortie / "contenus-admin.json").write_text(json.dumps({"version": 1, "contenus": contenus}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    import csv
    colonnes = ["nom", "type", "categorie", "telephone", "adresse", "latitude", "longitude", "horaires", "description",
                "responsable", "autorisation_le"]
    with open(sortie / "commercants-a-inviter.csv", "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=colonnes, extrasaction="ignore", delimiter=";")
        w.writeheader()
        for ligne in inserts:
            w.writerow(ligne)
    en_tete = [
        "# Rapport de conversion de la collecte KOKI CONNECT",
        "",
        f"Classeur : `{fichier.name}` — {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        "",
        "## Lignes converties",
        "",
    ] + [f"- {k} : **{v}**" for k, v in compte.items()] + [
        "",
        f"Erreurs : **{erreurs}** · Avertissements : **{avertissements}**",
        "",
        "## Détail",
        "",
    ]
    corps = rapport or ["Aucune anomalie."]
    suite = [
        "",
        "## Fichiers produits",
        "",
        "- `numeros-utiles.json` : à copier dans `assets/portail/numeros-utiles.json`.",
        "- `contenus-admin.json` : brouillons « Informations utiles » (numéros utiles, écoles, santé, services publics) à importer via Koki Connect Admin (relire avant publication).",
        "- `commercants-a-inviter.csv` : commerçants et artisans d'accord pour figurer dans l'annuaire. Chaque fiche doit être créée par le professionnel lui-même (connexion par SMS, « Ma fiche commerçant ») puis validée dans l'admin : le serveur exige un propriétaire pour chaque fiche.",
    ]
    (sortie / "rapport.md").write_text("\n".join(en_tete + corps + suite) + "\n", encoding="utf-8")
    print("\n".join(en_tete[4:] + corps))
    print(f"\nFichiers écrits dans {sortie}")
    return 1 if erreurs else 0


if __name__ == "__main__":
    sys.exit(main())
