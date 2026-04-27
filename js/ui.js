export function createGrid(elementos, found) {
    const grid = document.getElementById('periodic-table-grid');
    if (!grid) return;

    grid.innerHTML = '';

    elementos.forEach(el => {
        if (el.x === undefined || el.y === undefined) return;

        const card = document.createElement('div');
        card.className = 'empty-element-card';
        card.id = `el-${el.simbolo}`;
        
        card.style.gridColumn = el.x;
        card.style.gridRow = el.y;

        card.innerHTML = `
            <span class="symbol-display">${el.simbolo}</span>
            <span class="name-display">${el.nome}</span>
        `;

        const jaEncontrado = found.some(f => f.simbolo === el.simbolo);
        if (jaEncontrado) {
            card.classList.add('element-revealed');
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

export function revealElement(el) {
    const card = document.getElementById(`el-${el.simbolo}`);
    if (card) {
        card.classList.add('element-revealed');
    }
}

export function populateFilter(elementos) {
    const select = document.getElementById('familyFilterSelect');
    if (!select) return;

    select.innerHTML = '<option value="">Todas as Famílias</option>';

    const familias = [...new Set(elementos.map(e => e.familia))]
        .filter(f => f && f !== "N/A" && f !== "");

    familias.sort(); 

    familias.forEach(familia => {
        const option = document.createElement('option');
        option.value = familia;
        option.textContent = familia;
        select.appendChild(option);
    });
}