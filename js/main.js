import { normalizeString } from './utils.js';
import { createGrid, revealElement, populateFilter } from './ui.js';
import { saveAttempt, getGlobalRarity } from './database.js';

let elementosData = [];
let traducoes = {};
let palavrasChave = {};
let foundElements = [];

document.addEventListener('DOMContentLoaded', async () => {
    const elementInput = document.getElementById('elementInput');
    const elementForm = document.getElementById('elementForm');
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

            if (!resEl.ok || !resTr.ok || !resKey.ok) throw new Error("Erro ao carregar arquivos.");

            elementosData = await resEl.json();
            traducoes = await resTr.json();
            palavrasChave = await resKey.json();

            foundElements = []; 

            createGrid(elementosData, foundElements, traducoes);
            populateFilter(elementosData, traducoes);

        } catch (error) {
            console.error("Erro ao inicializar:", error);
            if (messageParagraph) {
                messageParagraph.textContent = "Erro ao carregar dados.";
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
                
                const dadosTraduzidos = traducoes.elementos[idStr];
                
                revealElement(elementoEncontrado, dadosTraduzidos);
                showMessage(`${dadosTraduzidos.name} encontrado!`, "success");
            } else {
                showMessage("Elemento já encontrado.", "warn");
            }
        } else {
            showMessage("Não reconhecido.", "error");
        }
        
        elementInput.value = ''; 
        elementInput.focus();
    }

    if (elementForm) {
        elementForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleSubmission();
        });
    }

    async function finishAndShowStats() {
        if (foundElements.length === 0) {
            alert("Encontre elementos antes de finalizar!");
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

        let html = `<h4 style="text-align: left; margin-bottom: 10px;">Sua raridade global (${totaltries} tentativas):</h4>`;
        html += `<ul style="list-style: none; padding: 0; text-align: left; max-height: 300px; overflow-y: auto;">`;

        const sortedElements = [...foundElements].sort((a, b) => {
            return (raridadeMap[a.id] || 0) - (raridadeMap[b.id] || 0);
        });

        sortedElements.forEach(el => {
            const idStr = el.id.toString();
            const freq = raridadeMap[el.id] || 0;
            const nomeTraduzido = traducoes.elementos[idStr]?.name || "Desconhecido";

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

    if (familyFilterSelect) {
        familyFilterSelect.addEventListener('change', () => {
            createGrid(elementosData, foundElements, traducoes);
        });
    }

    if (saveQuizBtn) saveQuizBtn.addEventListener('click', finishAndShowStats);

    if (closeStatsPopupBtn) {
        closeStatsPopupBtn.addEventListener('click', () => {
            quizStatsPopup.style.display = 'none';
            foundElements = [];
            createGrid(elementosData, foundElements, traducoes);
            if (messageParagraph) messageParagraph.textContent = "";
            elementInput.focus();
        });
    }
});