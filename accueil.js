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
    // 1. Vérification de la session
    if (localStorage.getItem('v2i_authenticated') !== 'true') {
        window.location.href = './login.html'; 
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

    // 4. Traitement des indicateurs de commandes (En cours & Expédiées)
    const countCoursEl = document.getElementById('commandes-en-cours-count');
    const countExpEl = document.getElementById('commandes-expediees-count');
    const currentYear = new Date().getFullYear(); 

    // --- APPEL 1 : CHARGEMENT DES COMMANDES EN COURS ---
    if (clientId && countCoursEl) {
        fetch(`data_magasins/encours_${clientId}.json`)
            .then(response => {
                if (!response.ok) throw new Error(`Fichier introuvable pour le magasin : ${clientId}`);
                return response.text();
            })
            .then(text => {
                try {
                    return JSON.parse(text);
                } catch (e) {
                    throw new Error("Le serveur a renvoyé du HTML au lieu d'un JSON valide (Erreur 404)");
                }
            })
            .then(data => {
                const listeCommandes = data.commandes_en_cours || [];
                const commandesEnCours = listeCommandes.filter(cmd => {
                    return cmd.statut !== "Livrée" && cmd.statut !== "Expédiée" && !cmd.archive;
                });
                countCoursEl.innerText = commandesEnCours.length;
            })
            .catch(err => {
                console.error("Erreur compteur En Cours :", err.message);
                countCoursEl.innerText = "0";
            });
    }

    // --- APPEL 2 : CHARGEMENT DES ARCHIVES POUR LES COMMANDES EXPÉDIÉES ---
    if (clientId && countExpEl) {
        fetch(`data_archives/${currentYear}/archive_${clientId}.json`)
            .then(response => {
                if (!response.ok) throw new Error(`Pas d'archive disponible pour le magasin : ${clientId}`);
                return response.text();
            })
            .then(text => {
                try {
                    return JSON.parse(text);
                } catch (e) {
                    throw new Error("Le fichier d'archive ne contient pas un JSON valide");
                }
            })
            .then(data => {
                const listeExpediees = data.commandes_expediees || [];
                
                // Génération dynamique pour les 2 derniers jours ouvrés (Exclusion Samedi 6 et Dimanche 0)
                const joursOuvresCibles = [];
                let dateVerif = new Date(); 

                while (joursOuvresCibles.length < 2) {
                    const jourSemaine = dateVerif.getDay();
                    if (jourSemaine !== 0 && jourSemaine !== 6) { // On exclut Dimanche (0) et Samedi (6)
                        const jj = String(dateVerif.getDate()).padStart(2, '0');
                        const mm = String(dateVerif.getMonth() + 1).padStart(2, '0');
                        const aaaa = dateVerif.getFullYear();
                        joursOuvresCibles.push(`${jj}/${mm}/${aaaa}`);
                    }
                    dateVerif.setDate(dateVerif.getDate() - 1);
                }

                // ==========================================
                // 🔍 ZONE DE DEBUG CONSOLE
                // ==========================================
                console.log(`--- DEBUG MAGASIN ${clientId} ---`);
                console.log("1. Total commandes dans l'archive expédiée :", listeExpediees.length);
                console.log("2. Les 2 jours ouvrés cibles calculés par le script :", joursOuvresCibles);
                
                if (listeExpediees.length > 0) {
                    console.log("3. Exemple de format de 'date_expedition' dans ton JSON :", `"${listeExpediees[0].date_expedition}"`);
                } else {
                    console.log("3. ⚠️ Le tableau 'commandes_expediees' est vide ou mal nommé dans le JSON.");
                }
                // ==========================================

                // Filtrage des archives sur le tag 'date_expedition'
                const expReccentes = listeExpediees.filter(cmd => {
                    return cmd.date_expedition && joursOuvresCibles.includes(cmd.date_expedition.trim());
                });

                console.log("4. Nombre de commandes correspondantes après filtrage :", expReccentes.length);

                countExpEl.innerText = expReccentes.length;
            })
            .catch(err => {
                console.error("Erreur compteur Expédiées :", err.message);
                countExpEl.innerText = "0";
            });
    }

    // --- APPEL 2 : CHARGEMENT DES ARCHIVES POUR LES COMMANDES EXPÉDIÉES ---
    if (clientId && countExpEl) {
        fetch(`data_archives/${currentYear}/archive_${clientId}.json`)
            .then(response => {
                if (!response.ok) throw new Error(`Pas d'archive disponible pour le magasin : ${clientId}`);
                return response.text();
            })
            .then(text => {
                try {
                    return JSON.parse(text);
                } catch (e) {
                    throw new Error("Le fichier d'archive ne contient pas un JSON valide");
                }
            })
            .then(data => {
                const listeExpediees = data.commandes_expediees || [];
                
                // Génération dynamique des chaînes au format "JJ/MM/AAAA" pour les 2 derniers jours ouvrés
                const joursOuvresCibles = [];
                let dateVerif = new Date(); 

                while (joursOuvresCibles.length < 2) {
                    if (dateVerif.getDay() !== 0) { // On exclut le dimanche
                        const jj = String(dateVerif.getDate()).padStart(2, '0');
                        const mm = String(dateVerif.getMonth() + 1).padStart(2, '0');
                        const aaaa = dateVerif.getFullYear();
                        joursOuvresCibles.push(`${jj}/${mm}/${aaaa}`);
                    }
                    dateVerif.setDate(dateVerif.getDate() - 1);
                }

                // Filtrage des archives sur le tag 'date_expedition'
                const expReccentes = listeExpediees.filter(cmd => {
                    return cmd.date_expedition && joursOuvresCibles.includes(cmd.date_expedition.trim());
                });

                countExpEl.innerText = expReccentes.length;
            })
            .catch(err => {
                console.error("Erreur compteur Expédiées :", err.message);
                countExpEl.innerText = "0";
            });
    }

    // 5. Initialisation des icônes Lucide
    if (window.lucide) {
        lucide.createIcons();
    }
});

// 6. Fonction de déconnexion
window.logout = function() {
    localStorage.removeItem('v2i_authenticated');
    localStorage.removeItem('v2i_client_id');
    window.location.href = './login.html'; 
};
