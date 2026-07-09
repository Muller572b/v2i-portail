/**
 * V2i Portail - Module de Suivi des Commandes (suivi.js)
 * Gère le flux des encours, le lazy-loading asynchrone des archives depuis GitHub,
 * les filtres croisés (recherche + dates + boutons d'état), la pagination et le panneau latéral technique.
 */

// --- CONFIGURATION CONSTANTE GITHUB ---
// --- CONFIGURATION CONSTANTE GITHUB ---
const GITHUB_BASE_URL = "https://raw.githubusercontent.com/Muller572b/v2i-portail/main";
// Nouvelle constante pour les PDF externalisés
const GITHUB_PDF_BASE_URL = "https://raw.githubusercontent.com/Muller572b/portail-cartedevue/main";
// --- RÉPERTOIRE DE SÉCURITÉ DES CODES COSIUM ---
window.LISTE_MAGASINS = window.LISTE_MAGASINS || {
    "1": "DON", "2": "A36", "3": "LUP", "4": "BAB", "6": "LIS", "7": "A67",
    "9": "A40", "10": "BAA", "11": "BOR", "12": "AOS", "16": "BFO", "18": "ILE", "22": "O2C",
    "23": "COR", "24": "PAA", "25": "PLU", "28": "BOB", "29": "ROC", "31": "LAR",       
    "33": "CCA", "34": "COZ", "35": "OBP", "36": "CCB", "37": "CCF", "39": "OBR", "41": "CAO",
    "42": "FAA", "43": "FCA", "44": "FAL", "46": "BAO", "47": "POB", "48": "BOF", "49": "O2B",
    "50": "ATS", "51": "OSM", "52": "OBB", "53": "ONA", "56": "OBS", "57": "OPM",
    "58": "OBV", "59": "ATB", "60": "KBO", "62": "OBO","99": "TEST99", "ADMIN": "COSIUM2026"
};

// --- ÉTATS GLOBAUX PERSISTANTS ---
let currentStoreId = localStorage.getItem('v2i_client_id') || null;
let currentCosiumCode = localStorage.getItem('v2i_cosium_code') || null;

if (!currentCosiumCode || currentCosiumCode === 'null' || currentCosiumCode.trim() === '') {
    currentCosiumCode = window.LISTE_MAGASINS[currentStoreId] || '00';
}

let storeEncours = [];
let storeArchives = []; 
let autoArchivesIncluded = false; 
let loadedYears = []; 
let isLoadingArchives = false; 
let searchTimeout = null;
let currentFilterType = 'tous'; // Type de filtrage actif par défaut : 'tous', 'cours', ou 'expedie'

// --- CONFIGURATION DE LA PAGINATION ---
let currentPage = 1;
let totalPages = 1;
const itemsPerPage = 15; 

// --- CONFIGURATION DU TRI DYNAMIQUE ---
let currentSort = {
    key: 'date',  
    asc: false    
};

/**
 * Le Gardien : Vérifie l'état de la session avant d'afficher les données
 */
function checkSession() {
    if (localStorage.getItem('v2i_authenticated') !== 'true' || !currentStoreId) {
        console.warn("Session non authentifiée. Éjection vers la page de connexion.");
        window.location.href = './login.html';
        return false;
    }
    return true;
}

// Exécution immédiate préventive
if (checkSession()) {
    /**
     * Initialisation au chargement de la page suivi.html
     */
    document.addEventListener('DOMContentLoaded', () => {
        if (!checkSession()) return;

        // --- HARMONISATION ET CAPTURE DU FILTRE DE L'ACCUEIL ---
        const filtreCible = localStorage.getItem('v2i_filtre_cible');
        if (filtreCible === 'encours') {
            currentFilterType = 'cours';
        } else if (filtreCible === 'expediees') {
            currentFilterType = 'expedie';
        }
        // Nettoyage immédiat pour éviter la rémanence au rafraîchissement
        localStorage.removeItem('v2i_filtre_cible');

        const storeBadge = document.getElementById('store-badge');
        if (storeBadge) {
            const cosiumText = (currentCosiumCode && currentCosiumCode !== 'null') ? ` (${currentCosiumCode})` : '';
            storeBadge.innerText = `Magasin : N° ${currentStoreId}${cosiumText}`;
        }

        // Configuration des événements et chargements initiaux
        setupFilters();
        loadStoreEncours();
        
        // Force l'application visuelle et technique du filtre récupéré
        setFilterType(currentFilterType, true);

        window.addEventListener('scroll', handleScrollLoad);
    });
}

