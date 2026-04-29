export function createGrid(elementos, found, traducoes) {
    const grid = document.getElementById('periodic-table-grid');
    if (!grid) return;

    grid.innerHTML = '';

    elementos.forEach(el => {
        if (el.position?.x === undefined || el.position?.y === undefined) return;

        const card = document.createElement('div');
        card.className = 'empty-element-card';
        card.setAttribute('data-pos', `${el.position.x}-${el.position.y}`);
        
        card.style.gridColumn = el.position.x;
        card.style.gridRow = el.position.y;

        const idStr = el.id.toString();
        const jaEncontrado = found.some(f => f.id === el.id);
        
        if (jaEncontrado) {
            const nomeTraduzido = traducoes[idStr]?.name || "";
            card.innerHTML = `
                <span class="symbol-display">${el.symbol}</span>
                <span class="name-display">${nomeTraduzido}</span>
            `;
            card.classList.add('element-revealed');
        } else {
            card.innerHTML = `<span class="symbol-display">${el.symbol}</span>`;
        }

        grid.appendChild(card);
    });

    renderTableExtras(grid);
}

function renderTableExtras(grid) {
    const lantPlaceholder = document.createElement('div');
    lantPlaceholder.className = 'lanthanide-placeholder';
    lantPlaceholder.style.gridColumn = "3";
    lantPlaceholder.style.gridRow = "6";
    lantPlaceholder.textContent = "57-71";
    grid.appendChild(lantPlaceholder);

    const actPlaceholder = document.createElement('div');
    actPlaceholder.className = 'actinide-placeholder';
    actPlaceholder.style.gridColumn = "3";
    actPlaceholder.style.gridRow = "7";
    actPlaceholder.textContent = "89-103";
    grid.appendChild(actPlaceholder);
}

export function revealElement(el, traducaoEl) {
    const card = document.querySelector(`[data-pos="${el.position.x}-${el.position.y}"]`);
    
    if (card) {
        card.innerHTML = `
            <span class="symbol-display">${el.symbol}</span>
            <span class="name-display">${traducaoEl.name}</span>
        `;
        card.classList.add('element-revealed');
    }
}

export function populateFilter(elementos, traducoes) {
    const select = document.getElementById('familyFilterSelect');
    if (!select) return;

    select.innerHTML = '<option value="">Todas as Famílias</option>';

    const familiaIds = [...new Set(elementos.map(e => e.metadata.family_id))]
        .filter(id => id && id !== "na" && id !== "");

    const familiasTraduzidas = familiaIds.map(id => {
        return {
            id: id,
            nome: traducoes.familias ? traducoes.familias[id] : id
        };
    });

    familiasTraduzidas.sort((a, b) => a.nome.localeCompare(b.nome)); 

    familiasTraduzidas.forEach(familia => {
        const option = document.createElement('option');
        option.value = familia.id;
        option.textContent = familia.nome;
        select.appendChild(option);
    });
}