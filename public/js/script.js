document.addEventListener('DOMContentLoaded', () => {
    const elementInput = document.getElementById('elementInput');
    const familyFilterSelect = document.getElementById('familyFilterSelect');
    const messageParagraph = document.getElementById('message');
    const foundElementsList = document.getElementById('foundElementsList');
    const saveQuizBtn = document.getElementById('saveQuizBtn');
    const quizStatsPopup = document.getElementById('quizStatsPopup');
    const statsList = document.getElementById('statsList');
    const closeStatsPopupBtn = document.getElementById('closeStatsPopupBtn');

    let elementosData = [];
    let foundElementsClient = [];

    function normalizeString(str) {
        if (typeof str !== 'string') return '';
        return str.normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .toLowerCase()
                  .trim();
    }

    async function initializeApp() {
        try {
            const response = await fetch('./data/elementos.json');
            elementosData = await response.json();
            
            loadFamilies();
            loadProgressFromStorage();
            renderUI();
        } catch (error) {
            console.error("Erro ao inicializar app:", error);
            if (messageParagraph) messageParagraph.textContent = "Erro ao carregar dados dos elementos.";
        }
    }

    function loadFamilies() {
        if (!familyFilterSelect) return;
        const familias = [...new Set(elementosData.map(e => e.familia))].filter(Boolean);
        
        familyFilterSelect.innerHTML = '<option value="">Todas as Famílias</option>';
        familias.forEach(family => {
            const option = document.createElement('option');
            option.value = family;
            option.textContent = family;
            familyFilterSelect.appendChild(option);
        });
    }

    function saveProgressToStorage() {
        localStorage.setItem('ptable_found_elements', JSON.stringify(foundElementsClient));
    }

    function loadProgressFromStorage() {
        const saved = localStorage.getItem('ptable_found_elements');
        if (saved) {
            foundElementsClient = JSON.parse(saved);
        }
    }

    function submitElement() {
        const input = elementInput ? elementInput.value : '';
        const normalizedInput = normalizeString(input);

        if (!normalizedInput) return;

        const elemento = elementosData.find(e => {
            const matchesNome = normalizeString(e.nome) === normalizedInput;
            const matchesSimbolo = normalizeString(e.simbolo) === normalizedInput;
            const matchesPalavrasChave = e.palavras_chave && e.palavras_chave.some(kw => 
                normalizeString(kw) === normalizedInput
            );
            return matchesNome || matchesSimbolo || matchesPalavrasChave;
        });

        if (elemento) {
            const jaEncontrado = foundElementsClient.some(e => e.simbolo === elemento.simbolo);
            if (!jaEncontrado) {
                foundElementsClient.push(elemento);
                saveProgressToStorage();
                renderUI();
                if (messageParagraph) {
                    messageParagraph.textContent = `Boa! Você encontrou o ${elemento.nome}!`;
                    messageParagraph.className = 'success-message';
                }
                elementInput.value = '';
            } else {
                if (messageParagraph) {
                    messageParagraph.textContent = "Você já encontrou este elemento.";
                    messageParagraph.className = 'error-message';
                }
            }
        } else {
            if (messageParagraph) {
                messageParagraph.textContent = "Elemento não encontrado. Tente novamente.";
                messageParagraph.className = 'error-message';
            }
        }
    }

    function renderUI() {
        if (foundElementsList) foundElementsList.innerHTML = '';
        
        document.querySelectorAll('.empty-element-card').forEach(card => {
            card.classList.remove('element-revealed');
            const sym = card.querySelector('.symbol-display');
            const nam = card.querySelector('.name-display');
            if (sym) sym.textContent = '';
            if (nam) nam.textContent = '';
        });

        const selectedFamily = familyFilterSelect ? familyFilterSelect.value : '';

        foundElementsClient.forEach(element => {
            if (!selectedFamily || element.familia === selectedFamily) {
                // Adiciona tag na lista lateral
                const tag = document.createElement('span');
                tag.classList.add('found-element-tag');
                tag.textContent = `${element.nome} (${element.simbolo})`;
                if (foundElementsList) foundElementsList.appendChild(tag);

                // Revela o card na tabela
                const elementCard = document.querySelector(`.empty-element-card[data-symbol="${element.simbolo}"]`);
                if (elementCard) {
                    elementCard.classList.add('element-revealed');
                    elementCard.querySelector('.symbol-display').textContent = element.simbolo;
                    elementCard.querySelector('.name-display').textContent = element.nome;
                }
            }
        });
    }

    function saveAndShowStats() {
        const stats = {
            data: new Date().toLocaleString(),
            acertos: foundElementsClient.length,
            elementos: foundElementsClient.map(e => e.nome).join(', ')
        };

        if (statsList) {
            statsList.innerHTML = `
                <li><strong>Data:</strong> ${stats.data}</li>
                <li><strong>Total de Acertos:</strong> ${stats.acertos} / 118</li>
                <li><strong>Elementos encontrados:</strong> ${stats.elementos || 'Nenhum'}</li>
                <li style="margin-top:10px; color: #666; font-style: italic;">Nota: Progresso salvo automaticamente no seu navegador.</li>
            `;
        }

        if (quizStatsPopup) quizStatsPopup.style.display = 'flex';
    }

    function resetQuiz() {
        if(confirm("Deseja realmente limpar todo o seu progresso?")) {
            foundElementsClient = [];
            localStorage.removeItem('ptable_found_elements');
            renderUI();
            if (messageParagraph) messageParagraph.textContent = "Progresso reiniciado!";
        }
    }

    if (elementInput) {
        elementInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') submitElement(); });
    }
    if (familyFilterSelect) {
        familyFilterSelect.addEventListener('change', renderUI);
    }
    if (saveQuizBtn) {
        saveQuizBtn.addEventListener('click', saveAndShowStats);
    }
    if (closeStatsPopupBtn) {
        closeStatsPopupBtn.addEventListener('click', () => {
            quizStatsPopup.style.display = 'none';
        });
    }

    initializeApp();
});