/**
 * V2i Portail - Module de Suivi des Commandes (suivi.js)
 * Gère le flux des encours, le lazy-loading asynchrone des archives depuis GitHub,
 * les filtres croisés (recherche + dates), le scroll infini et le panneau latéral technique.
 */

// --- CONFIGURATION CONSTANTE GITHUB ---
const GITHUB_BASE_URL = "https://raw.githubusercontent.com/Muller572b/v2i-portail/main";

// --- ÉTATS GLOBAUX PERSISTANTS (Extraits du LocalStorage) ---
let currentStoreId = localStorage.getItem('v2i_client_id') || null;
let currentCosiumCode = localStorage.getItem('v2i_cosium_code') || null;

let storeEncours = [];
let storeArchives = []; 
let autoArchivesIncluded = false; 
let loadedYears = []; 
let isLoadingArchives = false; // Verrou de sécurité global
let searchTimeout = null;

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

// Exécution immédiate du gardien à la lecture du script
checkSession();

/**
 * Initialisation au chargement de la page suivi.html
 */
document.addEventListener('DOMContentLoaded', () => {
    if (!checkSession()) return;

    // Mise à jour de l'affichage du badge magasin si présent
    const storeBadge = document.getElementById('store-badge');
    if (storeBadge) {
        storeBadge.innerText = `Magasin : N° ${currentStoreId} (${currentCosiumCode || 'Labo'})`;
    }

    // Chargement initial du flux des encours
    loadStoreEncours();

    // Activation du scroll infini pour les archives
    window.addEventListener('scroll', handleScrollLoad);

    // Liaison des écouteurs d'événements sur les éléments d'interface
    setupFilters();
});

/**
 * Configure les écouteurs sur les entrées de filtres et recherche
 */
