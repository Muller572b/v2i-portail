// --- ACCUEIL.JS CORRIGÉ ---

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
    const cosiumCode = window.LISTE_MAGASINS[clientId] || "Inconnu";

    // Affichage dynamique des infos du magasin sur l'écran d'accueil
    const storeNameEl = document.getElementById('store-name');
    if (storeNameEl && clientId) {
        storeNameEl.innerText = `Magasin : N° ${clientId} (${cosiumCode})`;
    }

    // 3. Récupération automatique du flux d'actualités
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
                return response.json();
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

    // --- APPEL 2 : CHARGEMENT DES COMMANDES EXPÉDIÉES (NETTOYÉ ET UNIQUE) ---
    if (clientId && countExpEl) {
        fetch(`data_archives/${currentYear}/archive_${clientId}.json`)
            .then(response => {
                if (!response.ok) throw new Error(`Pas d'archive disponible pour le magasin : ${clientId}`);
                return response.json();
            })
            .then(data => {
                const listeExpediees = data.commandes_expediees || [];
                
                // Par défaut : Affichage du TOTAL global de l'archive pour éviter le blocage à 0
                countExpEl.innerText = listeExpediees.length;

                // REMARQUE : Si vous tenez absolument à restreindre aux 2 derniers jours ouvrés,
                // décommentez la section ci-dessous et supprimez la ligne "countExpEl.innerText = listeExpediees.length;"
                /*
                const joursOuvresCibles = [];
                let dateVerif = new Date(); 
                while (joursOuvresCibles.length < 2) {
                    const jourSemaine = dateVerif.getDay();
                    if (jourSemaine !== 0 && jourSemaine !== 6) {
                        const jj = String(dateVerif.getDate()).padStart(2, '0');
                        const mm = String(dateVerif.getMonth() + 1).padStart(2, '0');
                        const aaaa = dateVerif.getFullYear();
                        joursOuvresCibles.push(`${jj}/${mm}/${aaaa}`);
                    }
                    dateVerif.setDate(dateVerif.getDate() - 1);
                }
                const expRecentes = listeExpediees.filter(cmd => {
                    const dateCmd = cmd.date_expedition || cmd.date_livraison || "";
                    return dateCmd && joursOuvresCibles.includes(dateCmd.trim());
                });
                countExpEl.innerText = expRecentes.length;
                */
            })
            .catch(err => {
                console.error("Erreur compteur Expédiées :", err.message);
                countExpEl.innerText = "0";
            });
    }

    // --- 5. TRANSMISSION AUTOMATIQUE DU FILTRE "EN COURS" ---
    if (countCoursEl) {
        // On récupère le lien parent ou le bouton associé à la carte "En cours"
        const cardLink = countCoursEl.closest('a') || countCoursEl.parentElement?.querySelector('a');
        if (cardLink) {
            cardLink.addEventListener('click', () => {
                // On stocke la consigne de filtrage avant le changement de page
                localStorage.setItem('v2i_filtre_cible', 'encours');
            });
        }
    }

    // 6. Initialisation des icônes Lucide
    if (window.lucide) {
        lucide.createIcons();
    }
});

// 7. Fonction de déconnexion
window.logout = function() {
    localStorage.removeItem('v2i_authenticated');
    localStorage.removeItem('v2i_client_id');
    window.location.href = './login.html'; 
};