/**
 * Configure les écouteurs sur les entrées de filtres, recherche et boutons
 */
function setupFilters() {
    const searchInput = document.getElementById('search-verres');
    if (searchInput) searchInput.addEventListener('input', handleSearchInput);

    const dateDebutInput = document.getElementById('date-debut');
    const dateFinInput = document.getElementById('date-fin');
    if (dateDebutInput) dateDebutInput.addEventListener('change', handleDateBoundsChange);
    if (dateFinInput) dateFinInput.addEventListener('change', handleDateBoundsChange);

    // Liaisons des boutons de filtrage d'état (Évite les pannes d'attributs HTML onclick)
    const btnAll = document.getElementById('btn-filter-all');
    const btnCours = document.getElementById('btn-filter-cours');
    const btnExpedie = document.getElementById('btn-filter-expedie');
    if (btnAll) btnAll.addEventListener('click', () => setFilterType('tous'));
    if (btnCours) btnCours.addEventListener('click', () => setFilterType('cours'));
    if (btnExpedie) btnExpedie.addEventListener('click', () => setFilterType('expedie'));
}

/**
 * Gère la sélection exclusive, l'application et les styles visuels des trois boutons de filtres d'état
 */
function setFilterType(type, forceRefresh = false) {
    if (currentFilterType === type && !forceRefresh) return;
    currentFilterType = type;
    currentPage = 1; 

    const btnAll = document.getElementById('btn-filter-all');
    const btnCours = document.getElementById('btn-filter-cours');
    const btnExpedie = document.getElementById('btn-filter-expedie');

    const activeClasses = ['bg-white', 'text-[#0066cc]', 'shadow-sm'];
    const inactiveClasses = ['text-[#86868b]', 'hover:text-[#1d1d1f]'];

    // Réinitialisation globale des classes des boutons
    [btnAll, btnCours, btnExpedie].forEach(btn => {
        if (btn) btn.classList.remove(...activeClasses, ...inactiveClasses);
    });

    // Application conditionnelle des styles Apple-like
    if (type === 'tous' && btnAll) {
        btnAll.classList.add(...activeClasses);
        if (btnCours) btnCours.classList.add(...inactiveClasses);
        if (btnExpedie) btnExpedie.classList.add(...inactiveClasses);
    } else if (type === 'cours' && btnCours) {
        btnCours.classList.add(...activeClasses);
        if (btnAll) btnAll.classList.add(...inactiveClasses);
        if (btnExpedie) btnExpedie.classList.add(...inactiveClasses);
    } else if (type === 'expedie' && btnExpedie) {
        btnExpedie.classList.add(...activeClasses);
        if (btnAll) btnAll.classList.add(...inactiveClasses);
        if (btnCours) btnCours.classList.add(...inactiveClasses);
    }

    // Si filtrage ciblé sur Archives et vide, charger automatiquement l'année en cours
    if (type === 'expedie' && storeArchives.length === 0 && !isLoadingArchives) {
        isLoadingArchives = true;
        renderVerres();
        const anneeEnCours = new Date().getFullYear();
        loadArchiveYear(anneeEnCours).then(() => {
            isLoadingArchives = false;
            autoArchivesIncluded = true;
            renderVerres();
        }).catch(() => { 
            isLoadingArchives = false; 
            renderVerres(); 
        });
    } else {
        renderVerres();
    }
}

/**
 * Récupère le flux JSON des commandes en cours du magasin connecté
 */
async function loadStoreEncours() {
    if (!currentStoreId) return;
    
    const urlJsonEncours = `${GITHUB_BASE_URL}/data_magasins/encours_${currentStoreId}.json`;
    try {
        const response = await fetch(urlJsonEncours);
        if (!response.ok) throw new Error("Fichier encours introuvable");
        
        const data = await response.json();
        storeEncours = data.commandes_en_cours || [];
        
        const storeBadge = document.getElementById('store-badge');
        if (storeBadge && data.infos_magasin && data.infos_magasin.nom) {
            const cosiumText = (currentCosiumCode && currentCosiumCode !== 'null') ? ` (${currentCosiumCode})` : '';
            storeBadge.innerText = `Magasin : ${data.infos_magasin.nom}${cosiumText}`;
        }

        renderVerres();
    } catch (err) {
        console.error("Erreur lors de la récupération des encours:", err);
        const tbody = document.getElementById('verres-table-body');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-12 text-center text-gray-400 bg-white">Aucune commande en cours trouvée pour ce magasin.</td></tr>`;
        }
    }
}

