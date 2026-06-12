document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('documentsContainer');
    const searchInput = document.getElementById('docSearch');
    const filterButtons = document.querySelectorAll('.filter-btn');

    // Définition de la liste des documents stockés (reproduisant vos données réelles)
    const documentsData = [
        {
            id: 1,
            type: "image",
            title: "Diving GLARE-NO-GLARE",
            category: "Polarisant",
            fileUrl: "docs/diving_glare_no_glare.jpg"
        },
        {
            id: 2,
            type: "pdf",
            title: "NuPolar Leaflet 100x210 4-page PRINT FRE",
            category: "Polarisant",
            fileUrl: "docs/nupolar_leaflet_100x210.pdf"
        },
        {
            id: 3,
            type: "pdf",
            title: "NuPolar Advertising A4 PRINT FRE",
            category: "Polarisant",
            fileUrl: "docs/nupolar_advertising_a4.pdf"
        }
    ];

    let currentFilter = 'all';
    let searchQuery = '';

    // Fonction de rendu principal de l'interface graphique
    function renderDocuments() {
        container.innerHTML = '';

        // Filtrage croisé (recherche par texte + type de document)
        const filteredDocs = documentsData.filter(doc => {
            const matchesSearch = doc.title.toLowerCase().includes(searchQuery) || 
                                  doc.category.toLowerCase().includes(searchQuery);
            const matchesFilter = currentFilter === 'all' || doc.type === currentFilter;
            
            return matchesSearch && matchesFilter;
        });

        // Gestion de la liste vide
        if (filteredDocs.length === 0) {
            container.innerHTML = `<div class="no-result">Aucun document ne correspond à vos critères de recherche.</div>`;
            return;
        }

        // Génération de chaque bloc carte
        filteredDocs.forEach(doc => {
            const card = document.createElement('div');
            card.className = 'doc-card';
            
            // Assignation de la classe CSS du badge selon le format de fichier
            const badgeClass = doc.type === 'pdf' ? 'badge-pdf' : 'badge-image';

            card.innerHTML = `
                <span class="doc-badge ${badgeClass}">${doc.type}</span>
                <h3 class="doc-title">${escapeHtml(doc.title)}</h3>
                <span class="doc-category">${escapeHtml(doc.category)}</span>
                
                <div class="doc-actions">
                    <a href="${doc.fileUrl}" download class="btn-action btn-download">
                        📥 Télécharger
                    </a>
                    <a href="${doc.fileUrl}" target="_blank" class="btn-action btn-preview">
                        Aperçu ❯
                    </a>
                </div>
            `;
            container.appendChild(card);
        });
    }

    // Gestionnaire de l'événement de saisie dans le champ recherche
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderDocuments();
    });

    // Gestionnaire des boutons de filtrage (Tous, PDF, Images)
    filterButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            
            currentFilter = e.target.getAttribute('data-filter');
            renderDocuments();
        });
    });

    // Protection contre les failles d'injection (XSS)
    function escapeHtml(str) {
        if (!str) return '';
        return str.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Premier affichage initial à l'ouverture de l'application
    renderDocuments();
});
