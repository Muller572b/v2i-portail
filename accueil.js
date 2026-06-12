// --- ACCUEIL.JS ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Vérification de la session (Le Gardien)
    const sessionData = localStorage.getItem('v2i_session');
    
    if (!sessionData) {
        window.location.href = 'login.html'; // Correction : login.html au lieu de index.html
        return;
    }

    const session = JSON.parse(sessionData);

    // 2. Affichage des infos du magasin
    const storeNameEl = document.getElementById('store-name');
    if (storeNameEl) {
        storeNameEl.innerText = `Magasin : ${session.nom_magasin} (${session.code_cosium})`;
    }

    // 3. Initialisation des icônes Lucide
    if (window.lucide) {
        lucide.createIcons();
    }
});

// 4. Fonction de déconnexion (rattachée à window pour le onclick du HTML)
window.logout = function() {
    localStorage.removeItem('v2i_session');
    window.location.href = 'login.html'; // Correction : login.html au lieu de index.html
};
