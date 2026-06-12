document.addEventListener('DOMContentLoaded', () => {
    // Initialisation des icônes Lucide
    lucide.createIcons();

    // Vérification de la session utilisateur
    const sessionData = localStorage.getItem('v2i_session');
    if (!sessionData) {
        window.location.href = 'index.html';
        return;
    }

    const session = JSON.parse(sessionData);
    
    // Injection du nom ou numéro du magasin dans le badge de la barre de navigation
    const storeNameEl = document.getElementById('store-name');
    if (storeNameEl) {
        storeNameEl.textContent = `Magasin : ${session.nom_magasin || session.username}`;
    }

    // Chargement du flux d'actualités
    chargerActualites();
});

/**
 * Gère la déconnexion et redirige vers la page d'identification
 */
function logout() {
    localStorage.removeItem('v2i_session');
    window.location.href = 'index.html';
}

/**
 * Récupère les actualités d'Acuite.fr via le endpoint de l'API pour contourner CORS
 */
async function chargerActualites() {
    const blocActualites = document.getElementById('bloc-actualites');
    if (!blocActualites) return;

    try {
        const response = await fetch('/api/actualites');
        if (!response.ok) throw new Error('Erreur lors de la récupération du flux');
        
        const articles = await response.json();
        
        if (articles.length === 0) {
            blocActualites.innerHTML = '<p class="text-xs text-gray-500 text-center p-4">Aucune actualité disponible pour le moment.</p>';
            return;
        }

        blocActualites.innerHTML = articles.map(article => `
            <a href="${article.link}" target="_blank" class="block p-2.5 rounded-lg hover:bg-[#f5f5f7] transition-colors border-b border-gray-100 last:border-0 group no-underline">
                <h4 class="text-xs font-semibold text-[#1d1d1f] group-hover:text-[#0066cc] line-clamp-2 transition-colors">
                    ${article.title}
                </h4>
                <span class="text-[10px] text-[#86868b] block mt-1">${article.date}</span>
            </a>
        `).join('');

    } catch (error) {
        console.error('Erreur flux actualités:', error);
        blocActualites.innerHTML = `
            <p class="text-xs text-[#ff3b30] text-center p-4 bg-[#ffebe6] rounded-xl border border-[#ffcfc6]">
                Échec du chargement des actualités.
            </p>
        `;
    }
}
