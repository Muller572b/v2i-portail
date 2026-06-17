// --- ACCUEIL.JS ---

// Rendu global pour éviter l'erreur "LISTE_MAGASINS is not defined" dans suivi.js
window.LISTE_MAGASINS = {
    "1": "DON", "2": "A36", "3": "LUP", "4": "BAB", "6": "LIS", "7": "A67",
    "9": "A40", "10": "BAA", "11": "BOR", "12": "AOS", "16": "BFO", "18": "ILE", "22": "O2C",
    "23": "COR", "24": "PAA", "25": "PLU", "28": "BOB", "29": "ROC", "31": "LAR",       
    "33": "CCA", "34": "COZ", "35": "OBP", "36": "CCB", "37": "CCF", "39": "OBR", "41": "CAO",
    "42": "FAA","43": "FCA", "44": "FAL", "46": "BAO", "47": "POB", "48": "BOF", "49": "O2B",
    "50": "ATS", "51": "OSM", "52": "OBB", "53": "ONA", "56": "OBS", "57": "OPM",
    "58": "OBV", "59": "ATB", "60": "KBO", "62": "OBO","99": "TEST99", "ADMIN": "COSIUM2026"
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. Vérification de la session (Le Gardien basé sur notre logique verrouillée)
    if (localStorage.getItem('v2i_authenticated') !== 'true') {
        window.location.href = './login.html'; // Sécurisé pour GitHub Pages
        return;
    }

    // 2. Récupération de l'identifiant du magasin connecté
    const clientId = localStorage.getItem('v2i_client_id');

    // On récupère le code Cosium associé depuis l'objet global
    const cosiumCode = window.LISTE_MAGASINS[clientId] || "Inconnu";

    // Affichage dynamique des infos du magasin sur l'écran d'accueil
    const storeNameEl = document.getElementById('store-name');
    if (storeNameEl && clientId) {
        storeNameEl.innerText = `Magasin : N° ${clientId} (${cosiumCode})`;
    }

    // 3. Récupération automatique du flux d'actualités (fluxactu.py)
    const actusContainer = document.getElementById('flux-actus');
    if (actusContainer) {
        fetch('data/flux_optique.json')
            .then(response => {
                if (!response.ok) throw new Error("Erreur de récupération du flux RSS");
                return response.json();
            })
            .then(data => {
                actusContainer.innerHTML = ''; // Nettoyage de l'indicateur de chargement
                
                if (!data || data.length === 0) {
                    actusContainer.innerHTML = '<p class="text-gray-500 text-sm">Aucune actualité disponible pour le moment.</p>';
                    return;
                }

                data.forEach(actu => {
                    actusContainer.innerHTML += `
                        <a href="${actu.lien}" target="_blank" class="block bg-white p-6 rounded-2xl border border-[#e8e8ed] shadow-sm hover:border-[#0066cc] hover:shadow-md transition-all group">
                            <h4 class="font-semibold text-[#1d1d1f] group-hover:text-[#0066cc] mb-3 transition-colors line-clamp-3">${actu.titre}</h4>
                            <span class="text-xs text-[#86868b] flex items-center gap-1 font-medium">
                                Lire l'article sur Acuité ↗
                            </span>
                        </a>
                    `;
                });
            })
            .catch(err => {
                console.error("Erreur lors du chargement des actualités :", err);
                actusContainer.innerHTML = '<p class="text-red-500 text-sm">Impossible de charger le flux d\'actualités.</p>';
            });
    }

    // 4. Récupération dynamique du nombre de commandes en cours
    const countElement = document.getElementById('commandes-en-cours-count');
    if (countElement && clientId) {
        // Ciblage du bon dossier de synchronisation et vérification du statut HTTP
        fetch(`data_magasins/encours_de${clientId}.json`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Fichier introuvable pour le magasin : ${clientId}`);
                }
                return response.json();
            })
            .then(data => {
                // Extraction du tableau situé dans la clé du modèle JSON fourni
                const listeCommandes = data.commandes_en_cours || [];

                // Filtre les commandes pour ne garder que celles en cours de traitement
                const commandesEnCours = listeCommandes.filter(cmd => {
                    return cmd.statut !== "Livrée" && cmd.statut !== "Expédiée" && !cmd.archive;
                });

                // Injection du résultat final dans le widget
                countElement.innerText = commandesEnCours.length;
            })
            .catch(err => {
                console.error("Erreur lors du chargement du compteur de commandes :", err);
                countElement.innerText = "0"; // Évite de laisser un indicateur vide ou cassé
            });
    }

    // 5. Initialisation des icônes Lucide
    if (window.lucide) {
        lucide.createIcons();
    }
});

// 6. Fonction de déconnexion (Nettoyage propre des bonnes clés)
window.logout = function() {
    localStorage.removeItem('v2i_authenticated');
    localStorage.removeItem('v2i_client_id');
    window.location.href = './login.html'; 
};
