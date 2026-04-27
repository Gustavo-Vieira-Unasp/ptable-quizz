const posicoes = {
    "H": [1, 1], "He": [18, 1],
    "Li": [1, 2], "Be": [2, 2], "B": [13, 2], "C": [14, 2], "N": [15, 2], "O": [16, 2], "F": [17, 2], "Ne": [18, 2],
    "Na": [1, 3], "Mg": [2, 3], "Al": [13, 3], "Si": [14, 3], "P": [15, 3], "S": [16, 3], "Cl": [17, 3], "Ar": [18, 3]
};

export function createGrid(elementos, found) {
    const grid = document.getElementById('periodic-table-grid');
    if (!grid) return;
    
    grid.innerHTML = '';

    elementos.forEach(el => {
        const coords = posicoes[el.simbolo];
        if (!coords) return;

        const card = document.createElement('div');
        card.className = 'empty-element-card';
        card.id = `el-${el.simbolo}`;
        
        card.style.gridColumn = coords[0];
        card.style.gridRow = coords[1];

        card.innerHTML = `
            <span class="symbol-display">${el.simbolo}</span>
            <span class="name-display">${el.nome}</span>
        `;

        if (found.some(f => f.simbolo === el.simbolo)) {
            card.classList.add('element-revealed');
        }

        grid.appendChild(card);
    });
}

export function revealElement(el) {
    const card = document.getElementById(`el-${el.simbolo}`);
    if (card) card.classList.add('element-revealed');
}

export function populateFilter(elementos) {
    const select = document.getElementById('familyFilterSelect');
    const familias = [...new Set(elementos.map(e => e.familia))].filter(f => f && f !== "N/A");
    familias.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f; opt.textContent = f;
        select.appendChild(opt);
    });
}