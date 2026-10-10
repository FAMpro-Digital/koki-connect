#!/usr/bin/env python3
"""Test du convertisseur sur un classeur factice (données TEST uniquement, jamais publiées)."""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

from openpyxl import load_workbook

racine = Path(__file__).resolve().parents[2]
modele = racine / "collecte" / "Koki_Collecte_Donnees.xlsx"


def lancer(classeur, sortie):
    return subprocess.run([sys.executable, "-I", str(racine / "collecte" / "convertir_collecte.py"), str(classeur), str(sortie)],
                          capture_output=True, text=True)


with tempfile.TemporaryDirectory() as tmp:
    tmp = Path(tmp)

    # 1. Classeur vierge : 4 numéros d'urgence, aucune autre donnée.
    p = lancer(modele, tmp / "vide")
    assert p.returncode == 0, p.stdout + p.stderr
    n = json.loads((tmp / "vide" / "numeros-utiles.json").read_text(encoding="utf-8"))
    assert [x["telephone"] for x in n["groupes"][0]["numeros"]] == ["17", "18", "1515", "800 00 20 20"], n
    vides = json.loads((tmp / "vide" / "contenus-admin.json").read_text(encoding="utf-8"))["contenus"]
    assert [c["categorie"] for c in vides] == ["Numéros utiles"] * 4, vides
    js = ("require(%r);const r=KokiNumeroContract.decode(JSON.parse(process.argv[1]));console.log(JSON.stringify(r));"
          % str(racine / "assets" / "portail" / "numeros-contract.js"))
    for c in vides:
        out = subprocess.run(["node", "-e", js, json.dumps(c)], capture_output=True, text=True)
        assert out.returncode == 0 and json.loads(out.stdout)["groupe"] == "Urgences nationales", out.stderr + out.stdout
    assert "Ignorée — Écoles, ligne 2" in (tmp / "vide" / "rapport.md").read_text(encoding="utf-8")

    # 2. Classeur rempli de données TEST.
    wb = load_workbook(modele)
    ws = wb["Écoles"]
    ws.append(["TEST École élémentaire", "Élémentaire", "Public", "TEST Village", "+221 33 000 00 00", "8h–17h", "TEST", "TEST source", "2026-10-01", "Oui", "Oui"])
    ws.append(["TEST École refusée", "Élémentaire", "Public", "TEST", "", "", "", "TEST", "2026-10-01", "Non", "Oui"])
    ws.append(["TEST École niveau faux", "Maternelle", "Public", "TEST", "", "", "", "TEST", "2026-10-01", "Oui", "Oui"])
    ws = wb["Lieux et services"]
    ws.append(["Santé", "Pharmacie", "TEST Pharmacie", "TEST Centre", "+221 77 000 00 01", "8h–20h", "Non", 15.5, -15.99, "", "TEST", "2026-10-01", "Oui", "Oui"])
    ws.append(["Santé", "Poste de santé", "TEST Poste loin", "TEST", "", "", "Oui", 15.5, 15.99, "", "TEST", "2026-10-01", "Oui", "Oui"])
    ws = wb["Commerces et artisans"]
    ws.append(["TEST Atelier d'Ousmane", "Prestataire de services", "Plomberie", "77 000 00 02", "TEST quartier", 15.5, -15.99, "Lun–Sam", "Plomberie et dépannage à domicile", "Ousmane (non publié)", "2026-10-01", "Oui", "Oui"])
    ws.append(["TEST Atelier d'Ousmane", "Prestataire de services", "Plomberie", "+221770000002", "TEST quartier", 15.5, -15.99, "", "Doublon exact de la ligne précédente", "", "2026-10-01", "Oui", "Oui"])
    ws.append(["TEST Boutique $koki$ piège", "Commerçant", "Alimentation", "+221770000003", "TEST", 15.5, -15.99, "", "Description assez longue", "", "2026-10-01", "Oui", "Oui"])
    ws.append(["TEST Quincaillerie", "Commerçant", "Maison", "0612345", "TEST", 15.5, -15.99, "", "Description assez longue", "", "2026-10-01", "Oui", "Oui"])
    ws.append(["TEST Couture d'Aïssatou", "Commerçant", "Vêtements", "+221 78 000 00 04", "TEST d'ici", "15,5", "-15,99", "", "Couture, retouches et uniformes", "", "2026-10-01", "Oui", "Oui"])
    ws.append(["TEST Non vérifié", "Commerçant", "Maison", "+221770000005", "TEST", 15.5, -15.99, "", "Description assez longue", "", "2026-10-01", "Oui", "Non"])
    plein = tmp / "plein.xlsx"
    wb.save(plein)
    p = lancer(plein, tmp / "plein")
    assert p.returncode == 1, "des erreurs doivent produire un code de sortie 1"
    rapport = (tmp / "plein" / "rapport.md").read_text(encoding="utf-8")
    for attendu in ["« Niveau » doit être l'une des valeurs", "format international attendu", "doublon",
                    "Ignorée — Écoles, ligne 4", "non vérifié", "15.99" if False else "km du centre de Koki"]:
        assert attendu in rapport, (attendu, rapport)

    contenus = json.loads((tmp / "plein" / "contenus-admin.json").read_text(encoding="utf-8"))["contenus"]
    ecole = next(c for c in contenus if c["titre"] == "TEST École élémentaire")
    assert ecole["categorie"] == "Éducation" and ecole["statut"] == "brouillon" and ecole["lieu"] == "TEST Village"
    # Le champ texte doit être accepté par le contrat JavaScript réel de l'application.
    js = ("globalThis.window=globalThis;require(%r);"
          "const r=KokiEducationContract.decode({type:'Informations utiles',categorie:'Éducation',texte:process.argv[1]});"
          "console.log(JSON.stringify(r));") % str(racine / "assets" / "portail" / "education-contract.js")
    out = subprocess.run(["node", "-e", js, ecole["texte"]], capture_output=True, text=True)
    assert out.returncode == 0 and json.loads(out.stdout)["niveau"] == "Élémentaire", out.stderr + out.stdout

    import csv
    with open(tmp / "plein" / "commercants-a-inviter.csv", encoding="utf-8-sig") as fh:
        inv = list(csv.DictReader(fh, delimiter=";"))
    assert [x["nom"] for x in inv] == ["TEST Atelier d'Ousmane", "TEST Boutique $koki$ piège", "TEST Couture d'Aïssatou"], inv
    assert inv[0]["telephone"] == "+221770000002" and inv[2]["telephone"] == "+221780000004"  # numéros normalisés
    assert inv[2]["latitude"] == "15.5" and inv[2]["longitude"] == "-15.99"  # virgules décimales converties
    n = json.loads((tmp / "plein" / "numeros-utiles.json").read_text(encoding="utf-8"))
    assert sum(len(g["numeros"]) for g in n["groupes"]) == 4
print("OK : convertisseur de collecte")
