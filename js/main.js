import { normalizeString } from './utils.js';
import { createGrid, revealElement, populateFilter } from './ui.js';
import { saveAttempt, getGlobalRarity } from './database.js';

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

        foundElements = []; 

        createGrid(elementosData, foundElements);
        populateFilter(elementosData);

    } catch (error) {
        console.error("Erro ao inicializar quiz:", error);
        if (messageParagraph) {
            messageParagraph.textContent = "Erro ao carregar os dados dos elementos.";
            messageParagraph.classList.add('error-message');
        }
    }

    function handleSubmission() {
        if (!elementInput) return;
        const normalizedInput = normalizeString(elementInput.value);

        if (!normalizedInput) return;

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
                revealElement(elemento);
                
                elementInput.value = '';
                showMessage(`Boa! ${elemento.nome} encontrado.`, "success");
            } else {
                elementInput.value = '';
                showMessage("Você já encontrou este elemento!", "warn");
            }
        } else {
            showMessage("Elemento não reconhecido.", "error");
        }
    }

    async function finishAndShowStats() {
        if (foundElements.length === 0) {
            alert("Encontre pelo menos um elemento antes de finalizar!");
            return;
        }

        if (saveQuizBtn) saveQuizBtn.disabled = true;
        showMessage("Salvando tentativa no ranking global...", "warn");

        try {
            const simbolosEncontrados = foundElements.map(el => el.simbolo);
            await saveAttempt(simbolosEncontrados);

            const { raridadeMap, totalTentativas } = await getGlobalRarity();

            renderStatsPopup(raridadeMap, totalTentativas);

        } catch (error) {
            console.error("Erro ao processar estatísticas globais:", error);
            alert("Erro ao conectar com o banco de dados. Verifique sua conexão.");
        } finally {
            if (saveQuizBtn) saveQuizBtn.disabled = false;
        }
    }

    function renderStatsPopup(raridadeMap, totalTentativas) {
        if (!statsList || !quizStatsPopup) return;

        const acertos = foundElements.length;
        const total = elementosData.length;

        let html = `
            <div style="margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px;">
                <h3 style="margin: 0; color: #0056b3;">Resultado da Rodada</h3>
                <p>Você encontrou <strong>${acertos}</strong> de <strong>${total}</strong> elementos.</p>
                <small>Baseado em ${totalTentativas} tentativas globais.</small>
            </div>
            <h4 style="text-align: left; margin-bottom: 10px;">Raridade dos seus acertos:</h4>
            <ul style="list-style: none; padding: 0; text-align: left; max-height: 300px; overflow-y: auto;">
        `;

        const sortedElements = [...foundElements].sort((a, b) => {
            return (raridadeMap[a.simbolo] || 0) - (raridadeMap[b.simbolo] || 0);
        });

        sortedElements.forEach(el => {
            const freq = raridadeMap[el.simbolo] || 0;
            html += `
                <li style="padding: 8px; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between;">
                    <span><strong>${el.simbolo}</strong> (${el.nome})</span>
                    <span style="color: ${freq < 20 ? '#d9534f' : '#5cb85c'}; font-weight: bold;">
                        ${freq}% popular
                    </span>
                </li>
            `;
        });

        html += `</ul>`;
        statsList.innerHTML = html;
        quizStatsPopup.style.display = 'flex';
    }

    function showMessage(text, type) {
        if (!messageParagraph) return;
        messageParagraph.textContent = text;
        messageParagraph.className = '';
        
        if (type === "success") messageParagraph.classList.add('success-message');
        else if (type === "error") messageParagraph.classList.add('error-message');
        else if (type === "warn") messageParagraph.classList.add('found-element-tag');
    }

    if (elementInput) {
        elementInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSubmission();
        });
    }

    if (familyFilterSelect) {
        familyFilterSelect.addEventListener('change', () => {
            createGrid(elementosData, foundElements);
        });
    }

    if (saveQuizBtn) {
        saveQuizBtn.addEventListener('click', finishAndShowStats);
    }

    if (closeStatsPopupBtn && quizStatsPopup) {
        closeStatsPopupBtn.addEventListener('click', () => {
            quizStatsPopup.style.display = 'none';
            foundElements = [];
            createGrid(elementosData, foundElements);
            if (messageParagraph) messageParagraph.textContent = "";
            if (elementInput) elementInput.value = "";
        });
    }
});