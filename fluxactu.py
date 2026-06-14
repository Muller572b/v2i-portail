import requests
from bs4 import BeautifulSoup
import json
import os

def fetch_actus():
    url = "https://www.acuite.fr/"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3'
    }
    
    actus = []
    
    try:
        print(f"→ Tentative de connexion à {url}...")
        response = requests.get(url, headers=headers, timeout=15)
        print(f"→ Code statut HTTP reçu : {response.status_code}")
        
        if response.status_code != 200:
            print(f"⚠ Le site a répondu avec un code d'erreur. Taille du contenu : {len(response.text)} octets.")
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Stratégie 1 : Sélecteur d'origine (Drupal Views)
        articles = soup.select('.view-content .views-row')
        
        # Stratégie 2 (Secours) : Recherche large de blocs d'articles ou de cartes d'actualités
        if not articles:
            print("→ Sélecteur principal vide. Tentative avec le sélecteur de secours...")
            articles = soup.select('article, .node-teaser, .card, .news-item')
            
        # Stratégie 3 (Ultime) : Extraction directe de tous les liens suspects contenant de l'actu
        if not articles:
            print("→ Sélecteurs spécifiques vides. Recherche globale de liens d'actualités...")
            articles = [a for a in soup.find_all('a', href=True) if '/actualite/' in a['href'] or '/neuf/' in a['href']][:8]

        print(f"→ Nombre d'éléments potentiels détectés : {len(articles)}")

        for article in articles:
            if len(actus) >= 5: # On s'arrête dès qu'on en a 5 valides
                break
                
            # Extraction des balises selon la structure de l'élément trouvé
            if article.name == 'a':
                title_tag = article
                link_tag = article
            else:
                title_tag = article.find(['h2', 'h3', 'h4', 'a'])
                link_tag = article.find('a')
            
            if title_tag and link_tag and link_tag.has_attr('href'):
                titre = title_tag.get_text(strip=True)
                href = link_tag['href']
                
                # On évite les titres vides ou trop courts (ex: boutons "Lire la suite")
                if len(titre) < 15 or href in [a['lien'] for a in actus]:
                    continue
                    
                lien_complet = href if href.startswith('http') else "https://www.acuite.fr" + href
                
                actus.append({
                    "titre": titre,
                    "lien": lien_complet
                })
                
        print(f"✓ Extraction terminée : {len(actus)} actualités prêtes à l'exportation.")
            
    except Exception as e:
        print(f"⚠ Erreur critique lors de l'extraction : {e}")
        actus = []

    # --- SAUVEGARDE ET DOUBLE DISTRIBUTION ---
    destinations = ['data']
    if os.path.exists('beta'):
        destinations.append('beta/data')
        
    for dest in destinations:
        os.makedirs(dest, exist_ok=True)
        fichier_cible = os.path.join(dest, "flux_optique.json")
        with open(fichier_cible, "w", encoding='utf-8') as f:
            json.dump(actus, f, ensure_ascii=False, indent=4)
        print(f"  -> Mis à jour : {fichier_cible}")

if __name__ == "__main__":
    fetch_actus()
