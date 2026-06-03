let currentStoreId = null;
let storeEncours = [];
let storeArchives = []; 
let autoArchivesIncluded = false; 
let loadedYears = []; 
let isLoadingArchives = false; // Verrou de sécurité global

async function handleLogin(e) {
    e.preventDefault();
    const clientNum = document.getElementById('username').value.replace(/\s+/g, '');
    const cosiumCode = document.getElementById('password').value.replace(/\s+/g, '').toUpperCase();
    const errorEl = document.getElementById('login-error');
    
    const urlJsonEncours = `https://raw.githubusercontent.com/Muller572b/v2i-portail/main/data_magasins/encours_${clientNum}.json`;

    try {
        errorEl.classList.add('hidden');
        const response = await fetch(urlJsonEncours);
        if (!response.ok) throw new Error();
        
        const data = await response.json();

        if (data && data.infos_magasin && data.infos_magasin.code_cosium && 
            cosiumCode === String(data.infos_magasin.code_cosium).replace(/\s+/g, '').toUpperCase()) {
            
            currentStoreId = clientNum;
            storeEncours = data.commandes_en_cours || [];

            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('main-interface').classList.remove('hidden');
            document.getElementById('store-badge').innerText = `Magasin : ${data.infos_magasin.nom} (${cosiumCode})`;
            
            // Réinitialisation globale des filtres
            autoArchivesIncluded = false;
            storeArchives = [];
            loadedYears = [];
            document.getElementById('date-debut').value = '';
            document.getElementById('date-fin').value = '';
            document.getElementById('archive-status-banner').classList.add('hidden');

            renderVerres();
            switchTab('accueil'); 
            
            window.addEventListener('scroll', handleScrollLoad);
        } else {
            errorEl.innerText = "Code Cosium (mot de passe) invalide.";
            errorEl.classList.remove('hidden');
        }
    } catch (err) {
        errorEl.innerText = "Erreur de connexion : Identifiant incorrect ou introuvable.";
        errorEl.classList.remove('hidden');
    }
}

