"""
Récupération des flux RSS de veille.

Ce script est lancé automatiquement par GitHub Actions toutes les 6 heures
(voir .github/workflows/veille-rss.yml). Il lit chaque flux RSS ou Atom,
garde les derniers articles et écrit le résultat dans data/veille.json.
Le site lit ensuite ce fichier : plus besoin de service externe dans le
navigateur, et les articles s'affichent même si une source est lente.

Pour ajouter une source : ajouter une ligne dans SOURCES.
Aucune bibliothèque à installer, uniquement la bibliothèque standard Python.
"""

import html
import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

# Thèmes utilisés pour le tri sur le site
SOURCES = [
    {"id": "nvidia",   "nom": "NVIDIA Blog",           "theme": "ia",     "site": "https://blogs.nvidia.com",           "url": "https://blogs.nvidia.com/feed/"},
    {"id": "certfr",   "nom": "CERT-FR (ANSSI)",       "theme": "cyber",  "site": "https://www.cert.ssi.gouv.fr",       "url": "https://www.cert.ssi.gouv.fr/feed/"},
    {"id": "zataz",    "nom": "ZATAZ",                 "theme": "cyber",  "site": "https://www.zataz.com",              "url": "https://www.zataz.com/feed/"},
    {"id": "itconnect","nom": "IT-Connect",            "theme": "infra",  "site": "https://www.it-connect.fr",          "url": "https://www.it-connect.fr/feed/"},
    {"id": "lmi",      "nom": "Le Monde Informatique", "theme": "actu",   "site": "https://www.lemondeinformatique.fr", "url": "https://www.lemondeinformatique.fr/flux-rss/thematique/toutes-les-actualites/rss.xml"},
    {"id": "next",     "nom": "Next",                  "theme": "actu",   "site": "https://next.ink",                   "url": "https://next.ink/feed/"},
    {"id": "korben",   "nom": "Korben",                "theme": "actu",   "site": "https://korben.info",                "url": "https://korben.info/feed"},
]

# Mots-clés de mon sujet de veille : les articles qui en parlent sont mis en avant
MOTS_CLES_SUJET = re.compile(r"\b(nvidia|gpu|gpus|cuda|h100|h200|b200|blackwell|datacenters?|data centers?|supercalculateur|puces? (ia|d'ia))\b", re.I)

ARTICLES_PAR_SOURCE = 15
LONGUEUR_RESUME = 220
FICHIER_SORTIE = Path(__file__).resolve().parent.parent / "data" / "veille.json"

ATOM = "{http://www.w3.org/2005/Atom}"
RSS1 = "{http://purl.org/rss/1.0/}"
DC = "{http://purl.org/dc/elements/1.1/}"


def telecharger(url):
    requete = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (compatible; VeillePortfolio/1.0; +https://khamine-10.github.io/Personal-Portfolio/)",
        "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
    })
    with urllib.request.urlopen(requete, timeout=25) as reponse:
        return reponse.read()


# Phrase ajoutée automatiquement par WordPress à la fin des résumés
PIED_WORDPRESS = re.compile(r"\s*(The post|Le post|L[’']article|Cet article)\s.*?(appeared first|est apparu en premier|a été publié|first appeared).*$", re.I | re.S)


def nettoyer(texte, longueur_max=None):
    """Retire les balises HTML, la mention WordPress et les espaces en trop."""
    texte = re.sub(r"<[^>]+>", " ", texte or "")
    texte = html.unescape(texte)
    texte = re.sub(r"\s+", " ", texte).strip()
    texte = PIED_WORDPRESS.sub("", texte)
    if longueur_max and len(texte) > longueur_max:
        texte = texte[:longueur_max].rsplit(" ", 1)[0] + "…"
    return texte


def lire_date(texte):
    """Convertit une date RSS (RFC 822) ou Atom (ISO 8601) en ISO UTC."""
    if not texte:
        return None
    texte = texte.strip()
    try:
        date = parsedate_to_datetime(texte)
    except (TypeError, ValueError):
        try:
            date = datetime.fromisoformat(texte.replace("Z", "+00:00"))
        except ValueError:
            return None
    if date.tzinfo is None:
        date = date.replace(tzinfo=timezone.utc)
    return date.astimezone(timezone.utc).isoformat()


