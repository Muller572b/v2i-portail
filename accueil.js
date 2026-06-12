// --- ACCUEIL.JS ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Vérification de la session (Le Gardien basé sur notre logique verrouillée)
    if (localStorage.getItem('v2i_authenticated') !== 'true') {
        window.location.href = './login.html'; // Sécurisé pour GitHub Pages
        return;
    }

    // 2. Récupération de l'identifiant du magasin connecté
    const clientId = localStorage.getItem('v2i_client_id');

    // Répertoire local pour faire la correspondance et afficher le code Cosium
    const listeMagasins = {
        "1": "DON", "2": "A36", "3": "LUP", "4": "BAB", "6": "LIS", "7": "A67",
        "9": "A40", "10": "BAA", "12": "AOS", "16": "BFO", "18": "ILE", "22": "O2C",
        "23": "COR", "24": "PAA", "25": "PLU", "28": "BOB", "29": "ROC", "31": "LAR",       
        "33": "33", "99": "TEST99", "ADMIN": "COSIUM2026"
    };

    // On récupère le code Cosium associé (ex: "BFO" pour le magasin "16")
    const cosiumCode = listeMagasins[clientId] || "Inconnu";

    // Affichage dynamique des infos du magasin sur l'écran d'accueil
    const storeNameEl = document.getElementById('store-name');
    if (storeNameEl && clientId) {
        storeNameEl.innerText = `Magasin : N° ${clientId} (${cosiumCode})`;
    }

    // 3. Initialisation des icônes Lucide
    if (window.lucide) {
        lucide.createIcons();
    }
});

// 4. Fonction de déconnexion (Nettoyage propre des bonnes clés)
window.logout = function() {
    localStorage.removeItem('v2i_authenticated');
    localStorage.removeItem('v2i_client_id');
    window.location.href = './login.html'; 
};
