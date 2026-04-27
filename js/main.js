import { normalizeString } from './utils.js';
import { createGrid, revealElement, populateFilter } from './ui.js';
import { loadProgress, saveProgress } from './storage.js';

let elementosData = [];
let foundElements = [];

document.addEventListener('DOMContentLoaded', async () => {
    const elementInput = document.getElementById('elementInput');
    const familyFilterSelect = document.getElementById('familyFilterSelect');
    const saveQuizBtn = document.getElementById('saveQuizBtn');
    const quizStatsPopup = document.getElementById('quizStatsPopup');
    const statsList = document.getElementById('statsList');
    const closeStatsPopupBtn = document.getElementById('closeStatsPopupBtn');
    const messageParagraph = document.getElementById('message');

    try {
        const response = await fetch('data/elementos.json');
        if (!response.ok) throw new Error("Erro ao carregar o arquivo JSON");
        elementosData = await response.json();

        foundElements = loadProgress();

        createGrid(elementosData, foundElements);
        populateFilter(elementosData);

    } catch (error) {
        console.error("Erro ao inicializar quiz:", error);
        if (messageParagraph) {
            messageParagraph.textContent = "Erro ao carregar os dados dos elementos. Verifique o console.";
            messageParagraph.classList.add('error-message');
        }
    }

    function handleSubmission() {
        if (!elementInput) return;
        const normalizedInput = normalizeString(elementInput.value);

        if (!normalizedInput) {
            showMessage("Digite o nome ou símbolo de um elemento.", "error");
            return;
        }

        const elemento = elementosData.find(e => {
            const matchesNome = normalizeString(e.nome) === normalizedInput;
            const matchesSimbolo = normalizeString(e.simbolo) === normalizedInput;
            const matchesKeywords = e.palavras_chave && e.palavras_chave.some(keyword => 
                normalizeString(keyword) === normalizedInput
            );
            return matchesNome || matchesSimbolo || matchesKeywords;
        });

        if (elemento) {
            const jaEncontrado = foundElements.some(e => e.simbolo === elemento.simbolo);
            
            if (!jaEncontrado) {
                foundElements.push(elemento);
                saveProgress(foundElements);
                
                revealElement(elemento); 
                
                elementInput.value = '';
                showMessage(`Boa! ${elemento.nome} encontrado.`, "success");
            } else {
                elementInput.value = '';
                showMessage("Você já encontrou este elemento!", "warn");
            }
        } else {
            showMessage("Elemento não reconhecido. Tente novamente.", "error");
        }
    }

    function showFinalStats() {
        if (!statsList) return;
        
        const total = elementosData.length;
        const acertos = foundElements.length;
        
        let listHTML = `
            <li><strong>Data:</strong> ${new Date().toLocaleString()}</li>
            <li><strong>Acertos:</strong> ${acertos} / ${total}</li>
            <li><strong>Porcentagem:</strong> ${((acertos / total) * 100).toFixed(0)}%</li>
        `;
        
        statsList.innerHTML = listHTML;

        if (quizStatsPopup) {
            quizStatsPopup.style.display = 'flex';
        }
    }

    function showMessage(text, type) {
        if (!messageParagraph) return;
        messageParagraph.textContent = text;
        messageParagraph.className = '';
        
        if (type === "success") {
            messageParagraph.classList.add('success-message');
        } else if (type === "error") {
            messageParagraph.classList.add('error-message');
        } else if (type === "warn") {
            messageParagraph.classList.add('found-element-tag');
        }
    }

    if (elementInput) {
        elementInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                handleSubmission();
            }
        });
    }

    if (familyFilterSelect) {
        familyFilterSelect.addEventListener('change', () => {
            createGrid(elementosData, foundElements);
        });
    }

    if (saveQuizBtn) {
        saveQuizBtn.addEventListener('click', showFinalStats);
    }

    if (closeStatsPopupBtn && quizStatsPopup) {
        closeStatsPopupBtn.addEventListener('click', () => {
            quizStatsPopup.style.display = 'none';
            
            if (confirm("Reiniciar o quiz e apagar progresso?")) {
                localStorage.removeItem('ptable_found_elements');
                foundElements = [];
                createGrid(elementosData, foundElements);
            }
        });
    }
});