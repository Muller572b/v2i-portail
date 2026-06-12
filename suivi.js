// --- SUIVI.JS ---

let currentStoreId = null;
let currentCosiumCode = null;
let storeEncours = [];
let storeArchives = [];
let autoArchivesIncluded = false;
let loadedYears = [];
let isLoadingArchives = false;
let searchTimeout = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Vérification de la session
    const sessionData = localStorage.getItem('v2i_session');
    
    if (!sessionData) {
        window.location.href = 'index.html';
        return;
    }

    const session = JSON.parse(sessionData);
    currentStoreId = session.username;
    currentCosiumCode = session.code_cosium;

    const storeBadge = document.getElementById('store-badge');
    if (storeBadge) {
        storeBadge.innerText = `Magasin : ${session.nom_magasin} (${currentCosiumCode})`;
    }

    // Écouteurs d'événements
    document.getElementById('search-verres').addEventListener('input', handleSearchInput);
    document.getElementById('date-debut').addEventListener('change', handleDateBoundsChange);
    document.getElementById('date-fin').addEventListener('change', handleDateBoundsChange);
    window.addEventListener('scroll', handleScrollLoad);

    if (window.lucide) lucide.createIcons();

    await chargerCommandesEncours();
});

function logout() {
    localStorage.removeItem('v2i_session');
    window.location.href = 'index.html';
}

async function chargerCommandesEncours() {
    if (!currentStoreId) return;
    const urlJsonEncours = `https://raw.githubusercontent.com/Muller572b/v2i-portail/main/data_magasins/encours_${currentStoreId}.json`;
    
    try {
        const response = await fetch(urlJsonEncours);
        if (!response.ok) throw new Error();
        const data = await response.json();
        storeEncours = data.commandes_en_cours || [];
        renderVerres();
    } catch (err) {
        const tbody = document.getElementById('verres-table-body');
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-12 text-center text-[#ff3b30] font-medium bg-white">Échec de la récupération de vos commandes actives.</td></tr>`;
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
            
            const existingIds = new Set(storeArchives.map(existing => String(existing.ord_numb || existing.id_bl_v2i || '').trim()));

            nouvellesCommandes.forEach(cmd => {
                const idCmdNouvelle = String(cmd.ord_numb || cmd.id_bl_v2i || '').trim();
                if (!existingIds.has(idCmdNouvelle)) {
                    storeArchives.push(cmd);
                    existingIds.add(idCmdNouvelle);
                }
            });

            const banner = document.getElementById('archive-status-banner');
            const bannerText = document.getElementById('archive-status-text');
            if (banner && bannerText) {
                banner.classList.remove('hidden');
                bannerText.innerText = `Archives synchronisées jusqu'en ${Math.max(...loadedYears)}. Total : ${storeArchives.length} commande(s).`;
            }
        }
    } catch (e) {
        console.log(`Pas d'archive pour ${year}`);
    }
}

function handleScrollLoad() {
    if (autoArchivesIncluded || isLoadingArchives) return;
    if ((window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 100) {
        autoArchivesIncluded = true;
        isLoadingArchives = true;
        loadArchiveYear(new Date().getFullYear()).finally(() => {
            isLoadingArchives = false;
            renderVerres();
        });
    }
}

async function handleDateBoundsChange() {
    const dateDebutVal = document.getElementById('date-debut').value;
    const dateFinVal = document.getElementById('date-fin').value;
    
    if (!dateDebutVal || dateDebutVal.length < 10 || isLoadingArchives) {
        renderVerres();
        return;
    }

    const anneeSelectionneeDebut = new Date(dateDebutVal).getFullYear();
    const currentYear = new Date().getFullYear();
    let anneeSelectionneeFin = dateFinVal ? new Date(dateFinVal).getFullYear() : currentYear;
    
    const anneeMaxABoucler = Math.max(anneeSelectionneeFin, currentYear);

    if (anneeSelectionneeDebut <= anneeMaxABoucler && (anneeMaxABoucler - anneeSelectionneeDebut) < 10) {
        isLoadingArchives = true;
        const anneesACharger = [];
        for (let y = anneeSelectionneeDebut; y <= anneeMaxABoucler; y++) anneesACharger.push(y);

        try {
            await Promise.all(anneesACharger.map(year => loadArchiveYear(year)));
            autoArchivesIncluded = true;
        } finally {
            isLoadingArchives = false;
        }
    }
    renderVerres();
}

function handleSearchInput() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        const searchValue = document.getElementById('search-verres').value.trim();
        if (searchValue.length >= 5 && !isNaN(searchValue.replace(/^[a-zA-Z]/, ''))) {
            const currentYear = new Date().getFullYear();
            if (!loadedYears.includes(currentYear)) {
                isLoadingArchives = true;
                try {
                    await Promise.all([loadArchiveYear(currentYear), loadArchiveYear(currentYear - 1)]);
                    autoArchivesIncluded = true;
                } finally {
                    isLoadingArchives = false;
                }
            }
        }
        renderVerres();
    }, 350);
}

function parseDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split(' ')[0].split('/');
    if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]);
    return null;
}

function renderVerres() {
    const tbody = document.getElementById('verres-table-body');
    const search = document.getElementById('search-verres').value.toLowerCase().trim();
    const dateDebutVal = document.getElementById('date-debut').value;
    const dateFinVal = document.getElementById('date-fin').value;
    
    let dateDebutFilter = null;
    if (dateDebutVal) {
        const p = dateDebutVal.split('-');
        if (p.length === 3) dateDebutFilter = new Date(p[0], p[1] - 1, p[2], 0, 0, 0, 0);
    }

    let dateFinFilter = null;
    if (dateFinVal) {
        const p = dateFinVal.split('-');
        if (p.length === 3) dateFinFilter = new Date(p[0], p[1] - 1, p[2], 23, 59, 59, 999);
    }

    const inclureArchives = autoArchivesIncluded || dateDebutFilter !== null || dateFinFilter !== null;
    
    let donneesAAfficher = storeEncours.map(item => ({ ...item, isArchive: false }));
    if (inclureArchives) {
        donneesAAfficher = donneesAAfficher.concat(storeArchives.map(item => ({ ...item, isArchive: true })));
    }

    const uniquesMap = new Map();
    donneesAAfficher.forEach(item => {
        const idUnique = String(item.id_commande_v2i || item.ord_numb || item.id_bl_v2i).trim();
        if (idUnique && (!uniquesMap.has(idUnique) || item.isArchive)) {
            uniquesMap.set(idUnique, item);
        }
    });
    
    const donneesFiltrees = Array.from(uniquesMap.values()).filter(v => {
        if (!v) return false;
        const idCmd = String(v.id_commande_v2i || v.ord_numb || v.id_bl_v2i || '').trim();
        const statut = v.statut_affichage || v.statut_final || '';
        
        const texte = `${v.patient || ''} ${idCmd} ${v.job_cosium || ''} ${v.date_entree || ''} ${statut}`.toLowerCase();
        if (search && !texte.includes(search)) return false;

        const dateSaisie = parseDate(v.date_entree);
        if (dateSaisie) {
            if (dateDebutFilter && dateSaisie < dateDebutFilter) return false;
            if (dateFinFilter && dateSaisie > dateFinFilter) return false;
        } else if (dateDebutFilter || dateFinFilter) return false;

        return true;
    });

    if (donneesFiltrees.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-12 text-center text-[#86868b] font-medium bg-white">Aucun enregistrement trouvé.</td></tr>`;
        return;
    }

    let rowsHtml = [];
    donneesFiltrees.slice(0, 60).forEach(v => {
        const idCommande = String(v.id_commande_v2i || v.ord_numb || v.id_bl_v2i || '').trim();
        const statutFournisseur = v.statut_affichage || v.statut_final || '—';
        const cibleVerre = v.oeil_droit || v.oeil_gauche;
        const listeSupplements = cibleVerre?.supplements || [];
        const typeVerre = cibleVerre?.verre || v.type_commande || 'Verre V2i';
        
        let htmlSupps = `<div class="font-semibold text-[#1d1d1f] text-xs">${typeVerre}</div>`;
        if (listeSupplements.length > 0) {
            htmlSupps += `<div class="flex flex-col gap-0.5 text-[11px] text-gray-500 font-medium mt-1 leading-relaxed">
                ${listeSupplements.slice(0, 3).map(s => `<span>• ${s}</span>`).join('')}
            </div>`;
        }

        let livraison = v.statut && String(v.statut).toLowerCase().includes('livraison') ? String(v.statut).trim() 
                      : (v.date_livraison_prevue || v.date_expedition || 'En calcul');

        const estExpedie = String(statutFournisseur).toLowerCase().includes('expédi') || String(statutFournisseur).toLowerCase().includes('expedi');
        
        // URL eBL dynamique avec le format validé : "alias_magasin_numerobl"
        const urlEbl = `https://raw.githubusercontent.com/Muller572b/v2i-portail/main/eBLcertifie/${currentStoreId}_${idCommande}.pdf`;

        rowsHtml.push(`
            <tr class="hover:bg-[#f5f5f7]/60 transition-colors align-middle font-sans text-xs bg-white">
                <td class="px-6 py-4">
                    <div class="font-bold text-[#1d1d1f] text-sm tracking-tight uppercase">${v.patient || '—'}</div>
                    <div class="text-[11px] text-[#86868b] font-medium font-mono mt-0.5">Job: ${v.job_cosium || '—'}</div>
                </td>
                <td class="px-6 py-4">${htmlSupps}</td> 
                <td class="px-6 py-4 font-mono">${v.date_entree || '—'}</td>
                <td class="px-6 py-4 font-mono font-bold">${statutFournisseur}</td>
                <td class="px-6 py-4 font-mono font-bold text-[#ff9500] bg-[#fff5e6]/30 text-sm">${livraison}</td>
                <td class="px-6 py-4 font-mono font-bold">${idCommande}</td>
                <td class="px-6 py-4">
                    <div class="flex items-center justify-center gap-2">
                        <button onclick="openSidePanel('${idCommande}')" class="p-2 text-[#86868b] hover:text-[#0066cc] bg-[#f5f5f7] rounded-xl cursor-pointer">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                        ${estExpedie ? `
                            <a href="${urlEbl}" target="_blank" class="px-3 py-1.5 bg-[#ff3b30] hover:bg-[#e03126] text-white font-bold rounded-xl cursor-pointer flex items-center gap-1.5 transition-colors text-[11px] tracking-wide">
                                <span>eBL</span> <i data-lucide="download" class="w-3.5 h-3.5"></i>
                            </a>
                        ` : `<div class="w-14 h-8"></div>`}
                    </div>
                </td>
            </tr>
        `);
    });
    
    tbody.innerHTML = rowsHtml.join('');
    if (window.lucide) lucide.createIcons();
}

function openSidePanel(idCommande) {
    const cmd = [...storeEncours, ...storeArchives].find(c => String(c.id_commande_v2i || c.ord_numb || c.id_bl_v2i).trim() === String(idCommande).trim());
    if (!cmd) return;
    
    document.getElementById('panel-patient').innerText = cmd.patient;
    document.getElementById('panel-bl').innerText = "N° DE COMMANDE : " + (cmd.id_commande_v2i || cmd.ord_numb || cmd.id_bl_v2i);
    document.getElementById('panel-cosium-id').innerText = cmd.job_cosium || "Non spécifié";
    
    const fillOeil = (oeilData, prefix) => {
        if (oeilData) {
            document.getElementById(`panel-${prefix}-row`).style.display = 'block';
            ['sph', 'cyl', 'axe', 'add', 'p1', 'b1', 'p2', 'b2', 'dia'].forEach(attr => {
                const mapping = {
                    sph: 'sphere', cyl: 'cylindre', axe: 'axe', add: 'addition', 
                    p1: 'prisme_1', b1: 'base_1', p2: 'prisme_2', b2: 'base_2', dia: 'diametre'
                };
                const val = oeilData[mapping[attr]] || oeilData[attr === 'p2' ? 'prism2' : attr === 'b2' ? 'prbase2' : attr === 'dia' ? 'diam1' : mapping[attr]];
                const el = document.getElementById(`${prefix}-${attr}`);
                if(el) el.innerText = val || (['p1','b1','p2','b2','dia'].includes(attr) ? '—' : '0.00');
            });
            document.getElementById(`morpho-${prefix}-ecart`).innerText = oeilData.ecart_pupillaire ? oeilData.ecart_pupillaire + " mm" : "—";
            document.getElementById(`morpho-${prefix
