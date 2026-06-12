document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('v2i_authenticated') !== 'true') {
        window.location.href = 'login.html';
        return;
    }
    
    // Initialisation des icônes Lucide
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Charger le contenu par défaut
    switchTab('accueil');
});

// 2. Fonctions de navigation
function switchTab(tabId) {
    // Masquer tous les contenus
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('border-[#0066cc]', 'text-[#1d1d1f]'));
    
    // Afficher le contenu sélectionné
    document.getElementById(`content-${tabId}`).classList.remove('hidden');
    
    // Mettre à jour le style du bouton actif
    const tabBtn = document.getElementById(`tab-${tabId}`);
    if (tabBtn) {
        tabBtn.classList.add('border-[#0066cc]', 'text-[#1d1d1f]');
    }
}

// 3. Déconnexion
function logout() {
    localStorage.removeItem('v2i_authenticated');
    window.location.href = 'login.html';
}

// 4. Placeholder pour d'autres fonctions (recherche, calculs, etc.)
function handleSearchInput() {
    console.log("Recherche en cours...");
}

function handleDateBoundsChange() {
    console.log("Dates modifiées");
}

function renderVerres() {
    console.log("Rendu du tableau des verres");
}

function runCalculation() {
    const sphere = document.getElementById('calc-sphere').value;
    document.getElementById('calc-result').innerText = (Math.abs(sphere) * 0.8).toFixed(2);
}

function closeSidePanel() {
    document.getElementById('side-panel').classList.add('hidden');
}

function fermerApercu() {
    document.getElementById('document-viewer').classList.add('hidden');
}