/**
 * Charge à la volée le fichier d'archive d'une année spécifique
 */
async function loadArchiveYear(year) {
    if (!year || isNaN(year) || loadedYears.includes(year) || !currentStoreId) return;
    loadedYears.push(year);

    const urlJsonArchive = `${GITHUB_BASE_URL}/data_archives/${year}/archive_${currentStoreId}.json`;
    try {
        const resp = await fetch(urlJsonArchive);
        if (resp.ok) {
            const archiveData = await resp.json();
            const nouvellesCommandes = archiveData.commandes_expediees || [];
            
            const existingIds = new Set(storeArchives.map(existing => String(existing.ord_numb || existing.id_bl_v2i || '').trim()));

            nouvellesCommandes.forEach(cmd => {
                const idCmdNouvelle = String(cmd.ord_numb || cmd.id_bl_v2i || '').trim();
                if (!existingIds.has(idCmdNouvelle)) {
                    storeArchives.push(cmd);
                    existingIds.add(idCmdNouvelle);
                }
            });

            const anneeMax = Math.max(...loadedYears);
            const banner = document.getElementById('archive-status-banner');
            const bannerText = document.getElementById('archive-status-text');
            if (banner && bannerText) {
                banner.classList.remove('hidden');
                bannerText.innerText = `Archives synchronisées jusqu'en ${anneeMax}. Total archivé : ${storeArchives.length} commande(s).`;
            }
        }
    } catch (e) {
        console.log(`Pas d'archive disponible pour l'année ${year} ou ce magasin.`);
    }
}

/**
 * Déclenche le chargement automatique de l'année en cours lors d'un scroll en bas de page
 */
function handleScrollLoad() {
    const contentVerres = document.getElementById('content-verres');
    if (contentVerres && contentVerres.classList.contains('hidden')) return;
    if (autoArchivesIncluded || isLoadingArchives) return;
    if (currentFilterType === 'cours') return;

    if ((window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 100) {
        autoArchivesIncluded = true;
        isLoadingArchives = true;
        const anneeEnCours = new Date().getFullYear();
        
        loadArchiveYear(anneeEnCours).then(() => {
            isLoadingArchives = false;
            renderVerres();
        }).catch(() => { isLoadingArchives = false; });
    }
}

/**
 * Intercepte les modifications des filtres de dates pour pré-charger les bonnes archives
 */
async function handleDateBoundsChange() {
    const dateDebutInput = document.getElementById('date-debut');
    const dateFinInput = document.getElementById('date-fin');
    
    currentPage = 1; 

    if (!dateDebutInput || !dateDebutInput.value) {
        renderVerres();
        return;
    }

    const dateDebutVal = dateDebutInput.value;
    const dateFinVal = dateFinInput ? dateFinInput.value : '';
    
    if (dateDebutVal.length < 10) return;
    if (isLoadingArchives) return;

    const dateDebut = new Date(dateDebutVal);
    const anneeSelectionneeDebut = dateDebut.getFullYear();
    
    if (!anneeSelectionneeDebut || isNaN(anneeSelectionneeDebut) || anneeSelectionneeDebut < 2000 || anneeSelectionneeDebut > 2100) {
        renderVerres();
        return;
    }

    const currentYear = new Date().getFullYear();
    let anneeSelectionneeFin = dateFinVal ? new Date(dateFinVal).getFullYear() : currentYear;
    
    if (isNaN(anneeSelectionneeFin)) {
        anneeSelectionneeFin = currentYear;
    }
    
    const anneeMaxABoucler = Math.max(anneeSelectionneeFin, currentYear);

    if (anneeSelectionneeDebut <= anneeMaxABoucler && (anneeMaxABoucler - anneeSelectionneeDebut) < 10) {
        isLoadingArchives = true;
        renderVerres(); 
        
        const anneesACharger = [];
        for (let y = anneeSelectionneeDebut; y <= anneeMaxABoucler; y++) {
            anneesACharger.push(y);
        }

        try {
            await Promise.all(anneesACharger.map(year => loadArchiveYear(year)));
            autoArchivesIncluded = true;
        } catch (err) {
            console.error("Erreur lors du chargement des blocs d'archives :", err);
        } finally {
            isLoadingArchives = false;
        }
    }
    
    renderVerres();
}

/**
 * Convertit les chaînes de caractères de type DD/MM/YYYY en objet Date JavaScript
 */
function parseDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split(' ')[0].split('/');
    if (parts.length === 3) {
        return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10), 0, 0, 0, 0);
    }
    return null;
}