function setupFilters() {
    const searchInput = document.getElementById('search-verres');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearchInput);
    }

    const dateDebutInput = document.getElementById('date-debut');
    const dateFinInput = document.getElementById('date-fin');
    if (dateDebutInput) dateDebutInput.addEventListener('change', handleDateBoundsChange);
    if (dateFinInput) dateFinInput.addEventListener('change', handleDateBoundsChange);
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
        
        // Optionnel : Actualise dynamiquement le nom réel du magasin si disponible
        const storeBadge = document.getElementById('store-badge');
        if (storeBadge && data.infos_magasin && data.infos_magasin.nom) {
            storeBadge.innerText = `Magasin : ${data.infos_magasin.nom} (${currentCosiumCode})`;
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
        return new Date(parts[2], parts[1] - 1, parts[0], 0, 0, 0, 0);
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
        
        if (searchValue.length >= 5 && !isNaN(searchValue.replace(/^[a-zA-Z]/, ''))) {
            const currentYear = new Date().getFullYear();
            
            if (!loadedYears.includes(currentYear) || !loadedYears.includes(currentYear - 1)) {
                if (!isLoadingArchives) {
                    isLoadingArchives = true;
                    try {
                        await Promise.all([
                            loadArchiveYear(currentYear),
                            loadArchiveYear(currentYear - 1),
                            loadArchiveYear(currentYear - 2)
                        ]);
                        autoArchivesIncluded = true;
                    } catch (err) {
                        console.error(err);
                    } finally {
                        isLoadingArchives = false;
                    }
                }
            }
        }
        
        renderVerres();
    }, 350);
}

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

    const inclureArchives = archivesIncluses || dateDebutFilter !== null || dateFinFilter !== null;
    
    let donneesAAfficher = [];
    dataEncours.forEach(item => {
        if (item) donneesAAfficher.push({ ...item, isArchive: false });
    });
    if (inclureArchives) {
        dataArchives.forEach(item => {
            if (item) donneesAAfficher.push({ ...item, isArchive: true });
        });
    }

    const uniquesMap = new Map();
    donneesAAfficher.forEach(item => {
        const idUnique = item.id_commande_v2i || item.ord_numb || item.id_bl_v2i;
        if (idUnique) {
            const key = String(idUnique).trim();
            if (!uniquesMap.has(key) || item.isArchive) {
                uniquesMap.set(key, item);
            }
        }
    });
    donneesAAfficher = Array.from(uniquesMap.values());

    const donneesFiltrees = donneesAAfficher.filter(v => {
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

    if (donneesFiltrees.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-12 text-center text-[#86868b] font-medium bg-white">Aucun enregistrement trouvé.</td></tr>`;
        return;
    }

    const auMaximum = donneesFiltrees.slice(0, 60);
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
        
        // Extraction de l'année depuis l'idCommande (ex: "260528..." -> "2026")
        const anneeBL = "20" + idCommande.substring(0, 2);
        
        // Construction de l'URL directe pour l'eBL certifié PDF
        const urlEbl = `${GITHUB_BASE_URL}/eBLcertifie/${anneeBL}/${currentStoreId}/${currentCosiumCode}_BL_${idCommande}.pdf`;

        rowsHtml.push(`
            <tr class="hover:bg-[#f5f5f7]/60 transition-colors align-middle font-sans text-xs bg-white">
                <td class="px-6 py-4">
                    <div class="font-bold text-[#1d1d1f] text-sm tracking-tight uppercase">${v.patient || '—'}</div>
                    <div class="text-[11px] text-[#86868b] font-medium font-mono mt-0.5">Job: ${v.job_cosium || '—'}</div>
                </td>
                <td class="px-6 py-4">${htmlSupplements}</td> 
                <td class="px-6 py-4 font-mono">${v.date_entree || '—'}</td>
                <td class="px-6 py-4 font-mono font-bold">${statutFournisseur}</td>
                <td class="px-6 py-4 font-mono font-bold text-[#ff9500] bg-[#fff5e6]/30 text-sm">${livraisonPrevue}</td>
                <td class="px-6 py-4 font-mono font-bold">${idCommande}</td>
                <td class="px-6 py-4">
                    <div class="flex items-center justify-center gap-2">
                        <button onclick="openSidePanel('${idCommande}')" class="p-2 text-[#86868b] hover:text-[#0066cc] bg-[#f5f5f7] rounded-xl cursor-pointer" title="Voir les détails">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                        
                        ${estExpedie ? `
                            <a href="${urlEbl}" target="_blank" class="px-3 py-1.5 bg-[#ff3b30] hover:bg-[#e03126] text-white font-bold rounded-xl cursor-pointer flex items-center gap-1.5 transition-colors text-[11px] tracking-wide" title="Télécharger le eBL">
                                <span>eBL</span>
                                <i data-lucide="download" class="w-3.5 h-3.5"></i>
                            </a>
                        ` : `
                            <div class="w-14 h-8"></div> `}
                    </div>
                </td>
            </tr>
        `);
    });
    
    tbody.innerHTML = rowsHtml.join('');
    if (window.lucide) lucide.createIcons();
}

/**
 * Remplit et déploie le volet technique latéral pour une commande sélectionnée
 */
