let currentStoreId = null;
let currentCosiumCode = null;
let storeEncours = [];
let storeArchives = []; 
let loadedYears = []; 
let isLoadingArchives = false; 
let maxVisibleItems = 60;
let autoArchivesIncluded = false; // 👈 AJOUT : Déclaration indispensable

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
            currentCosiumCode = cosiumCode; // Sauvegarde le code magasin (ex: BFO)
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

            // 🚀 AJOUT : On force le chargement immédiat de l'année en cours pour remplir l'écran
            const anneeActuelle = new Date().getFullYear();
            isLoadingArchives = true;
            loadArchiveYear(anneeActuelle).then(() => {
                isLoadingArchives = false;
                renderVerres(); // Re-calcul et affichage avec les archives fraîches
            }).catch(() => { 
                isLoadingArchives = false; 
            });
        } // <-- L'accolade manquante a été ajoutée ici pour fermer le "if"
    } catch (err) {
        errorEl.innerText = "Erreur de connexion : Identifiant incorrect ou introuvable.";
        errorEl.classList.remove('hidden');
    }
}

async function chargerFluxRSS() {
    const conteneur = document.getElementById('bloc-actualites');
    if (!conteneur) return; 

    const urlFlux = "https://www.acuite.fr/rss.xml";
    // Utilisation de corsproxy.io (plus rapide, stable et renvoie directement le XML brut)
    const urlProxy = `https://corsproxy.io/?${encodeURIComponent(urlFlux)}`;

    try {
        const response = await fetch(urlProxy);
        if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
        
        // On récupère directement le texte du XML
        const xmlText = await response.text();
        
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        
        // Sécurité si le XML est malformé
        if (xmlDoc.querySelector("parsererror")) {
            throw new Error("Erreur de lecture du flux XML");
        }

        const items = xmlDoc.querySelectorAll("item");
        if (items.length === 0) throw new Error("Aucun article trouvé");

        let html = '<div class="flex flex-col gap-4 p-2">';
        const articles = Array.from(items).slice(0, 3);
        
        articles.forEach(item => {
            const title = item.querySelector("title")?.textContent || "Article sans titre";
            const link = item.querySelector("link")?.textContent || "#";
            const description = item.querySelector("description")?.textContent || "";

            // Nettoyage des éventuelles balises HTML résiduelles dans la description
            const cleanDesc = description.replace(/<\/?[^>]+(>|$)/g, "").trim();

            html += `
                <div class="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                    <a href="${link}" target="_blank" class="font-semibold text-sm text-blue-600 hover:text-blue-800 hover:underline block mb-1">
                        ${title}
                    </a>
                    <p class="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                        ${cleanDesc}
                    </p>
                </div>
            `;
        });
        html += '</div>';

        conteneur.innerHTML = html;
    } catch (error) {
        console.error("Détail de l'erreur RSS :", error);
        
        // Version de secours "élégante" : si le proxy flanche, on propose un lien direct
        conteneur.innerHTML = `
            <div class="text-center p-4">
                <p class="text-xs text-gray-400 mb-2">Flux en direct indisponible.</p>
                <a href="https://www.acuite.fr" target="_blank" class="text-xs text-blue-500 hover:underline font-medium inline-flex items-center gap-1">
                    Ouvrir Acuité.fr ↗
                </a>
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', chargerFluxRSS);


async function loadArchiveYear(year) {
    if (!year || isNaN(year) || loadedYears.includes(year) || !currentStoreId) return;
    loadedYears.push(year);

    // Corrigé
    const urlJsonArchive = `https://raw.githubusercontent.com/Muller572b/v2i-portail/main/data_archives/${year}/archive_${currentStoreId}.json`;
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
        console.log(`Pas d'archive disponie pour l'année ${year} ou ce magasin.`);
    }
}

