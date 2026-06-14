import requests
from bs4 import BeautifulSoup
import json
import os

def fetch_actus():
    url = "https://www.acuite.fr/"
    # User-Agent complet et moderne pour maximiser l'acceptation par le serveur
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    actus = []
    
    try:
        # Ajout d'un timeout de 10 secondes pour éviter que le build GitHub Actions ne bloque indéfiniment
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Ciblage des lignes d'actualités
        articles = soup.select('.view-content .views-row')
        
        for article in articles[:5]: 
            title_tag = article.find('h2') or article.find('h3') or article.find('a')
            link_tag = article.find('a')
            
            if title_tag and link_tag:
                href = link_tag['href']
                # Sécurité : on reconstruit l'URL uniquement si elle est relative
                lien_complet = href if href.startswith('http') else "https://www.acuite.fr" + href
                
                actus.append({
                    "titre": title_tag.get_text(strip=True),
                    "lien": lien_complet
                })
                
        print(f"✓ Extraction réussie : {len(actus)} actualités récupérées.")
            
    except Exception as e:
        print(f"⚠ Erreur lors du scraping : {e}")
        print("Génération d'un flux vide de sécurité pour éviter le crash de l'interface.")
        actus = [] # En cas de panne, on déploie un tableau vide propre

    # --- SAUVEGARDE ET SYNCHRONISATION DES DOSSIERS ---
    # Liste des destinations cibles (Racine de production)
    destinations = ['data']
    
    # Si le dossier de l'espace beta est présent (environnement GitHub Actions), on le met aussi à jour
    if os.path.exists('beta'):
        destinations.append('beta/data')
        
    for dest in destinations:
        os.makedirs(dest, exist_ok=True)
        fichier_cible = os.path.join(dest, "flux_optique.json")
        with open(fichier_cible, "w", encoding='utf-8') as f:
            json.dump(actus, f, ensure_ascii=False, indent=4)
        print(f"  -> Fichier synchronisé dans : {fichier_cible}")

if __name__ == "__main__":
    fetch_actus()
