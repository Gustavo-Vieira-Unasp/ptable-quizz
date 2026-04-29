import { normalizeString } from './utils.js';
import { createGrid, revealElement, populateFilter } from './ui.js';
import { saveAttempt, getGlobalRarity } from './database.js';

let elementosData = [];
let traducoes = {};
let palavrasChave = {};
let foundElements = [];

document.addEventListener('DOMContentLoaded', async () => {
    const elementInput = document.getElementById('elementInput');
    const familyFilterSelect = document.getElementById('familyFilterSelect');
    const saveQuizBtn = document.getElementById('saveQuizBtn'); 
    const quizStatsPopup = document.getElementById('quizStatsPopup');
    const statsList = document.getElementById('statsList');
    const closeStatsPopupBtn = document.getElementById('closeStatsPopupBtn');
    const messageParagraph = document.getElementById('message');

    async function inicializarQuiz() {
        try {
            const [resEl, resTr, resKey] = await Promise.all([
                fetch('data/elements.json'),
                fetch('data/pt.json'),
                fetch('data/key_words.json')
            ]);

            if (!resEl.ok || !resTr.ok || !resKey.ok) throw new Error("Erro ao carregar arquivos de dados.");

            elementosData = await resEl.json();
            traducoes = await resTr.json();
            palavrasChave = await resKey.json();

            foundElements = []; 

            createGrid(elementosData, foundElements, traducoes);
            populateFilter(elementosData, traducoes);

        } catch (error) {
            console.error("Erro ao inicializar quiz:", error);
            if (messageParagraph) {
                messageParagraph.textContent = "Erro ao carregar os dados dos elementos.";
                messageParagraph.classList.add('error-message');
            }
        }
    }

    await inicializarQuiz();

    function handleSubmission() {
        if (!elementInput) return;
        const inputRaw = elementInput.value.trim();
        const normalizedInput = normalizeString(inputRaw);

        if (!normalizedInput) return;

        let elementoEncontrado = null;

        for (const [id, lista] of Object.entries(palavrasChave)) {
            if (lista.some(keyword => normalizeString(keyword) === normalizedInput)) {
                elementoEncontrado = elementosData.find(e => e.id == id);
                break;
            }
        }

        if (elementoEncontrado) {
            const idStr = elementoEncontrado.id.toString();
            const jaEncontrado = foundElements.some(e => e.id === elementoEncontrado.id);
            
            if (!jaEncontrado) {
                foundElements.push(elementoEncontrado);
                revealElement(elementoEncontrado, traducoes[idStr]);
                showMessage(`${traducoes[idStr].name} encontrado!`, "success");
            } else {
                showMessage("Elemento já encontrado.", "warn");
            }
        } else {
            showMessage("Elemento não reconhecido.", "error");
        }
        
        elementInput.value = ''; 
    }

    async function finishAndShowStats() {
        if (foundElements.length === 0) {
            alert("Encontre pelo menos um elemento antes de finalizar!");
            return;
        }

        if (saveQuizBtn) saveQuizBtn.disabled = true;
        showMessage("Salvando tentativa...", "warn");

        try {
            const idsEncontrados = foundElements.map(el => el.id);
            await saveAttempt(idsEncontrados);

            const { raridadeMap, totaltries } = await getGlobalRarity();

            renderStatsPopup(raridadeMap, totaltries);

        } catch (error) {
            console.error("Erro nas estatísticas:", error);
            alert("Erro ao conectar com o banco de dados.");
        } finally {
            if (saveQuizBtn) saveQuizBtn.disabled = false;
        }
    }

    function renderStatsPopup(raridadeMap, totaltries) {
        if (!statsList || !quizStatsPopup) return;

        const acertos = foundElements.length;
        const total = elementosData.length;

        let html = `
            <div style="margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px;">
                <h3 style="margin: 0; color: #0056b3;">Resultado da Rodada</h3>
                <p>Você encontrou <strong>${acertos}</strong> de <strong>${total}</strong> elementos.</p>
                <small>Baseado em ${totaltries} tentativas globais.</small>
            </div>
            <h4 style="text-align: left; margin-bottom: 10px;">Sua raridade (quão comum outros usuários acharam):</h4>
            <ul style="list-style: none; padding: 0; text-align: left; max-height: 300px; overflow-y: auto;">
        `;

        const sortedElements = [...foundElements].sort((a, b) => {
            return (raridadeMap[a.id] || 0) - (raridadeMap[b.id] || 0);
        });

        sortedElements.forEach(el => {
            const idStr = el.id.toString();
            const freq = raridadeMap[el.id] || 0;
            const nomeTraduzido = traducoes[idStr]?.name || "Desconhecido";

            html += `
                <li style="padding: 8px; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between;">
                    <span><strong>${el.symbol}</strong> (${nomeTraduzido})</span>
                    <span style="color: ${freq < 30 ? '#d9534f' : '#5cb85c'}; font-weight: bold;">
                        ${freq}% dos usuários
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
            createGrid(elementosData, foundElements, traducoes);
        });
    }

    if (saveQuizBtn) saveQuizBtn.addEventListener('click', finishAndShowStats);

    if (closeStatsPopupBtn && quizStatsPopup) {
        closeStatsPopupBtn.addEventListener('click', () => {
            quizStatsPopup.style.display = 'none';
            foundElements = [];
            createGrid(elementosData, foundElements, traducoes);
            if (messageParagraph) messageParagraph.textContent = "";
            if (elementInput) {
                elementInput.value = "";
                elementInput.focus();
            }
        });
    }
});