function handleScrollLoad() {
    if (document.getElementById('content-verres').classList.contains('hidden')) return;
    if (isLoadingArchives) return;

    // Détecte si on est proche du bas de la page
    if ((window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 150) {
        
        // Étape A : Si on a des données chargées mais non affichées à cause de la limite, on augmente la limite
        // On vérifie grossièrement si le tableau actuel contient potentiellement plus de données
        const totalDataLength = storeEncours.length + storeArchives.length;
        if (maxVisibleItems < totalDataLength) {
            maxVisibleItems += 60;
            renderVerres();
            return; // On a juste étendu l'affichage, pas besoin de fetch GitHub pour l'instant
        }

        // Étape B : Si on a déjà tout affiché de ce qu'on avait en mémoire, on va chercher l'année précédente !
        isLoadingArchives = true;
        
        // Calcul de la prochaine année à charger
        const currentYear = new Date().getFullYear();
        let yearToLoad = currentYear;

        if (loadedYears.length > 0) {
            yearToLoad = Math.min(...loadedYears) - 1; // Prend l'année la plus ancienne chargée et fait -1
        }

        // Sécurité pour ne pas remonter à l'âge de pierre (ex: pas plus loin que 2023)
        if (yearToLoad < 2023) {
            isLoadingArchives = false;
            return;
        }

        console.log(`📜 Scroll bas de page : Tentative de chargement de l'année ${yearToLoad}`);
        
        loadArchiveYear(yearToLoad).then(() => {
            isLoadingArchives = false;
            maxVisibleItems += 60; // Donne de l'espace pour afficher la nouvelle année reçue
            renderVerres();
        }).catch(() => { 
            isLoadingArchives = false; 
        });
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

let searchTimeout = null;

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

    const auMaximum = donneesFiltrees.slice(0, maxVisibleItems);
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

        const codeMagasinActuel = currentCosiumCode || "A36"; 
        
        // Extraction de l'année depuis l'idCommande (ex: "260602..." -> "2026")
        const anneeBL = "20" + idCommande.substring(0, 2);
        
        // URLs corrigées dynamiquement
        const urlEbl = `https://raw.githubusercontent.com/Muller572b/v2i-portail/main/eBLcertifie/${anneeBL}/${currentStoreId}/_${codeMagasinActuel}_BL_${idCommande}.pdf`;
        const urlCdv = `https://raw.githubusercontent.com/Muller572b/v2i-portail/main/cartedevue/${anneeBL}/${currentStoreId}/Carte_Vue_${currentStoreId}_${idCommande}.pdf`;

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
                            <a href="${urlEbl}" target="_blank" class="px-2.5 py-1.5 bg-[#ff3b30] hover:bg-[#e03126] text-white font-bold rounded-xl cursor-pointer flex items-center gap-1 transition-colors text-[11px] tracking-wide" title="Télécharger le eBL">
                                <span>eBL</span>
                                <i data-lucide="download" class="w-3.5 h-3.5"></i>
                            </a>
                            <a href="${urlCdv}" target="_blank" class="px-2.5 py-1.5 bg-[#0066cc] hover:bg-[#0052a3] text-white font-bold rounded-xl cursor-pointer flex items-center gap-1 transition-colors text-[11px] tracking-wide" title="Télécharger la Carte de vue">
                                <span>CDV</span>
                                <i data-lucide="download" class="w-3.5 h-3.5"></i>
                            </a>
                        ` : `
                            <div class="w-24 h-8"></div> `}
                    </div>
                </td>
            </tr>
        `);
    });
    
    tbody.innerHTML = rowsHtml.join('');
    if (window.lucide) lucide.createIcons();
}