/**
 * Système de Debounce appliqué sur la saisie de recherche globale
 */
function handleSearchInput() {
    clearTimeout(searchTimeout);
    
    searchTimeout = setTimeout(async () => {
        const searchInput = document.getElementById('search-verres');
        const searchValue = searchInput ? searchInput.value.trim() : '';
        
        currentPage = 1; 

        if (searchValue.length >= 3) {
            const currentYear = new Date().getFullYear();
            const yearsToLoad = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];
            const missingYears = yearsToLoad.filter(y => !loadedYears.includes(y));
            
            if (missingYears.length > 0 && !isLoadingArchives) {
                isLoadingArchives = true;
                renderVerres(); 
                try {
                    await Promise.all(missingYears.map(year => loadArchiveYear(year)));
                    autoArchivesIncluded = true;
                } catch (err) {
                    console.error("Erreur lors de la recherche transverse dans les archives:", err);
                } finally {
                    isLoadingArchives = false;
                }
            }
        }
        
        renderVerres();
    }, 350);
}

/**
 * Gestionnaire d'interactivité du Tri Dynamique des colonnes
 */
function handleSort(colKey) {
    if (currentSort.key === colKey) {
        currentSort.asc = !currentSort.asc;
    } else {
        currentSort.key = colKey;
        currentSort.asc = (colKey === 'date' || colKey === 'livraison') ? false : true;
    }
    currentPage = 1; 
    renderVerres();
}

/**
 * Met à jour les éléments de l'interface graphique de la pagination (HTML Harmonisé)
 */
function updatePaginationUI(totalItems) {
    const startEl = document.getElementById('pagination-start');
    const endEl = document.getElementById('pagination-end');
    const totalEl = document.getElementById('pagination-total');
    const btnPrev = document.getElementById('btn-prev-page');
    const btnNext = document.getElementById('btn-next-page');
    const numbersEl = document.getElementById('pagination-numbers');

    const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage;
    const startDisplay = totalItems === 0 ? 0 : startIndex + 1;
    const endDisplay = Math.min(startIndex + itemsPerPage, totalItems);

    // Injection des compteurs de lignes
    if (startEl) startEl.innerText = startDisplay;
    if (endEl) endEl.innerText = endDisplay;
    if (totalEl) totalEl.innerText = totalItems;

    // État visuel et technique du bouton Précédent
    if (btnPrev) {
        btnPrev.disabled = (currentPage === 1);
        if (currentPage === 1) {
            btnPrev.classList.add('opacity-40', 'pointer-events-none');
        } else {
            btnPrev.classList.remove('opacity-40', 'pointer-events-none');
        }
    }

    // État visuel et technique du bouton Suivant
    if (btnNext) {
        btnNext.disabled = (currentPage === totalPages);
        if (currentPage === totalPages) {
            btnNext.classList.add('opacity-40', 'pointer-events-none');
        } else {
            btnNext.classList.remove('opacity-40', 'pointer-events-none');
        }
    }

    // Génération dynamique des pastilles numériques cliquables (AVEC LIMITATION INTELLIGENTE)
    if (numbersEl) {
        // Ajoute dynamiquement Flexbox et le retour à la ligne sécurisé sur le conteneur
        numbersEl.classList.add('flex', 'flex-wrap', 'gap-1', 'justify-center');
        
        let numbersHtml = '';
        const maxBoutons = 5; // Nombre maximum de boutons à afficher autour de la page courante
        let startPage = Math.max(1, currentPage - Math.floor(maxBoutons / 2));
        let endPage = Math.min(totalPages, startPage + maxBoutons - 1);

        if (endPage - startPage + 1 < maxBoutons) {
            startPage = Math.max(1, endPage - maxBoutons + 1);
        }

        // Affiche toujours la page 1 et des points de suspension si on est loin du début
        if (startPage > 1) {
            numbersHtml += `<button onclick="goToPage(1)" class="px-3 py-1.5 text-xs font-medium text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#e8e8ed] rounded-lg transition-colors cursor-pointer">1</button>`;
            if (startPage > 2) {
                numbersHtml += `<span class="px-2 py-1.5 text-xs text-[#86868b]">...</span>`;
            }
        }

        // Génère les boutons de la plage calculée
        for (let i = startPage; i <= endPage; i++) {
            if (i === currentPage) {
                numbersHtml += `<span class="px-3 py-1.5 text-xs font-bold bg-[#0066cc] text-white rounded-lg shadow-sm">${i}</span>`;
            } else {
                numbersHtml += `<button onclick="goToPage(${i})" class="px-3 py-1.5 text-xs font-medium text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#e8e8ed] rounded-lg transition-colors cursor-pointer">${i}</button>`;
            }
        }

        // Affiche toujours la dernière page et des points de suspension si on est loin de la fin
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                numbersHtml += `<span class="px-2 py-1.5 text-xs text-[#86868b]">...</span>`;
            }
            numbersHtml += `<button onclick="goToPage(${totalPages})" class="px-3 py-1.5 text-xs font-medium text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#e8e8ed] rounded-lg transition-colors cursor-pointer">${totalPages}</button>`;
        }

        numbersEl.innerHTML = numbersHtml;
    }
}

