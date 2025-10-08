import { ELEMENTS_DATA, FAMILY_CSS_MAP, TOTAL_ELEMENTS } from './data.js';

const messageDisplay = document.getElementById('message');
const foundElementsList = document.getElementById('foundElementsList');

export function showMessage(text, type) {
    if (!messageDisplay) return;
    messageDisplay.textContent = text;
    messageDisplay.className = `message-display ${type}-message`;
}

export function revealElement(symbol, elementData) {
    const card = document.querySelector(`[data-symbol="${symbol}"]`);
    if (card) {
        Object.values(FAMILY_CSS_MAP).forEach(cls => card.classList.remove(cls));
        
        const familyClass = FAMILY_CSS_MAP[elementData.serie];
        if (familyClass) {
            card.classList.add(familyClass);
        }
        
        card.classList.remove('empty-element-card');
        card.classList.add('element-revealed');
        
        card.innerHTML = `
            <div class="symbol-display">${elementData.symbol}</div>
            <div class="name-display">${elementData.name}</div>
        `;
    }
}

export function updateFoundElementsList(foundElements) {
    if (!foundElementsList) return;

    foundElementsList.innerHTML = '';
    
    const sortedFound = foundElements
        .map(symbol => ELEMENTS_DATA.find(e => e.symbol === symbol))
        .filter(e => e)
        .sort((a, b) => ELEMENTS_DATA.indexOf(a) - ELEMENTS_DATA.indexOf(b));

    sortedFound.forEach(element => {
        const tag = document.createElement('span');
        tag.className = 'found-element-tag';
        tag.textContent = `${element.symbol} (${element.name})`;
        foundElementsList.appendChild(tag);
    });
}

export function openStatsPopup(foundCount, missingCount, attempts, accuracy) {
    const popupOverlay = document.getElementById('statsPopupOverlay');
    if (!popupOverlay) {
        showMessage('Erro: O popup de estatísticas não foi encontrado no HTML.', 'error');
        return;
    }

    document.getElementById('stats-found-count').textContent = foundCount;
    document.getElementById('stats-missing-count').textContent = missingCount;
    document.getElementById('stats-total-attempts').textContent = attempts;
    document.getElementById('stats-accuracy').textContent = `${accuracy}%`;

    popupOverlay.style.display = 'flex';
}

export function closeStatsPopup() {
    const popupOverlay = document.getElementById('statsPopupOverlay');
    if (popupOverlay) {
        popupOverlay.style.display = 'none';
    }
}

export function populateFamilyFilter(familyFilterSelect) {
    if (!familyFilterSelect) return;

    const series = ELEMENTS_DATA.map(e => e.serie);
    const uniqueSeries = [...new Set(series)].sort();

    familyFilterSelect.innerHTML = '';
    
    const allOption = document.createElement('option');
    allOption.value = ''; 
    allOption.textContent = 'Todas as Famílias';
    familyFilterSelect.appendChild(allOption);

    uniqueSeries.forEach(serie => {
        const option = document.createElement('option');
        option.value = serie;
        option.textContent = serie;
        familyFilterSelect.appendChild(option);
    });
}

export function applyFilterStyle(selectedSerie) {
    const allElementCards = document.querySelectorAll('[data-symbol]'); 

    allElementCards.forEach(card => {
        const symbol = card.getAttribute('data-symbol');
        const element = ELEMENTS_DATA.find(e => e.symbol === symbol);

        if (!element) return; 

        const elementSerie = element.serie;

        let shouldShow = true;
        
        if (selectedSerie !== '') {
            shouldShow = (elementSerie === selectedSerie);
        }

        if (shouldShow) {
            card.style.opacity = '1';
            card.style.pointerEvents = 'auto'; 
        } else {
            card.style.opacity = '0.15';
            card.style.pointerEvents = 'none'; 
        }
    });
}