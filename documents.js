document.addEventListener('DOMContentLoaded', () => {
    // Récupération des éléments du DOM
    const container = document.getElementById('documentsContainer');
    const searchInput = document.getElementById('docSearch');
    const filterButtons = document.querySelectorAll('.filter-btn');

    // Récupération automatique du code magasin connecté stocké lors du login
    // Si aucun code n'est trouvé, on applique une chaîne vide par sécurité
    const codeMagasinConnecte = localStorage.getItem('v2i_client_id') || '';

    // Initialisation de la variable globale qui contiendra les données du fichier JSON
    let documentsData = [];
    let currentFilter = 'all';
    let searchQuery = '';

    // --- 1. CHARGEMENT DYNAMIQUE DES DONNÉES DEPUIS LE FICHIER GENERÉ ---
    function loadDocuments() {
        fetch('documents.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Impossible de charger le fichier d\'index des documents.');
                }
                return response.json();
            })
            .then(data => {
                documentsData = data; // Stockage des documents récupérés
                renderDocuments();    // Premier affichage de la grille
            })
            .catch(error => {
                console.error('Erreur:', error);
                container.innerHTML = `<div class="no-result text-red-500">Erreur lors du chargement des documents. Veuillez relancer le scanner.</div>`;
            });
    }

    // --- 2. FONCTION DE RENDU PRINCIPAL DE L'INTERFACE ---
    function renderDocuments() {
        container.innerHTML = '';

        // Filtrage croisé : Droits d'accès Magasin + Recherche textuelle + Filtre par type
        const filteredDocs = documentsData.filter(doc => {
            // SÉCURITÉ : Le magasin a accès uniquement si le doc est public OU si le code correspond au dossier v2i
            const aAcces = doc.code_magasin === 'public' || doc.code_magasin === codeMagasinConnecte;
            if (!aAcces) return false;

            // Filtre textuel (recherche sur le titre ou la catégorie)
            // Adaptation aux clés du script Python : "titre" et "categorie"
            const matchesSearch = doc.titre.toLowerCase().includes(searchQuery) || 
                                  doc.categorie.toLowerCase().includes(searchQuery);
                                  
            // Filtre par boutons (Tous, PDF, Images, Archives)
            const matchesFilter = currentFilter === 'all' || doc.type === currentFilter;
            
            return matchesSearch && matchesFilter;
        });

        // Gestion de l'affichage si aucun document ne correspond
        if (filteredDocs.length === 0) {
            container.innerHTML = `<div class="no-result">Aucun document ne correspond à vos critères de recherche.</div>`;
            return;
        }

        // Génération dynamique et injection des cartes HTML
        filteredDocs.forEach(doc => {
            const card = document.createElement('div');
            card.className = 'doc-card';
            
            // Assignation de la classe CSS du badge selon le type détecté par Python (pdf, image, archive)
            let badgeClass = 'badge-pdf';
            if (doc.type === 'image') badgeClass = 'badge-image';
            if (doc.type === 'archive') badgeClass = 'badge-archive';

            // Injection de la structure avec les correspondances de clés Python ("url", "titre", "categorie")
            card.innerHTML = `
                <span class="doc-badge ${badgeClass}">${doc.type}</span>
                <h3 class="doc-title">${escapeHtml(doc.titre)}</h3>
                <span class="doc-category">${escapeHtml(doc.categorie)}</span>
                
                <div class="doc-actions">
                    <a href="${doc.url}" download class="btn-action btn-download">
                        📥 Télécharger
                    </a>
                    <a href="${doc.url}" target="_blank" class="btn-action btn-preview">
                        Aperçu ❯
                    </a>
                </div>
            `;
            container.appendChild(card);
        });
    }

    // --- 3. GESTIONNAIRES D'ÉVÉNEMENTS (LISTENERS) ---

    // Écouteur sur la barre de recherche textuelle
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderDocuments();
    });

    // Écouteur sur les boutons de filtrage
    filterButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            // Gestion visuelle de la classe active sur les boutons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            
            // Récupération du type de filtre et actualisation
            currentFilter = e.target.getAttribute('data-filter');
            renderDocuments();
        });
    });

    // Éviter les attaques par injection (XSS) dans le DOM
    function escapeHtml(str) {
        if (!str) return '';
        return str.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Lancement initial du script au chargement de la page
    loadDocuments();
});