function openSidePanel(idCommande) {
    const toutesLesCommandes = [...storeEncours, ...storeArchives];
    const cmd = toutesLesCommandes.find(c => {
        const idV2i = String(c.id_commande_v2i || c.ord_numb || c.id_bl_v2i || '').trim();
        return idV2i === String(idCommande).trim();
    });
    
    if (!cmd) return;
    
    document.getElementById('panel-patient').innerText = cmd.patient || '—';
    document.getElementById('panel-bl').innerText = "N° DE COMMANDE (BL) : " + (cmd.id_commande_v2i || cmd.ord_numb || cmd.id_bl_v2i);
    document.getElementById('panel-cosium-id').innerText = cmd.job_cosium || "Non spécifié";
    
    // Traitement Données Œil Droit
    if (cmd.oeil_droit) {
        document.getElementById('panel-od-row').style.display = 'grid';
        document.getElementById('od-sph').innerText = cmd.oeil_droit.sphere || '0.00';
        document.getElementById('od-cyl').innerText = cmd.oeil_droit.cylindre || '0.00';
        document.getElementById('od-axe').innerText = cmd.oeil_droit.axe || '0';
        document.getElementById('od-add').innerText = cmd.oeil_droit.addition || '0.00';
        document.getElementById('od-p1').innerText = cmd.oeil_droit.prisme_1 || '0.0';
        document.getElementById('od-b1').innerText = cmd.oeil_droit.base_1 || '0';
        document.getElementById('od-p2').innerText = cmd.oeil_droit.prisme_2 || cmd.oeil_droit.prism2 || '0.0';
        document.getElementById('od-b2').innerText = cmd.oeil_droit.base_2 || cmd.oeil_droit.prbase2 || '0';
        document.getElementById('od-dia').innerText = cmd.oeil_droit.diametre || cmd.oeil_droit.diam1 || '—';
        
        document.getElementById('morpho-od-ecart').innerText = cmd.oeil_droit.ecart_pupillaire ? cmd.oeil_droit.ecart_pupillaire + " mm" : "—";
        document.getElementById('morpho-od-haut').innerText = cmd.oeil_droit.hauteur ? cmd.oeil_droit.hauteur + " mm" : "—";
    } else {
        document.getElementById('panel-od-row').style.display = 'none';
        document.getElementById('morpho-od-ecart').innerText = "—";
        document.getElementById('morpho-od-haut').innerText = "—";
    }

    // Traitement Données Œil Gauche
    if (cmd.oeil_gauche) {
        document.getElementById('panel-og-row').style.display = 'grid';
        document.getElementById('og-sph').innerText = cmd.oeil_gauche.sphere || '0.00';
        document.getElementById('og-cyl').innerText = cmd.oeil_gauche.cylindre || '0.00';
        document.getElementById('og-axe').innerText = cmd.oeil_gauche.axe || '0';
        document.getElementById('og-add').innerText = cmd.oeil_gauche.addition || '0.00';
        document.getElementById('og-p1').innerText = cmd.oeil_gauche.prisme_1 || '0.0';
        document.getElementById('og-b1').innerText = cmd.oeil_gauche.base_1 || '0';
        document.getElementById('og-p2').innerText = cmd.oeil_gauche.prisme_2 || cmd.oeil_gauche.prism2 || '0.0';
        document.getElementById('og-b2').innerText = cmd.oeil_gauche.base_2 || cmd.oeil_gauche.prbase2 || '0';
        document.getElementById('og-dia').innerText = cmd.oeil_gauche.diametre || cmd.oeil_gauche.diam1 || '—';
        
        document.getElementById('morpho-og-ecart').innerText = cmd.oeil_gauche.ecart_pupillaire ? cmd.oeil_gauche.ecart_pupillaire + " mm" : "—";
        document.getElementById('morpho-og-haut').innerText = cmd.oeil_gauche.hauteur ? cmd.oeil_gauche.hauteur + " mm" : "—";
    } else {
        document.getElementById('panel-og-row').style.display = 'none';
        document.getElementById('morpho-og-ecart').innerText = "—";
        document.getElementById('morpho-og-haut').innerText = "—";
    }

    // Traitements additionnels et suppléments verres
    const containerSupps = document.getElementById('panel-supplements');
    if (containerSupps) {
        containerSupps.innerHTML = '';
        const allSupps = [...(cmd.oeil_droit?.supplements || []), ...(cmd.oeil_gauche?.supplements || [])];
        const uniques = [...new Set(allSupps)];

        if (uniques.length > 0) {
            uniques.forEach(s => {
                containerSupps.innerHTML += `<span class="bg-[#f5f5f7] text-[#1d1d1f] border border-[#e8e8ed] px-2.5 py-1 rounded-lg text-[11px] font-medium font-mono">${s}</span>`;
            });
        } else {
            containerSupps.innerHTML = `<span class="text-gray-400 italic text-xs">Aucun traitement additionnel détecté.</span>`;
        }
    }

    const sidePanel = document.getElementById('side-panel');
    if (sidePanel) sidePanel.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

/**
 * Referme le volet technique latéral
 */
function closeSidePanel() {
    const sidePanel = document.getElementById('side-panel');
    if (sidePanel) sidePanel.classList.add('hidden');
}

/**
 * Déconnexion de l'espace de suivi
 */
function logout() {
    window.removeEventListener('scroll', handleScrollLoad);
    localStorage.removeItem('v2i_authenticated');
    localStorage.removeItem('v2i_client_id');
    localStorage.removeItem('v2i_cosium_code');
    window.location.href = './login.html';
}

// --- EXPOSITION DES FONCTIONS AU CONTEXTE GLOBAL (Pour attributs HTML onclick) ---
window.openSidePanel = openSidePanel;
window.closeSidePanel = closeSidePanel;
window.logout = logout;
