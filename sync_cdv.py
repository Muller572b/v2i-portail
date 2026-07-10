import os
import subprocess
import sys

def sync_files():
    source_dir = "cartedevue"
    # Utilise le token passé en variable d'environnement par GitHub Actions
    token = os.environ.get("TOKEN")
    repo_url = f"https://x-access-token:{token}@github.com/Muller572b/portail-cartedevue.git"
    target_dir = "temp_sync"

    print("Début de la synchronisation...")

    try:
        # 1. Cloner le dépôt cible
        subprocess.run(["git", "clone", repo_url, target_dir], check=True)
        
        # 2. Copier les fichiers de la source vers le dossier cloné
        # On utilise rsync ou cp. Ici cp -r pour faire simple.
        subprocess.run(f"cp -r {source_dir}/* {target_dir}/", shell=True, check=True)
        
        # 3. Configurer l'identité du bot dans le dossier cloné
        os.chdir(target_dir)
        subprocess.run(["git", "config", "user.email", "bot@v2i.fr"], check=True)
        subprocess.run(["git", "config", "user.name", "Bot Transfert"], check=True)
        
        # 4. Ajouter les fichiers et vérifier s'il y a des changements
        subprocess.run(["git", "add", "."], check=True)
        
        # Vérifie si le répertoire de travail a des changements
        result = subprocess.run(["git", "diff", "--cached", "--quiet"], capture_output=True)
        
        if result.returncode != 0:
            # S'il y a des changements, on commit et on push
            subprocess.run(["git", "commit", "-m", "Sync auto des PDF [skip ci]"], check=True)
            subprocess.run(["git", "push", "origin", "main"], check=True)
            print("Synchronisation réussie : nouveaux fichiers transférés.")
        else:
            print("Aucun nouveau fichier à transférer.")
            
    except subprocess.CalledProcessError as e:
        print(f"Erreur lors de la commande git/système : {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Une erreur inattendue est survenue : {e}")
        sys.exit(1)
    finally:
        # Nettoyage
        os.chdir("..")

if __name__ == "__main__":
    sync_files()
