import os
import json

FICHIER_SORTIE = "documents.json"
bibliotheque = []
id_compteur = 1

# --- CONFIGURATION DU STOCKAGE EXTERNE ---
# Remplace cette URL par celle de ton vrai serveur où seront déposés les fichiers
URL_SERVEUR = ""

extensions_autorisees = ('pdf', 'jpg', 'jpeg', 'png', 'gif', 'zip', 'rar', 'doc', 'docx', 'xls', 'xlsx')

# --- 1. SCAN DU DOSSIER COMMUN ---
DOSSIER_COMMUN = "documentcommun"
if os.path.exists(DOSSIER_COMMUN):
    for racine, dossiers, fichiers in os.walk(DOSSIER_COMMUN):
        for nom_fichier in fichiers:
            if nom_fichier.startswith('.'):
                continue
            chemin_complet = os.path.join(racine, nom_fichier).replace("\\", "/")
            extension = nom_fichier.split('.')[-1].lower()
            if extension in extensions_autorisees:
                titre_propre = os.path.splitext(nom_fichier)[0].replace('_', ' ')
                type_document = "pdf" if extension == "pdf" else "archive" if extension in ('zip', 'rar') else "image"
                rel_path = os.path.relpath(racine, DOSSIER_COMMUN)
                categorie = "Général" if rel_path == "." else rel_path.replace("\\", "/")
                
                # ICI : On crée une URL absolue vers le serveur externe
                url_web = f"{URL_SERVEUR}/{chemin_complet}"

                bibliotheque.append({
                    "id": id_compteur,
                    "titre": titre_propre,
                    "categorie": categorie,
                    "url": url_web,  # <-- Utilisation de l'URL absolue
                    "type": type_document,
                    "date": "Disponible",
                    "code_magasin": "public"
                })
                id_compteur += 1

# --- 2. SCAN DU DOSSIER DOCUMENTS_MAGASIN ---
DOSSIER_MAGASINS = "documents_magasin"
if os.path.exists(DOSSIER_MAGASINS):
    for code_magasin in os.listdir(DOSSIER_MAGASINS):
        chemin_magasin = os.path.join(DOSSIER_MAGASINS, code_magasin)
        if os.path.isdir(chemin_magasin):
            
            # --- NORMALISATION ---
            # Transforme "07" en "7" pour correspondre au v2i_client_id du navigateur
            try:
                code_magasin_normalise = str(int(code_magasin))
            except ValueError:
                # Si le dossier n'est pas un nombre, on garde le nom original
                code_magasin_normalise = code_magasin

            for racine, dossiers, fichiers in os.walk(chemin_magasin):
                for nom_fichier in fichiers:
                    if nom_fichier.startswith('.'):
                        continue
                    chemin_complet = os.path.join(racine, nom_fichier).replace("\\", "/")
                    extension = nom_fichier.split('.')[-1].lower()
                    if extension in extensions_autorisees:
                        titre_propre = os.path.splitext(nom_fichier)[0].replace('_', ' ')
                        type_document = "pdf" if extension == "pdf" else "archive" if extension in ('zip', 'rar') else "image"
                        rel_path = os.path.relpath(racine, chemin_magasin)
                        
                        # Utilise la valeur normalisée pour la catégorie
                        categorie = f"Privé ({code_magasin_normalise})" if rel_path == "." else rel_path.replace("\\", "/")
                        
                        url_web = f"{URL_SERVEUR}/{chemin_complet}"

                        bibliotheque.append({
                            "id": id_compteur,
                            "titre": titre_propre,
                            "categorie": categorie,
                            "url": url_web,
                            "type": type_document,
                            "date": "Disponible",
                            "code_magasin": code_magasin_normalise # Utilise la valeur normalisée
                        })
                        id_compteur += 1

with open(FICHIER_SORTIE, "w", encoding="utf-8") as f:
    json.dump(bibliotheque, f, ensure_ascii=False, indent=4)
