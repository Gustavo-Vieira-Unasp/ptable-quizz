import { normalizeString } from './utils.js';
import { createGrid, revealElement, populateFilter } from './ui.js';
import { loadProgress, saveProgress } from './storage.js';

let elementosData = [];
let foundElements = [];

document.addEventListener('DOMContentLoaded', async () => {
    const elementInput = document.getElementById('elementInput');
    const familyFilter = document.getElementById('familyFilterSelect');

    try {
        const response = await fetch('data/elementos.json');
        if (!response.ok) throw new Error("Erro ao carregar o arquivo JSON");
        elementosData = await response.json();

        foundElements = loadProgress();

        createGrid(elementosData, foundElements);
        
        populateFilter(elementosData);

    } catch (error) {
        console.error("Erro ao inicializar quiz:", error);
        document.getElementById('message').textContent = "Erro ao carregar dados. Verifique o console.";
    }

    elementInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const inputVal = normalizeString(elementInput.value);
            
            const el = elementosData.find(item => 
                normalizeString(item.nome) === inputVal || 
                normalizeString(item.simbolo) === inputVal ||
                (item.palavras_chave && item.palavras_chave.some(k => normalizeString(k) === inputVal))
            );

            if (el) {
                const jaEncontrado = foundElements.some(f => f.simbolo === el.simbolo);
                
                if (!jaEncontrado) {
                    foundElements.push(el);
                    saveProgress(foundElements);
                    
                    revealElement(el); 
                    
                    elementInput.value = '';
                    showMessage(`Boa! ${el.nome} encontrado.`, "success");
                } else {
                    showMessage("Você já encontrou este elemento!", "warn");
                }
            } else {
                showMessage("Não reconheci esse elemento.", "error");
            }
        }
    });
});

function showMessage(text, type) {
    const msg = document.getElementById('message');
    msg.textContent = text;
    msg.className = type === "success" ? "success-message" : "error-message";
}