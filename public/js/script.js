document.addEventListener('DOMContentLoaded', () => {

    const elementInput = document.getElementById('elementInput');
    const familyFilterSelect = document.getElementById('familyFilterSelect');
    const messageParagraph = document.getElementById('message');
    const foundElementsList = document.getElementById('foundElementsList');
    const saveQuizBtn = document.getElementById('saveQuizBtn');
    const quizStatsPopup = document.getElementById('quizStatsPopup');
    const statsList = document.getElementById('statsList');
    const closeStatsPopupBtn = document.getElementById('closeStatsPopupBtn');

    let foundElementsClient = [];

    async function loadFamilies() {
        try {
            const response = await fetch('/api/familias');
            if (!response.ok) {
                const errorDetails = await response.text();
                console.error(`Erro HTTP ao buscar famílias: ${response.status} ${response.statusText} - ${errorDetails}`);
                throw new Error(`Erro de rede ao carregar famílias (${response.status})`);
            }
            const families = await response.json();
            
            if (familyFilterSelect) {
                familyFilterSelect.innerHTML = '<option value="">Todas as Famílias</option>';

                if (families && families.length > 0) {
                    families.forEach(family => {
                        if (family && typeof family === 'string' && family.trim() !== '') {
                            const option = document.createElement('option');
                            option.value = family;
                            option.textContent = family;
                            familyFilterSelect.appendChild(option);
                        }
                    });
                } else {
                    const noFamiliesOption = document.createElement('option');
                    noFamiliesOption.value = "";
                    noFamiliesOption.textContent = "Nenhuma família encontrada";
                    familyFilterSelect.appendChild(noFamiliesOption);
                    familyFilterSelect.disabled = true;
                    console.warn("Nenhuma família retornada do backend para popular o dropdown.");
                }
            }
        } catch (error) {
            console.error("Erro ao carregar famílias do servidor:", error);
            if (familyFilterSelect) {
                const errorOption = document.createElement('option');
                errorOption.value = "";
                errorOption.textContent = "Erro ao carregar famílias";
                familyFilterSelect.appendChild(errorOption);
                familyFilterSelect.disabled = true;
            }
            if (messageParagraph) {
                messageParagraph.textContent = "Não foi possível carregar as famílias. Verifique o console do navegador (F12) para detalhes.";
                messageParagraph.classList.add('error-message');
            }
        }
    }

    async function loadFoundElements() {
        try {
            const response = await fetch('/api/elementos/encontrados');
            if (!response.ok) {
                const errorDetails = await response.text();
                console.error(`Erro HTTP ao carregar elementos encontrados: ${response.status} ${response.statusText} - ${errorDetails}`);
                throw new Error(`Erro de rede ao carregar elementos encontrados (${response.status})`);
            }
            const foundElementsFromServer = await response.json();
            foundElementsClient = foundElementsFromServer;

            if (foundElementsList) {
                foundElementsList.innerHTML = ''; 
            }

            document.querySelectorAll('.empty-element-card').forEach(card => {
                card.classList.remove('element-revealed');
                const symbolDisplay = card.querySelector('.symbol-display');
                const nameDisplay = card.querySelector('.name-display');
                if (symbolDisplay) symbolDisplay.textContent = '';
                if (nameDisplay) nameDisplay.textContent = '';
            });

            if (foundElementsClient && foundElementsClient.length > 0) {
                const selectedFamily = familyFilterSelect ? familyFilterSelect.value : '';
                
                foundElementsClient.forEach(element => {
                    if (!selectedFamily || element.familia === selectedFamily) {
                        const elementTag = document.createElement('span');
                        elementTag.classList.add('found-element-tag');
                        elementTag.textContent = `${element.nome} (${element.simbolo})`;
                        if (foundElementsList) {
                            foundElementsList.appendChild(elementTag);
                        }

                        const elementCard = document.querySelector(`.empty-element-card[data-symbol="${element.simbolo}"]`);
                        if (elementCard) {
                            elementCard.classList.add('element-revealed');
                            elementCard.querySelector('.symbol-display').textContent = element.simbolo;
                            elementCard.querySelector('.name-display').textContent = element.nome;
                        }
                    }
                });

                if (foundElementsList && foundElementsList.children.length === 0 && selectedFamily) {
                    foundElementsList.innerHTML = `<p>Nenhum elemento encontrado nesta família ainda.</p>`;
                }
            } else {
                if (foundElementsList) {
                    foundElementsList.innerHTML = `<p>Nenhum elemento encontrado ainda. Digite um para começar!</p>`;
                }
            }
        } catch (error) {
            console.error("Erro ao carregar elementos encontrados:", error);
            if (foundElementsList) {
                foundElementsList.innerHTML = `<p class="error-message">Erro ao carregar elementos encontrados. Verifique o console.</p>`;
            }
        }
    }

    async function submitElement() {
        const elementName = elementInput ? elementInput.value.trim() : '';
        if (!elementName) {
            if (messageParagraph) {
                messageParagraph.textContent = "Por favor, digite o nome ou símbolo de um elemento.";
                messageParagraph.classList.add('error-message');
                messageParagraph.classList.remove('success-message');
            }
            return;
        }

        if (messageParagraph) {
            messageParagraph.textContent = "Verificando elemento...";
            messageParagraph.classList.remove('error-message', 'success-message');
        }

        try {
            const response = await fetch('/api/elementos/submeter', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: elementName })
            });

            const result = await response.json();

            if (response.ok) {
                if (messageParagraph) {
                    messageParagraph.textContent = result.message;
                    messageParagraph.classList.add('success-message');
                    messageParagraph.classList.remove('error-message');
                }
                if (elementInput) {
                    elementInput.value = '';
                }
                loadFoundElements();
            } else {
                if (messageParagraph) {
                    messageParagraph.textContent = result.error || "Ocorreu um erro ao submeter o elemento.";
                    messageParagraph.classList.add('error-message');
                    messageParagraph.classList.remove('success-message');
                }
            }
        } catch (error) {
            console.error("Erro ao submeter elemento:", error);
            if (messageParagraph) {
                messageParagraph.textContent = "Erro de conexão ao submeter o elemento. Tente novamente.";
                messageParagraph.classList.add('error-message');
                messageParagraph.classList.remove('success-message');
            }
        }
    }

    async function resetQuizUI() {
        try {
            const response = await fetch('/api/elementos/limpar', {
                method: 'POST',
            });
            if (!response.ok) {
                throw new Error('Falha ao limpar progresso no servidor.');
            }

            foundElementsClient = [];

            document.querySelectorAll('.empty-element-card').forEach(card => {
                card.classList.remove('element-revealed');
                const symbolDisplay = card.querySelector('.symbol-display');
                const nameDisplay = card.querySelector('.name-display');
                if (symbolDisplay) symbolDisplay.textContent = '';
                if (nameDisplay) nameDisplay.textContent = '';
            });

            if (foundElementsList) {
                foundElementsList.innerHTML = `<p>Nenhum elemento encontrado ainda. Digite um para começar!</p>`;
            }

            if (elementInput) {
                elementInput.value = '';
            }
            if (messageParagraph) {
                messageParagraph.textContent = "Quiz reiniciado! Digite um elemento para começar.";
                messageParagraph.classList.remove('error-message', 'success-message');
            }
            if (familyFilterSelect) {
                familyFilterSelect.value = '';
            }
            loadFamilies();
        } catch (error) {
            console.error("Erro ao reiniciar o quiz:", error);
            if (messageParagraph) {
                messageParagraph.textContent = "Erro ao reiniciar o quiz. Verifique a conexão.";
                messageParagraph.classList.add('error-message');
            }
        }
    }

    async function saveQuizProgress() {
        const foundElements = foundElementsClient || [];

        const quizData = {
            data: new Date().toISOString(),
            acertos: foundElements.length,
            elementosDaTentativa: foundElements.map(el => el.nome)
        };

        if (statsList) {
            let listHTML = `
                <li><strong>Total de Tentativas:</strong> A ser calculado no servidor</li>
                <li><strong>Data da Última Tentativa:</strong> ${new Date(quizData.data).toLocaleString()}</li>
                <li><strong>Acertos:</strong> ${quizData.acertos}/118</li>
                <li><strong>Elementos da Última Tentativa:</strong> ${quizData.elementosDaTentativa.length > 0 ? quizData.elementosDaTentativa.join(', ') : 'Nenhum elemento encontrado nesta tentativa.'}</li>
                <li><strong>Porcentagens de Acerto:</strong> A ser calculado no servidor</li>
            `;
            statsList.innerHTML = listHTML;
        }

        if (quizStatsPopup) {
            quizStatsPopup.style.display = 'flex';
        }

        try {
            const response = await fetch('/api/quiz/salvar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ quizData })
            });

            if (!response.ok) {
                throw new Error('Falha ao salvar o quiz no servidor.');
            }

            const result = await response.json();
            console.log('Quiz salvo com sucesso:', result);

            if (statsList) {
                let updatedListHTML = `
                    <li><strong>Total de Tentativas:</strong> ${result.totalDeTentativas}</li>
                    <li><strong>Data da Última Tentativa:</strong> ${new Date(result.dataUltimaTentativa).toLocaleString()}</li>
                    <li><strong>Acertos:</strong> ${result.acertos}</li>
                    <li><strong>Elementos da Última Tentativa:</strong> ${result.elementosDaTentativa.length > 0 ? result.elementosDaTentativa.join(', ') : 'Nenhum elemento encontrado nesta tentativa.'}</li>
                `;

                if (Object.keys(result.Porcentagens).length > 0) {
                    const porcentagensLista = Object.keys(result.Porcentagens).map(key => {
                        return `${key}: ${result.Porcentagens[key]}`;
                    }).join(', ');
                    updatedListHTML += `<li><strong>Porcentagens de Acerto:</strong> ${porcentagensLista}</li>`;
                } else {
                    updatedListHTML += `<li><strong>Porcentagens de Acerto:</strong> Nenhum elemento encontrado para calcular as porcentagens.</li>`;
                }

                statsList.innerHTML = updatedListHTML;
            }

        } catch (error) {
            console.error('Erro ao salvar o quiz:', error);
            if (statsList) {
                statsList.innerHTML = `<li><strong class="error-message">Erro ao salvar:</strong> ${error.message}</li>`;
            }
        }
    }

    // --- Event Listeners ---
    if (elementInput) {
        elementInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                submitElement();
            }
        });
    }

    if (familyFilterSelect) {
        familyFilterSelect.addEventListener('change', loadFoundElements);
    }
    
    if (saveQuizBtn) {
        saveQuizBtn.addEventListener('click', saveQuizProgress);
    }

    if (closeStatsPopupBtn && quizStatsPopup) {
        closeStatsPopupBtn.addEventListener('click', () => {
            quizStatsPopup.style.display = 'none';
            resetQuizUI();
        });
    }

    resetQuizUI();
});