/**
 * Routeurs globaux de navigation pour la pagination (Appelés par l'HTML)
 */
window.changePage = function(direction) {
    if (direction === -1 && currentPage > 1) {
        currentPage--;
        renderVerres();
    } else if (direction === 1 && currentPage < totalPages) {
        currentPage++;
        renderVerres();
    }
};

window.goToPage = function(pageNumber) {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
        currentPage = pageNumber;
        renderVerres();
    }
};

/**
 * Construit et injecte les lignes de données filtrées dans le tableau HTML
 */
function renderVerres() {
    const tbody = document.getElementById('verres-table-body'); 
    if (!tbody) return;
    
    const searchInput = document.getElementById('search-verres');
    const search = searchInput ? searchInput.value.toLowerCase().trim() : '';
    
    const dateDebutEl = document.getElementById('date-debut');
    const dateDebutVal = dateDebutEl ? dateDebutEl.value : '';
    
    const dateFinEl = document.getElementById('date-fin');
    const dateFinVal = dateFinEl ? dateFinEl.value : '';
    
    let dateDebutFilter = null;
    if (dateDebutVal) {
        const parts = dateDebutVal.split('-');
        if (parts.length === 3) dateDebutFilter = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
    }

    let dateFinFilter = null;
    if (dateFinVal) {
        const parts = dateFinVal.split('-');
        if (parts.length === 3) dateFinFilter = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
    }

    const archivesIncluses = (typeof autoArchivesIncluded !== 'undefined') ? autoArchivesIncluded : false;
    const dataEncours = (typeof storeEncours !== 'undefined' && Array.isArray(storeEncours)) ? storeEncours : [];
    const dataArchives = (typeof storeArchives !== 'undefined' && Array.isArray(storeArchives)) ? storeArchives : [];

    let donneesAAfficher = [];

    if (currentFilterType === 'tous' || currentFilterType === 'cours') {
        dataEncours.forEach(item => {
            if (item) donneesAAfficher.push({ ...item, isArchive: false });
        });
    }

    if (currentFilterType === 'tous' || currentFilterType === 'expedie') {
        const inclureArchives = currentFilterType === 'expedie' || archivesIncluses || dateDebutFilter !== null || dateFinFilter !== null;
        if (inclureArchives) {
            dataArchives.forEach(item => {
                if (item) donneesAAfficher.push({ ...item, isArchive: true });
            });
        }
    }

    const uniquesMap = new Map();
    donneesAAfficher.forEach(item => {
        const idUnique = item.id_commande_v2i || item.ord_numb || item.id_bl_v2i;
        if (idUnique) {
            const key = String(idUnique).trim();
            if (!uniquesMap.has(key) || (!item.isArchive && uniquesMap.get(key).isArchive)) {
                uniquesMap.set(key, item);
            }
        }
    });
    donneesAAfficher = Array.from(uniquesMap.values());

    let donneesFiltrees = donneesAAfficher.filter(v => {
        if (!v) return false;
        const idCommande = String(v.id_commande_v2i || v.ord_numb || v.id_bl_v2i || '').trim();
        const statutFournisseur = v.statut_affichage || v.statut_final || '';
        const jobCosium = v.job_cosium || '';
        const patientName = v.patient || '';
        const dateEntree = v.date_entree || '';
        
        const texteRecherche = `${patientName} ${idCommande} ${jobCosium} ${dateEntree} ${statutFournisseur}`.toLowerCase();
        if (search && !texteRecherche.includes(search)) return false;

        if (typeof parseDate === 'function') {
            const dateSaisie = parseDate(dateEntree); 
            if (dateSaisie) {
                if (dateDebutFilter && dateSaisie < dateDebutFilter) return false;
                if (dateFinFilter && dateSaisie > dateFinFilter) return false;
            } else if (dateDebutFilter || dateFinFilter) {
                return false; 
            }
        } else if (dateDebutFilter || dateFinFilter) {
            return false; 
        }

        return true;
    });

    donneesFiltrees.sort((a, b) => {
        let valA, valB;

        if (currentSort.key === 'patient') {
            valA = (a.patient || "").toLowerCase();
            valB = (b.patient || "").toLowerCase();
        } else if (currentSort.key === 'equipement') {
            const cibleA = a.oeil_droit ? a.oeil_droit : a.oeil_gauche;
            const cibleB = b.oeil_droit ? b.oeil_droit : b.oeil_gauche;
            valA = (cibleA && cibleA.verre ? cibleA.verre : (a.type_commande || '')).toLowerCase();
            valB = (cibleB && cibleB.verre ? cibleB.verre : (b.type_commande || '')).toLowerCase();
        } else if (currentSort.key === 'date') {
            valA = parseDate(a.date_entree) || new Date(0);
            valB = parseDate(b.date_entree) || new Date(0);
        } else if (currentSort.key === 'status') {
            valA = (a.statut_affichage || a.statut_final || '').toLowerCase();
            valB = (b.statut_affichage || b.statut_final || '').toLowerCase();
        } else if (currentSort.key === 'livraison') {
            const livA = a.statut && String(a.statut).toLowerCase().includes('livraison') ? String(a.statut) : (a.date_livraison_prevue || a.date_expedition || '');
            const livB = b.statut && String(b.statut).toLowerCase().includes('livraison') ? String(b.statut) : (b.date_livraison_prevue || b.date_expedition || '');
            valA = livA.toLowerCase();
            valB = livB.toLowerCase();
        } else if (currentSort.key === 'bl') {
            valA = String(a.id_commande_v2i || a.ord_numb || a.id_bl_v2i || '').toLowerCase();
            valB = String(b.id_commande_v2i || b.ord_numb || b.id_bl_v2i || '').toLowerCase();
        } else {
            return 0;
        }

        if (valA < valB) return currentSort.asc ? -1 : 1;
        if (valA > valB) return currentSort.asc ? 1 : -1;
        return 0;
    });

    const totalItems = donneesFiltrees.length;
    totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    if (totalItems === 0) {
        if (isLoadingArchives) {
            tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-12 text-center text-[#86868b] font-medium bg-white"><div class="flex items-center justify-center gap-2.5"><span class="animate-spin rounded-full h-4 w-4 border-2 border-[#0066cc] border-t-transparent"></span> Recherche et synchronisation des archives en cours...</div></td></tr>`;
        } else {
            tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-12 text-center text-[#86868b] font-medium bg-white">Aucun enregistrement trouvé.</td></tr>`;
        }
        updatePaginationUI(0);
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const auMaximum = donneesFiltrees.slice(startIndex, startIndex + itemsPerPage);
    let rowsHtml = [];

    auMaximum.forEach((v) => {
        if (!v) return;
        const idCommande = String(v.id_commande_v2i || v.ord_numb || v.id_bl_v2i || '').trim();
        const statutFournisseur = v.statut_affichage || v.statut_final || '—';
        const cibleVerre = v.oeil_droit ? v.oeil_droit : v.oeil_gauche;
        const listeSupplements = cibleVerre && Array.isArray(cibleVerre.supplements) ? cibleVerre.supplements : [];
        const typeVerre = cibleVerre && cibleVerre.verre ? cibleVerre.verre : (v.type_commande || 'Verre V2i');
        
        let htmlSupplements = `<div class="font-semibold text-[#1d1d1f] text-xs">${typeVerre}</div>`;
        if (listeSupplements.length > 0) {
            htmlSupplements += `
                <div class="flex flex-col gap-0.5 text-[11px] text-gray-500 font-medium mt-1 leading-relaxed">
                    ${listeSupplements.slice(0, 3).map(supp => `<span>• ${supp}</span>`).join('')}
                </div>
            `;
        }

        let livraisonPrevue = 'En calcul';
        if (v.statut && String(v.statut).toLowerCase().includes('livraison')) {
            livraisonPrevue = String(v.statut).trim();
        } else if (v.date_livraison_prevue && String(v.date_livraison_prevue).trim() !== '') {
            livraisonPrevue = String(v.date_livraison_prevue).trim();
        } else if (v.date_expedition && String(v.date_expedition).trim() !== '') {
            livraisonPrevue = String(v.date_expedition).trim(); 
        }

        const statutClean = String(statutFournisseur).toLowerCase().trim();
        const estExpedie = statutClean.includes('expédi') || statutClean.includes('expedi');
        
        const dateCommande = parseDate(v.date_entree);
        const dateLimiteDocs = new Date(2026, 5, 8, 0, 0, 0, 0); 

        // SÉCURITÉ : N'affiche les eBL et CDV que s'il s'agit d'une archive expédiée (Pas pour les encours actifs)
        const afficherDocs = v.isArchive && estExpedie && dateCommande && (dateCommande.getTime() >= dateLimiteDocs.getTime());

        const anneeBL = idCommande.length >= 2 ? "20" + idCommande.substring(0, 2) : new Date().getFullYear();
        const codeMagasinActuel = (currentCosiumCode && currentCosiumCode !== 'null') ? currentCosiumCode : '00'; 
        
        const urlEbl = `${GITHUB_BASE_URL}/eBLcertifie/${anneeBL}/${currentStoreId}/_${codeMagasinActuel}_BL_${idCommande}.pdf`;
        const urlCdv = `${GITHUB_PDF_BASE_URL}/${anneeBL}/${currentStoreId}/Carte_Vue_${currentStoreId}_${idCommande}.pdf`;

        const archiveBadge = v.isArchive 
            ? `<span class="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 tracking-wide uppercase">Archive</span>`
            : '';

        const htmlDernierStatut = v.date_dernier_statut 
            ? `<div class="text-[11px] text-[#86868b] font-medium mt-0.5">${v.date_dernier_statut}</div>` 
            : '';

        rowsHtml.push(`
            <tr class="hover:bg-[#f5f5f7]/60 transition-colors align-middle font-sans text-xs bg-white">
                <td class="px-6 py-4">
                    <div class="font-bold text-[#1d1d1f] text-sm tracking-tight uppercase">${v.patient || '—'} ${archiveBadge}</div>
                    <div class="text-[11px] text-[#86868b] font-medium font-mono mt-0.5">Job: ${v.job_cosium || '—'}</div>
                </td>
                <td class="px-6 py-4">${htmlSupplements}</td> 
                <td class="px-6 py-4 font-mono">${v.date_entree || '—'}</td>
                <td class="px-6 py-4 font-mono">
                    <div class="font-bold text-[#1d1d1f]">${statutFournisseur}</div>
                    ${htmlDernierStatut}
                </td>
                <td class="px-6 py-4 font-mono font-bold text-[#ff9500] bg-[#fff5e6]/30 text-sm">${livraisonPrevue}</td>
                <td class="px-6 py-4 font-mono font-bold">${idCommande}</td>
                <td class="px-6 py-4">
                    <div class="flex items-center justify-center gap-2">
                        <button onclick="openSidePanel('${idCommande}')" class="p-2 text-[#86868b] hover:text-[#0066cc] bg-[#f5f5f7] rounded-xl cursor-pointer" title="Voir les détails">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                        
                        ${afficherDocs ? `
                            <a href="${urlEbl}" target="_blank" class="px-3 py-1.5 bg-[#ff3b30] hover:bg-[#e03126] text-white font-bold rounded-xl cursor-pointer flex items-center gap-1.5 transition-colors text-[11px] tracking-wide shadow-sm" title="Télécharger le eBL">
                                <span>eBL</span>
                                <i data-lucide="download" class="w-3.5 h-3.5"></i>
                            </a>
                            <a href="${urlCdv}" target="_blank" class="px-3 py-1.5 bg-[#0066cc] hover:bg-[#005bb5] text-white font-bold rounded-xl cursor-pointer flex items-center gap-1.5 transition-colors text-[11px] tracking-wide shadow-sm" title="Télécharger la Carte de Vue">
                                <span>CDV</span>
                                <i data-lucide="download" class="w-3.5 h-3.5"></i>
                            </a>
                        ` : `
                            <div class="w-28 h-8"></div> `}
                    </div>
                </td>
            </tr>
        `);
    });
    
    tbody.innerHTML = rowsHtml.join('');
    if (window.lucide) lucide.createIcons();
    
    updatePaginationUI(totalItems);
}

/**
 * Remplit et déploie le volet technique latéral pour une commande sélectionnée
 */
function openSidePanel(idCommande) {
    const toutesDonnees = [...storeEncours, ...storeArchives];
    const item = toutesDonnees.find(i => String(i.id_commande_v2i || i.ord_numb || i.id_bl_v2i || '').trim() === String(idCommande).trim());

    if (!item) {
        console.error("Commande introuvable :", idCommande);
        return;
    }

    // 1. Mise à jour de l'en-tête
    document.getElementById('panel-patient').textContent = item.patient || "Nom Inconnu";
    document.getElementById('panel-bl').textContent = `N° DE COMMANDE : ${item.id_commande_v2i || item.ord_numb || "—"}`;
    document.getElementById('panel-cosium-id').textContent = item.job_cosium || "—";

    // 2. Mise à jour des verres OD
    document.getElementById('od-sph').textContent = item.oeil_droit?.sphere || "—";
    document.getElementById('od-cyl').textContent = item.oeil_droit?.cylindre || "—";
    document.getElementById('od-axe').textContent = item.oeil_droit?.axe || "—";
    document.getElementById('od-add').textContent = item.oeil_droit?.addition || "—";

    // 3. Mise à jour des verres OG
    document.getElementById('og-sph').textContent = item.oeil_gauche?.sphere || "—";
    document.getElementById('og-cyl').textContent = item.oeil_gauche?.cylindre || "—";
    document.getElementById('og-axe').textContent = item.oeil_gauche?.axe || "—";
    document.getElementById('og-add').textContent = item.oeil_gauche?.addition || "—";

    // 4. Mise à jour des données morphologiques (Ecarts et Hauteurs)
    // Assurez-vous que ces IDs existent dans votre HTML
    document.getElementById('morpho-od-ecart').textContent = item.oeil_droit?.ecart_pupillaire || "—";
    document.getElementById('morpho-od-haut').textContent = item.oeil_droit?.hauteur || "—";
    document.getElementById('morpho-og-ecart').textContent = item.oeil_gauche?.ecart_pupillaire || "—";
    document.getElementById('morpho-og-haut').textContent = item.oeil_gauche?.hauteur || "—";

    // 5. Mise à jour des Traitements (Suppléments)
    const conteneurSupplements = document.getElementById('panel-supplements');
    if (conteneurSupplements) {
        conteneurSupplements.innerHTML = ""; // Vider avant de remplir
        const liste = item.oeil_droit?.supplements || [];
        
        if (liste.length > 0) {
            liste.forEach(traitement => {
                const span = document.createElement('span');
                span.className = "inline-block bg-blue-50 text-blue-700 text-[10px] px-2 py-1 rounded-full border border-blue-200 mr-1 mb-1";
                span.textContent = traitement;
                conteneurSupplements.appendChild(span);
            });
        } else {
            conteneurSupplements.innerHTML = '<span class="text-xs text-gray-400 italic">Aucun traitement spécifique</span>';
        }
    }

    // 6. Affichage du panneau
    const panel = document.getElementById('side-panel');
    if (panel) {
        panel.classList.remove('hidden', 'translate-x-full');
        panel.classList.add('flex', 'translate-x-0');
    }
}

/**
 * Ferme le volet technique latéral
 */
function closeSidePanel() {
    const panel = document.getElementById('side-panel');
    if (panel) {
        panel.classList.remove('translate-x-0', 'flex'); // On retire le visible
        panel.classList.add('translate-x-full');         // On ajoute le caché
    }
}

/**
 * Déconnexion de la session utilisateur
 */
window.logout = function() {
    localStorage.removeItem('v2i_authenticated');
    localStorage.removeItem('v2i_client_id');
    localStorage.removeItem('v2i_cosium_code');
    window.location.href = './login.html';
};
