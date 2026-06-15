import os  # Importation du module système pour la gestion des fichiers et dossiers
import json  # Importation du module json pour l'écriture du fichier d'index final

FICHIER_SORTIE = "documents.json"  # Définition du nom du fichier de sortie généré pour le portail
bibliotheque = []  # Initialisation de la liste globale qui contiendra tous les documents
id_compteur = 1  # Initialisation du compteur pour attribuer un identifiant unique à chaque ligne

# Définition de toutes les extensions de fichiers autorisées (images, pdf, documents, archives)
extensions_autorisees = ('pdf', 'jpg', 'jpeg', 'png', 'gif', 'zip', 'rar', 'doc', 'docx', 'xls', 'xlsx')

# --- 1. SCAN DU DOSSIER COMMUN (ACCESSIBLE À TOUS LES MAGASINS) ---
DOSSIER_COMMUN = "documentcommun"  # Définition du dossier contenant les documents publics généraux
if os.path.exists(DOSSIER_COMMUN):  # Vérification de l'existence réelle du dossier commun sur le disque
    for racine, dossiers, fichiers in os.walk(DOSSIER_COMMUN):  # Parcours récursif complet du dossier commun
        for nom_fichier in fichiers:  # Boucle de traitement pour chaque fichier individuel trouvé
            if nom_fichier.startswith('.'):  # Vérification pour ignorer les fichiers cachés ou système
                continue  # Passage immédiat au fichier suivant si le fichier est masqué
            chemin_complet = os.path.join(racine, nom_fichier)  # Reconstruction du chemin d'accès complet du fichier
            extension = nom_fichier.split('.')[-1].lower()  # Extraction de l'extension du fichier convertie en minuscules
            if extension in extensions_autorisees:  # Vérification que l'extension fait partie de la liste autorisée
                titre_propre = os.path.splitext(nom_fichier)[0].replace('_', ' ')  # Remplacement des underscores par des espaces
                type_document = "pdf" if extension == "pdf" else "archive" if extension in ('zip', 'rar') else "image"  # Détermination du type pour le badge graphique
                rel_path = os.path.relpath(racine, DOSSIER_COMMUN)  # Calcul du chemin relatif pour identifier la sous-catégorie
                categorie = "Général" if rel_path == "." else rel_path.replace("\\", "/")  # Définition de la catégorie selon le sous-dossier
                bibliotheque.append({  # Ajout du dictionnaire de métadonnées dans la liste principale
                    "id": id_compteur,  # Affectation de l'identifiant unique incrémental
                    "titre": titre_propre,  # Stockage du titre propre formaté pour l'affichage
                    "categorie": categorie,  # Stockage de la catégorie dynamique (ex: Polarisant)
                    "url": chemin_complet.replace("\\", "/"),  # Normalisation du chemin web avec des slashes
                    "type": type_document,  # Stockage du type de fichier structuré
                    "date": "Disponible",  # Valeur de disponibilité par défaut pour le tableau
                    "code_magasin": "public"  # Attribution du tag public pour que tout le monde y ait accès
                })  # Fermeture du dictionnaire associé au document public
                id_compteur += 1  # Incrémentation de l'identifiant unique pour le prochain élément

# --- 2. SCAN DU DOSSIER DOSUMENTS_MAGASIN (ACCÈS RESTREINT PAR CODE V2I) ---
DOSSIER_MAGASINS = "documents_magasin"  # Définition du dossier contenant les espaces privés des magasins
if os.path.exists(DOSSIER_MAGASINS):  # Vérification de l'existence du dossier des magasins sur le disque
    for code_magasin in os.listdir(DOSSIER_MAGASINS):  # Parcours des dossiers correspondants aux codes magasins (ex: 01, 16)
        chemin_magasin = os.path.join(DOSSIER_MAGASINS, code_magasin)  # Construction du chemin vers le dossier spécifique d'un magasin
        if os.path.isdir(chemin_magasin):  # Sécurisation pour s'assurer qu'il s'agit bien d'un répertoire et non d'un fichier
            for racine, dossiers, fichiers in os.walk(chemin_magasin):  # Parcours récursif complet de l'espace de ce magasin spécifique
                for nom_fichier in fichiers:  # Boucle de traitement pour chaque fichier trouvé dans l'espace magasin
                    if nom_fichier.startswith('.'):  # Vérification pour ignorer les fichiers cachés système
                        continue  # Passage au fichier suivant de la liste si le fichier est caché
                    chemin_complet = os.path.join(racine, nom_fichier)  # Reconstruction du chemin complet du fichier spécifique
                    extension = nom_fichier.split('.')[-1].lower()  # Extraction et passage en minuscules de l'extension trouvée
                    if extension in extensions_autorisees:  # Validation de l'extension par rapport à notre liste autorisée
                        titre_propre = os.path.splitext(nom_fichier)[0].replace('_', ' ')  # Nettoyage du nom de fichier pour un affichage propre
                        type_document = "pdf" if extension == "pdf" else "archive" if extension in ('zip', 'rar') else "image"  # Catégorisation du type pour l'interface visuelle
                        rel_path = os.path.relpath(racine, chemin_magasin)  # Calcul du sous-dossier interne au magasin pour affiner la catégorie
                        categorie = f"Privé ({code_magasin})" if rel_path == "." else rel_path.replace("\\", "/")  # Libellé de catégorie dynamique adapté
                        bibliotheque.append({  # Insertion des données sécurisées du document de magasin
                            "id": id_compteur,  # Attribution du numéro d'identifiant unique courant
                            "titre": titre_propre,  # Insertion du titre nettoyé pour l'interface utilisateur
                            "categorie": categorie,  # Renseignement de la catégorie correspondante
                            "url": chemin_complet.replace("\\", "/"),  # Formatage du chemin web compatible multi-plateforme
                            "type": type_document,  # Renseignement du type de format pour les filtres
                            "date": "Disponible",  # Mention de disponibilité standardisée
                            "code_magasin": code_magasin  # Restriction stricte de l'élément lié au code v2i du magasin spécifique
                        })  # Fin de l'objet dictionnaire pour ce fichier protégé
                        id_compteur += 1  # Augmentation du compteur global d'indexation

# --- 3. ENREGISTREMENT ET ÉCRITURE DE L'INDEX ---
with open(FICHIER_SORTIE, "w", encoding="utf-8") as f:  # Ouverture sécurisée du fichier documents.json en mode écriture UTF-8
    json.dump(bibliotheque, f, ensure_ascii=False, indent=4)  # Exportation de toute la structure de la bibliothèque au format JSON propre