function handleSearchInput() {
    clearTimeout(searchTimeout);
    
    searchTimeout = setTimeout(async () => {
        const searchValue = document.getElementById('search-verres').value.trim();
        
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
    
    const contentElement = document.getElementById('content-' + tabId);
    if (contentElement) {
        contentElement.classList.remove('hidden');
    } else {
        console.warn(`Attention : L'élément HTML id="content-${tabId}" est introuvable.`);
    }
    
    const tabButtonElement = document.getElementById('tab-' + tabId);
    if (tabButtonElement) {
        tabButtonElement.className = "tab-btn px-4 h-14 text-sm font-medium border-b-2 border-[#0066cc] text-[#0066cc] flex items-center gap-2 cursor-pointer transition-all";
    }
    
    if (tabId === 'verres') {
        if (typeof renderVerres === 'function') {
            renderVerres();
        }
    }
    
    if (tabId === 'documents') {
        if (typeof renderDocuments === 'function') {
            renderDocuments();
        }
    }
}

async function renderDocuments() {
    const container = document.getElementById('documents-grid');
    if (!container) return;

    container.innerHTML = "";

    try {
        const response = await fetch('./documents.json');
        if (!response.ok) throw new Error("Fichier index introuvable");
        
        const catalogue = await response.json();

        if (catalogue.length === 0) {
            container.innerHTML = "<p class='text-sm text-[#86868b] col-span-3 text-center py-8'>Aucun document disponible.</p>";
            return;
        }

        catalogue.forEach(item => {
            const card = document.createElement('div');
            card.className = "bg-white p-5 rounded-2xl border border-[#e8e8ed] shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group relative";
            
            const estPdf = item.type === "pdf";
            const icone = estPdf 
                ? `<svg class="w-7 h-7 text-[#ff453a]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>`
                : `<svg class="w-7 h-7 text-[#30d158]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>`;
            
            const badgeClass = estPdf ? "bg-[#ff453a]/10 text-[#ff453a]" : "bg-[#30d158]/10 text-[#30d158]";

            card.innerHTML = `
                <div class="flex items-start gap-4">
                    <div class="p-3 bg-[#f5f5f7] rounded-xl flex-shrink-0">
                        ${icone}
                    </div>
                    <div class="flex-1 min-w-0">
                        <span class="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${badgeClass} mb-2">
                            ${item.type}
                        </span>
                        <h3 class="text-sm font-semibold text-[#1d1d1f] line-clamp-2" title="${item.titre}">
                            ${item.titre}
                        </h3>
                        <p class="text-xs text-[#86868b] mt-1">${item.categorie}</p>
                    </div>
                </div>
                <div class="flex justify-between items-center mt-4 pt-2 border-t border-gray-50">
                    <button class="btn-download text-xs font-medium text-[#86868b] hover:text-[#0066cc] flex items-center gap-1 transition-colors py-1 px-2 rounded-lg hover:bg-gray-50">
                        📥 Télécharger
                    </button>
                    <div class="text-xs font-medium text-[#0066cc] group-hover:underline flex items-center">
                        <span>Aperçu</span>
                        <svg class="w-4 h-4 ml-1 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                    </div>
                </div>
            `;

            card.addEventListener('click', () => {
                ouvrirApercu(item.url, item.titre, item.type);
            });

            const btnDownload = card.querySelector('.btn-download');
            btnDownload.addEventListener('click', (e) => {
                e.stopPropagation();
                window.open(item.url, '_blank');
            });

            container.appendChild(card);
        });

    } catch (error) {
        console.error("Erreur de chargement :", error);
        container.innerHTML = "<p class='text-sm text-[#ff453a] col-span-3 text-center py-8'>Erreur de chargement de la bibliothèque.</p>";
    }
}

function ouvrirApercu(url, titre, type) {
    const viewer = document.getElementById('document-viewer');
    const titleEl = document.getElementById('viewer-title');
    const fullscreenBtn = document.getElementById('viewer-fullscreen');
    const contentContainer = document.getElementById('viewer-content');
    
    if (!viewer || !titleEl || !fullscreenBtn || !contentContainer) return;

    titleEl.innerText = titre;
    fullscreenBtn.href = url;

    if (type === 'image') {
        contentContainer.innerHTML = `
            <div class="p-4 flex items-center justify-center w-full h-full">
                <img src="${url}" class="max-w-full max-h-full rounded-xl shadow-md object-contain bg-white">
            </div>`;
    } else {
        contentContainer.innerHTML = `<iframe src="${url}" class="w-full h-full border-0 bg-white"></iframe>`;
    }

    viewer.classList.remove('hidden');
}

function fermerApercu() {
    const viewer = document.getElementById('document-viewer');
    if (viewer) {
        viewer.classList.add('hidden');
    }
    const contentContainer = document.getElementById('viewer-content');
    if (contentContainer) {
        contentContainer.innerHTML = ""; 
    }
}

// Calcule l'épaisseur d'une lentille selon sa puissance sphérique de base
function runCalculation() {
    const sph = parseFloat(document.getElementById('calc-sphere').value) || 0;
    const baseThickness = 2.0;
    const calculated = (Math.abs(sph) * 0.3) + baseThickness;
    document.getElementById('calc-result').innerText = calculated.toFixed(2);
}

function logout() {
    window.removeEventListener('scroll', handleScrollLoad);
    document.getElementById('main-interface').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    currentStoreId = null;
    currentCosiumCode = null;
    storeEncours = [];
    storeArchives = [];
    loadedYears = [];
    autoArchivesIncluded = false;
}

if (window.lucide) {
    lucide.createIcons();
}