def texte_de(element, *noms):
    for nom in noms:
        trouve = element.find(nom)
        if trouve is not None and (trouve.text or "").strip():
            return trouve.text
    return ""


def analyser(contenu, source):
    racine = ET.fromstring(contenu)
    articles = []

    # RSS 2.0 : <rss><channel><item>
    items = racine.findall("./channel/item") or racine.findall(".//item")
    for item in items:
        articles.append({
            "titre": nettoyer(texte_de(item, "title")),
            "lien": texte_de(item, "link").strip(),
            "date": lire_date(texte_de(item, "pubDate", "{http://purl.org/dc/elements/1.1/}date")),
            "resume": nettoyer(texte_de(item, "description", "{http://purl.org/rss/1.0/modules/content/}encoded"), LONGUEUR_RESUME),
        })

    # RSS 1.0 (RDF) : éléments dans un espace de noms
    if not items:
        items = racine.findall(f"{RSS1}item")
        for item in items:
            articles.append({
                "titre": nettoyer(texte_de(item, f"{RSS1}title")),
                "lien": texte_de(item, f"{RSS1}link").strip(),
                "date": lire_date(texte_de(item, f"{DC}date")),
                "resume": nettoyer(texte_de(item, f"{RSS1}description"), LONGUEUR_RESUME),
            })

    # Atom : <feed><entry>
    if not items:
        for entree in racine.findall(f"{ATOM}entry"):
            lien = ""
            for l in entree.findall(f"{ATOM}link"):
                if l.get("rel", "alternate") == "alternate":
                    lien = l.get("href", "")
                    break
            articles.append({
                "titre": nettoyer(texte_de(entree, f"{ATOM}title")),
                "lien": lien,
                "date": lire_date(texte_de(entree, f"{ATOM}published", f"{ATOM}updated")),
                "resume": nettoyer(texte_de(entree, f"{ATOM}summary", f"{ATOM}content"), LONGUEUR_RESUME),
            })

    resultat = []
    for a in articles:
        if not a["titre"] or not a["lien"].startswith(("http://", "https://")):
            continue
        a.update({
            "source": source["id"],
            "sujet": bool(MOTS_CLES_SUJET.search(a["titre"] + " " + a["resume"])),
        })
        resultat.append(a)
    resultat.sort(key=lambda a: a["date"] or "", reverse=True)
    return resultat[:ARTICLES_PAR_SOURCE]


def main():
    # Articles de la dernière exécution : gardés si une source ne répond pas
    precedent = {}
    if FICHIER_SORTIE.exists():
        try:
            ancien = json.loads(FICHIER_SORTIE.read_text(encoding="utf-8"))
            for a in ancien.get("articles", []):
                precedent.setdefault(a["source"], []).append(a)
        except (ValueError, KeyError):
            pass

    tous, etat = [], []
    for source in SOURCES:
        try:
            articles = analyser(telecharger(source["url"]), source)
            if not articles:
                raise ValueError("aucun article trouvé")
            etat.append({"id": source["id"], "ok": True, "nombre": len(articles)})
            print(f"OK    {source['nom']}: {len(articles)} articles")
        except Exception as erreur:  # une source en panne ne bloque pas les autres
            articles = precedent.get(source["id"], [])
            etat.append({"id": source["id"], "ok": False, "nombre": len(articles)})
            print(f"ÉCHEC {source['nom']}: {erreur} (garde {len(articles)} articles précédents)", file=sys.stderr)
        tous.extend(articles)

    tous.sort(key=lambda a: a["date"] or "", reverse=True)
    donnees = {
        "miseAJour": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "sources": [{k: s[k] for k in ("id", "nom", "theme", "site")} for s in SOURCES],
        "etat": etat,
        "articles": tous,
    }
    FICHIER_SORTIE.parent.mkdir(parents=True, exist_ok=True)
    FICHIER_SORTIE.write_text(json.dumps(donnees, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(tous)} articles écrits dans {FICHIER_SORTIE}")

    if not tous:
        sys.exit("Aucun article récupéré")


if __name__ == "__main__":
    main()
