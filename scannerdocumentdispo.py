import os
import json

# Initialisation de la configuration pour scanner le dossier Polarisant
DOSSIERS_CIBLES = ["Polarisant"]
FICHIER_SORTIE = "documents.json"
bibliotheque = []
id_compteur = 1

# Parcours des répertoires pour lister l'ensemble des éléments présents
for categorie in DOSSIERS_CIBLES:
    if os.path.exists(categorie):
        for nom_fichier in os.listdir(categorie):
            if nom_fichier.startswith('.'):
                continue
                
            chemin_complet = os.path.join(categorie, nom_fichier)
            
            # Filtrage et extraction des métadonnées pour chaque document valide trouvé
            if os.path.isfile(chemin_complet):
                extension = nom_fichier.split('.')[-1].lower()
                
                if extension in ['pdf', 'jpg', 'jpeg', 'png']:
                    titre_propre = nom_fichier.rsplit('.', 1)[0].replace('_', ' ')
                    type_document = "pdf" if extension == "pdf" else "image"
                    
                    bibliotheque.append({
                        "id": id_compteur,
                        "titre": titre_propre,
                        "categorie": categorie,
                        "url": f"./{categorie}/{nom_fichier}",
                        "type": type_document,
                        "date": "Disponible"
                    })
                    id_compteur += 1

# Sauvegarde des données collectées au format JSON pour le portail web
with open(FICHIER_SORTIE, "w", encoding="utf-8") as f:
    json.dump(bibliotheque, f, ensure_ascii=False, indent=4)
