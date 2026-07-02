document.addEventListener('DOMContentLoaded', () => {
    // Récupération des éléments du DOM
    const container = document.getElementById('documentsContainer');
    const searchInput = document.getElementById('docSearch');
    const filterButtons = document.querySelectorAll('.filter-btn');

    const codeMagasinConnecte = localStorage.getItem('v2i_client_id') || '';

    let documentsData = [];
    let currentFilter = 'all';
    let searchQuery = '';

    // --- 1. CHARGEMENT DYNAMIQUE ---
    function loadDocuments() {
        // ASSUREZ-VOUS QUE CE CHEMIN EST CORRECT (ex: 'documentcommun/LedPro/documents.json')
        fetch('documents.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Impossible de charger le fichier d\'index.');
                }
                return response.json();
            })
            .then(data => {
                documentsData = data;
                renderDocuments();
            })
            .catch(error => {
                console.error('Erreur:', error);
                container.innerHTML = `<div class="no-result text-red-500">Erreur chargement. Vérifiez le chemin du JSON.</div>`;
            });
    }

    // --- 2. RENDU PRINCIPAL ---
    function renderDocuments() {
        container.innerHTML = '';

        const filteredDocs = documentsData.filter(doc => {
            const aAcces = doc.code_magasin === 'public' || doc.code_magasin === codeMagasinConnecte;
            if (!aAcces) return false;

            const matchesSearch = doc.titre.toLowerCase().includes(searchQuery) || 
                                  doc.categorie.toLowerCase().includes(searchQuery);
            const matchesFilter = currentFilter === 'all' || doc.type === currentFilter;
            
            return matchesSearch && matchesFilter;
        });

        if (filteredDocs.length === 0) {
            container.innerHTML = `<div class="no-result">Aucun document ne correspond à vos critères.</div>`;
            return;
        }

        filteredDocs.forEach(doc => {
            const card = document.createElement('div');
            card.className = 'doc-card';
            
            // Gestion des badges par type
            let badgeClass = 'badge-pdf';
            if (doc.type === 'image') badgeClass = 'badge-image';
            else if (doc.type === 'archive') badgeClass = 'badge-archive';
            else if (doc.type === 'link') badgeClass = 'badge-link'; // Nouveau badge

            // --- Logique d'affichage des boutons selon le type ---
            let actionsHTML = '';
            if (doc.type === 'link') {
                // Si c'est un lien externe
                actionsHTML = `
                    <a href="${doc.url}" target="_blank" class="btn-action btn-visit">
                        🔗 Visiter le site
                    </a>
                `;
            } else {
                // Si c'est un fichier classique
                actionsHTML = `
                    <a href="${doc.url}" download class="btn-action btn-download">
                        📥 Télécharger
                    </a>
                    <a href="${doc.url}" target="_blank" class="btn-action btn-preview">
                        Aperçu ❯
                    </a>
                `;
            }

            card.innerHTML = `
                <span class="doc-badge ${badgeClass}">${doc.type}</span>
                <h3 class="doc-title">${escapeHtml(doc.titre)}</h3>
                <span class="doc-category">${escapeHtml(doc.categorie)}</span>
                <div class="doc-actions">
                    ${actionsHTML}
                </div>
            `;
            container.appendChild(card);
        });
    }

    // --- 3. GESTIONNAIRES D'ÉVÉNEMENTS ---
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderDocuments();
    });

    filterButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.getAttribute('data-filter');
            renderDocuments();
        });
    });

    function escapeHtml(str) {
        if (!str) return '';
        return str.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    loadDocuments();
});
