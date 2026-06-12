// --- ACCUEIL.JS ---

document.addEventListener('DOMContentLoaded', () => {
    // Vérification de la session
    const sessionData = localStorage.getItem('v2i_session');
    
    if (!sessionData) {
        window.location.href = 'index.html'; // Retour au login si non connecté
        return;
    }

    const session = JSON.parse(sessionData);

    // Affichage des infos du magasin
    const storeNameEl = document.getElementById('store-name');
    if (storeNameEl) {
        storeNameEl.innerText = `Magasin : ${session.nom_magasin} (${session.code_cosium})`;
    }

    // Initialisation des icônes
    if (window.lucide) {
        lucide.createIcons();
    }
});

function logout() {
    localStorage.removeItem('v2i_session');
    window.location.href = 'index.html';
}