async function loadArchiveYear(year) {
    if (!year || isNaN(year) || loadedYears.includes(year) || !currentStoreId) return;
    loadedYears.push(year);

    const urlJsonArchive = `https://raw.githubusercontent.com/Muller572b/v2i-portail/main/data_archives/${year}/archive_${currentStoreId}.json`;
    try {
        const resp = await fetch(urlJsonArchive);
        if (resp.ok) {
            const archiveData = await resp.json();
            const nouvellesCommandes = archiveData.commandes_expediees || [];
            
            // Map d'identifiants existants pour aller beaucoup plus vite qu'un .some() imbriqué
            const existingIds = new Set(storeArchives.map(existing => String(existing.ord_numb || existing.id_bl_v2i || '').trim()));

            nouvellesCommandes.forEach(cmd => {
                const idCmdNouvelle = String(cmd.ord_numb || cmd.id_bl_v2i || '').trim();
                if (!existingIds.has(idCmdNouvelle)) {
                    storeArchives.push(cmd);
                    existingIds.add(idCmdNouvelle); // Évite les doublons internes
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

function handleScrollLoad() {
    if (document.getElementById('content-verres').classList.contains('hidden')) return;
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
            console.error("Erreur lors du chargement des archives :", err);
        } finally {
            isLoadingArchives = false;
        }
    }
    
    renderVerres();
}

function parseDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split(' ')[0].split('/');
    if (parts.length === 3) {
        return new Date(parts[2], parts[1] - 1, parts[0], 0, 0, 0, 0);
    }
    return null;
}

// Variables globales de contrôle pour la recherche
let searchTimeout = null;

function renderVerres() {
    const tbody = document.getElementById('verres-table-body');
    if (!tbody) return;
    
    // Récupération sécurisée des éléments pour éviter les erreurs "undefined"
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

    // Sécurisation des variables globales au cas où elles ne seraient pas encore définies
    const archivesIncluses = (typeof autoArchivesIncluded !== 'undefined') ? autoArchivesIncluded : false;
    const dataEncours = (typeof storeEncours !== 'undefined' && Array.isArray(storeEncours)) ? storeEncours : [];
    const dataArchives = (typeof storeArchives !== 'undefined' && Array.isArray(storeArchives)) ? storeArchives : [];

    const inclureArchives = archivesIncluses || dateDebutFilter !== null || dateFinFilter !== null;
    
    // Ajout d'un flag pour distinguer les commandes en cours des archives
    let donneesAAfficher = [];
    dataEncours.forEach(item => {
        if (item) donneesAAfficher.push({ ...item, isArchive: false });
    });
    if (inclureArchives) {
        dataArchives.forEach(item => {
            if (item) donneesAAfficher.push({ ...item, isArchive: true });
        });
    }

    // Déduplication performante et sécurisée (priorité au statut archivé si doublon)
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

    // Filtrage des données
    const donneesFiltrees = donneesAAfficher.filter(v => {
        if (!v) return false;
        const idCommande = String(v.id_commande_v2i || v.ord_numb || v.id_bl_v2i || '').trim();
        const statutFournisseur = v.statut_affichage || v.statut_final || '';
        const jobCosium = v.job_cosium || '';
        const patientName = v.patient || '';
        const dateEntree = v.date_entree || '';
        
        const texteRecherche = `${patientName} ${idCommande} ${jobCosium} ${dateEntree} ${statutFournisseur}`.toLowerCase();
        if (search && !texteRecherche.includes(search)) return false;

        // Vérification sécurisée de la fonction de parsing de date
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

    // Si aucun résultat après filtrage
    if (donneesFiltrees.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-12 text-center text-[#86868b] font-medium bg-white">Aucun enregistrement trouvé.</td></tr>`;
        return;
    }

    // Protection mémoire : Max 60 lignes visibles simultanément
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

        // 1. Détermination du statut d'expédition (Insensible à la casse et aux accents)
        const statutClean = String(statutFournisseur).toLowerCase().trim();
        const estExpedie = statutClean.includes('expédi') || statutClean.includes('expedi');

        // 2. Construction dynamique de l'URL conforme à la structure GitHub détectée
        // Modifie la variable prefixeEbl si la date ou l'identifiant de lot change dynamiquement
        const prefixeEbl = "20260603_A36_BL_";
        const urlEbl = `https://raw.githubusercontent.com/Muller572b/v2i-portail/main/eBLCertifie/${currentStoreId}/${prefixeEbl}${idCommande}.pdf`;

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
                    <div class="flex items-center justify-center gap-1.5">
                        <button onclick="openSidePanel('${idCommande}')" class="p-2 text-[#86868b] hover:text-[#0066cc] bg-[#f5f5f7] rounded-xl cursor-pointer" title="Voir les détails">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                        
                        ${estExpedie ? `
                            <a href="${urlEbl}" target="_blank" class="p-2 text-[#86868b] hover:text-[#28a745] bg-[#f5f5f7] rounded-xl cursor-pointer flex items-center justify-center" title="Télécharger le eBL">
                                <i data-lucide="download" class="w-4 h-4"></i>
                            </a>
                        ` : `
                            <div class="w-8 h-8"></div> `}
                    </div>
                </td>
            </tr>
        `);
    });
    
    // Insertion propre dans le DOM
    tbody.innerHTML = rowsHtml.join('');
    if (window.lucide) lucide.createIcons();
}

function handleSearchInput() {
    clearTimeout(searchTimeout);
    
    searchTimeout = setTimeout(async () => {
        const searchValue = document.getElementById('search-verres').value.trim();
        
        // RECHERCHE DIRECTE DANS LES ARCHIVES SI NUMÉRO LONG (Job ou BL)
        if (searchValue.length >= 5 && !isNaN(searchValue.replace(/^[a-zA-Z]/, ''))) {
            const currentYear = new Date().getFullYear();
            
            // Sécurité : On ne lance l'appel que si ces années ne sont pas déjà indexées en mémoire
            if (!loadedYears.includes(currentYear) || !loadedYears.includes(currentYear - 1)) {
                if (!isLoadingArchives) {
                    isLoadingArchives = true;
                    try {
                        await Promise.all([
                            loadArchiveYear(currentYear),
                            loadArchiveYear(currentYear - 1),
                            loadArchiveYear(currentYear - 2) // Optionnel : check aussi l'année d'avant au cas où
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
    }, 350); // Attente de 350ms après la frappe
}

function openSidePanel(idCommande) {
    const toutesLesCommandes = [...storeEncours, ...storeArchives];
    const cmd = toutesLesCommandes.find(c => {
        const idV2i = String(c.id_commande_v2i || c.ord_numb || c.id_bl_v2i || '').trim();
        return idV2i === String(idCommande).trim();
    });
    
    if (!cmd) return;
    
    document.getElementById('panel-patient').innerText = cmd.patient;
    document.getElementById('panel-bl').innerText = "N° DE COMMANDE (BL) : " + (cmd.id_commande_v2i || cmd.ord_numb || cmd.id_bl_v2i);
    document.getElementById('panel-cosium-id').innerText = cmd.job_cosium || "Non spécifié";
    
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

    const containerSupps = document.getElementById('panel-supplements');
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

    document.getElementById('side-panel').classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

function closeSidePanel() {
    document.getElementById('side-panel').classList.add('hidden');
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.className = "tab-btn px-4 h-14 text-sm font-medium border-b-2 border-transparent text-[#86868b] hover:text-[#1d1d1f] flex items-center gap-2 cursor-pointer transition-all";
    });
    document.getElementById('content-' + tabId).classList.remove('hidden');
    document.getElementById('tab-' + tabId).className = "tab-btn px-4 h-14 text-sm font-medium border-b-2 border-[#0066cc] text-[#0066cc] flex items-center gap-2 cursor-pointer transition-all";
    
    if (tabId === 'verres') {
        renderVerres();
    }
}

function runCalculation() {
    const sph = parseFloat(document.getElementById('calc-sphere').value) || 0;
    const baseThickness = 2.0;
    const calculated = (Math.abs(sph) * 0.3) + baseThickness;
    document.getElementById('calc-result').innerText = calculated.toFixed(2);
}

// Fonction de déconnexion
function logout() {
    window.removeEventListener('scroll', handleScrollLoad);
    document.getElementById('main-interface').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    currentStoreId = null;
    storeEncours = [];
    storeArchives = [];
    loadedYears = [];
    autoArchivesIncluded = false;
}

if (window.lucide) lucide.createIcons();
