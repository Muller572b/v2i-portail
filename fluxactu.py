import requests
from bs4 import BeautifulSoup
import json
import os

def fetch_actus():
    url = "https://www.acuite.fr/"
    headers = {'User-Agent': 'Mozilla/5.0'} # Indispensable pour ne pas être bloqué
    
    try:
        response = requests.get(url, headers=headers)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        actus = []
        # On cible les éléments qui contiennent les titres et liens sur Acuité
        # (À ajuster si la structure de la page change)
        for article in soup.select('.view-content .views-row')[:5]: 
            title_tag = article.find('h2') or article.find('h3')
            link_tag = article.find('a')
            
            if title_tag and link_tag:
                actus.append({
                    "titre": title_tag.get_text(strip=True),
                    "lien": "https://www.acuite.fr" + link_tag['href']
                })
                
        # Sauvegarde
        os.makedirs('data', exist_ok=True)
        with open("data/flux_optique.json", "w", encoding='utf-8') as f:
            json.dump(actus, f, ensure_ascii=False, indent=4)
            
    except Exception as e:
        print(f"Erreur lors du scraping : {e}")

if __name__ == "__main__":
    fetch_actus()
