document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('documentsContainer');
    const searchInput = document.getElementById('docSearch');
    const filterButtons = document.querySelectorAll('.filter-btn');

    const codeMagasinConnecte = localStorage.getItem('v2i_client_id') || '';

    let documentsData = [];
    let currentFilter = 'all';
    let searchQuery = '';

    function loadDocuments() {
        fetch('documents.json')
            .then(response => response.ok ? response.json() : Promise.reject())
            .then(data => {
                documentsData = data;
                renderDocuments();
            })
            .catch(error => {
                console.error('Erreur:', error);
                container.innerHTML = `<div class="no-result text-red-500">Erreur lors du chargement.</div>`;
            });
    }

    function renderDocuments() {
        container.innerHTML = '';

        // 1. Filtrage
        const filteredDocs = documentsData.filter(doc => {
            const aAcces = doc.code_magasin === 'public' || doc.code_magasin === codeMagasinConnecte;
            const matchesSearch = doc.titre.toLowerCase().includes(searchQuery) || doc.categorie.toLowerCase().includes(searchQuery);
            const matchesFilter = currentFilter === 'all' || (doc.type === currentFilter || (doc.type === 'LINK' && currentFilter === 'link'));
            return aAcces && matchesSearch && matchesFilter;
        });

        if (filteredDocs.length === 0) {
            container.innerHTML = `<div class="no-result">Aucun document ne correspond à vos critères.</div>`;
            return;
        }

        // 2. Regroupement par catégorie
        const groupedDocs = filteredDocs.reduce((acc, doc) => {
            const cat = doc.categorie || 'Autres';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(doc);
            return acc;
        }, {});

        // 3. Rendu
        Object.keys(groupedDocs).sort().forEach(category => {
            const section = document.createElement('section');
            section.className = 'mb-10';
            section.innerHTML = `<h3 class="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                <i data-lucide="folder-open" class="w-5 h-5 text-[#0066cc]"></i> ${category}
            </h3>`;

            const grid = document.createElement('div');
            grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';

            groupedDocs[category].forEach(doc => {
                const card = document.createElement('div');
                card.className = 'doc-card';
                
                let badgeClass = 'badge-pdf';
                if (doc.type === 'image') badgeClass = 'badge-image';
                else if (doc.type === 'archive') badgeClass = 'badge-archive';
                else if (doc.type === 'LINK') badgeClass = 'badge-link';

                let actionsHTML = (doc.type === 'LINK') 
                    ? `<a href="${doc.url}" target="_blank" class="btn-action btn-visit">🔗 Visiter le site</a>`
                    : `<a href="${doc.url}" download class="btn-action btn-download">📥 Télécharger</a>
                       <a href="${doc.url}" target="_blank" class="btn-action btn-preview">Aperçu ❯</a>`;

                card.innerHTML = `
                    <span class="doc-badge ${badgeClass}">${doc.type}</span>
                    <h3 class="doc-title">${escapeHtml(doc.titre)}</h3>
                    <div class="doc-actions">${actionsHTML}</div>
                `;
                grid.appendChild(card);
            });

            section.appendChild(grid);
            container.appendChild(section);
        });

        // Actualisation des icônes Lucide (une seule fois ici)
        if (window.lucide) lucide.createIcons();
    }

    // --- Événements ---
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
        return str.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    loadDocuments();
});
