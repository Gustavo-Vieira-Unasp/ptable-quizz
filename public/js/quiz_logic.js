import { ELEMENTS_DATA, TOTAL_ELEMENTS } from './data.js';
import * as UIManager from './ui_manager.js';

let foundElements = loadFoundElements();
let totalAttempts = parseInt(localStorage.getItem('totalAttempts')) || 0;
let correctGuesses = parseInt(localStorage.getItem('correctGuesses')) || 0;

const inputField = document.getElementById('elementInput');
const familyFilterSelect = document.getElementById('familyFilterSelect');

function loadFoundElements() {
    const stored = localStorage.getItem('foundElements');
    return stored ? JSON.parse(stored) : [];
}

function normalizeString(str) {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function getStats() {
    const accuracy = totalAttempts > 0 ? ((correctGuesses / totalAttempts) * 100).toFixed(1) : '0';
    const missingElements = TOTAL_ELEMENTS - foundElements.length;

    return {
        foundCount: foundElements.length,
        missingCount: missingElements,
        attempts: totalAttempts,
        accuracy: accuracy
    };
}

export function checkElement() {
    const userInput = normalizeString(inputField.value);

    if (userInput.length === 0) {
        UIManager.showMessage('Digite o nome ou símbolo do elemento.', 'error');
        return;
    }

    totalAttempts++;
    localStorage.setItem('totalAttempts', totalAttempts);

    const element = ELEMENTS_DATA.find(e =>
        normalizeString(e.name) === userInput ||
        normalizeString(e.symbol) === userInput
    );

    if (element) {
        const symbol = element.symbol;
        if (!foundElements.includes(symbol)) {
            correctGuesses++;
            localStorage.setItem('correctGuesses', correctGuesses);
            foundElements.push(symbol);
            localStorage.setItem('foundElements', JSON.stringify(foundElements));

            UIManager.revealElement(symbol, element);
            UIManager.updateFoundElementsList(foundElements);
            
            UIManager.showMessage(`Parabéns! Você encontrou ${element.name} (${symbol}).`, 'success');

            if (foundElements.length === TOTAL_ELEMENTS) {
                UIManager.showMessage('Felicitações! Você encontrou todos os 118 elementos!', 'success');
            }
        } else {
            UIManager.showMessage(`${element.name} (${symbol}) já foi encontrado. Tente outro.`, 'error');
        }
    } else {
        UIManager.showMessage('Elemento não encontrado. Tente novamente.', 'error');
    }

    inputField.value = '';
    inputField.focus();
}

export function initializeRevealedElements() {
     foundElements.forEach(symbol => {
        const elementData = ELEMENTS_DATA.find(e => e.symbol === symbol);
        if (elementData) {
            UIManager.revealElement(symbol, elementData);
        }
    });
    UIManager.updateFoundElementsList(foundElements);
}

export function applyFamilyFilter() {
    const selectedSerie = familyFilterSelect.value;
    UIManager.applyFilterStyle(selectedSerie);
    
    const filterText = selectedSerie || 'Todas as Famílias';
    UIManager.showMessage(`Filtro Ativo: ${filterText}`, 'info');
    
    if (inputField) inputField.focus();
}

export function showStats() {
    const stats = getStats();
    UIManager.openStatsPopup(stats.foundCount, stats.missingCount, stats.attempts, stats.accuracy);
}

export function resetQuiz() {
    if (confirm('Tem certeza de que deseja apagar todo o seu progresso? Esta ação é irreversível.')) {
        localStorage.clear();
        foundElements = [];
        totalAttempts = 0;
        correctGuesses = 0;
        
        document.querySelectorAll('.element-revealed').forEach(card => {
            Object.values(UIManager.FAMILY_CSS_MAP).forEach(cls => card.classList.remove(cls));
            card.classList.add('empty-element-card');
            card.classList.remove('element-revealed');
            card.innerHTML = '';
        });
        
        UIManager.updateFoundElementsList(foundElements);
        UIManager.showMessage('Progresso reiniciado com sucesso!', 'success');
        
        familyFilterSelect.value = '';
        applyFamilyFilter();
    }
}