const elementInput = document.getElementById('elementInput');
        const familyFilterSelect = document.getElementById('familyFilterSelect');
        const messageParagraph = document.getElementById('message');
        const foundElementsList = document.getElementById('foundElementsList');
        const saveQuizBtn = document.getElementById('saveQuizBtn');

        const quizStatsPopup = document.getElementById('quizStatsPopup');
        const statsList = document.getElementById('statsList');
        const closeStatsPopupBtn = document.getElementById('closeStatsPopupBtn');

        let foundElementsClient = [];

        function formatDateTime(isoString) {
            const date = new Date(isoString);
            return date.toLocaleString('pt-BR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }


        async function loadFamilies() {
            try {
                const response = await fetch('/api/familias');
                if (!response.ok) {
                    const errorDetails = await response.text();
                    console.error(`Erro HTTP ao buscar famílias: ${response.status} ${response.statusText} - ${errorDetails}`);
                    throw new Error(`Erro de rede ao carregar famílias (${response.status})`);
                }
                const families = await response.json();

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

            } catch (error) {
                console.error("Erro ao carregar famílias do servidor:", error);
                const errorOption = document.createElement('option');
                errorOption.value = "";
                errorOption.textContent = "Erro ao carregar famílias";
                familyFilterSelect.appendChild(errorOption);
                familyFilterSelect.disabled = true;
                messageParagraph.textContent = "Não foi possível carregar as famílias. Verifique o console do navegador (F12) para detalhes.";
                messageParagraph.classList.add('error-message');
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

                foundElementsList.innerHTML = ''; 
                
                document.querySelectorAll('.empty-element-card').forEach(card => {
                    card.classList.remove('element-revealed');
                    card.querySelector('.symbol-display').textContent = '';
                    card.querySelector('.name-display').textContent = '';
                });


                if (foundElementsClient && foundElementsClient.length > 0) {
                    const selectedFamily = familyFilterSelect.value;

                    foundElementsClient.forEach(element => {
                        if (!selectedFamily || element.familia === selectedFamily) {
                            const elementTag = document.createElement('span');
                            elementTag.classList.add('found-element-tag');
                            elementTag.textContent = `${element.nome} (${element.simbolo})`;
                            foundElementsList.appendChild(elementTag);

                            const elementCard = document.querySelector(`.empty-element-card[data-symbol="${element.simbolo}"]`);
                            if (elementCard) {
                                elementCard.classList.add('element-revealed');
                                elementCard.querySelector('.symbol-display').textContent = element.simbolo;
                                elementCard.querySelector('.name-display').textContent = element.nome;
                            }
                        }
                    });

                    if (foundElementsList.children.length === 0 && selectedFamily) {
                        foundElementsList.innerHTML = `<p>Nenhum elemento encontrado nesta família ainda.</p>`;
                    }

                } else {
                    foundElementsList.innerHTML = `<p>Nenhum elemento encontrado ainda. Digite um para começar!</p>`;
                }

            } catch (error) {
                console.error("Erro ao carregar elementos encontrados:", error);
                foundElementsList.innerHTML = `<p class="error-message">Erro ao carregar elementos encontrados. Verifique o console.</p>`;
            }
        }

        async function submitElement() {
            const elementName = elementInput.value.trim();
            if (!elementName) {
                messageParagraph.textContent = "Por favor, digite o nome ou símbolo de um elemento.";
                messageParagraph.classList.add('error-message');
                messageParagraph.classList.remove('success-message');
                return;
            }

            messageParagraph.textContent = "Verificando elemento...";
            messageParagraph.classList.remove('error-message', 'success-message');

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
                    messageParagraph.textContent = result.message;
                    messageParagraph.classList.add('success-message');
                    messageParagraph.classList.remove('error-message');
                    elementInput.value = '';

                    loadFoundElements();

                } else {
                    messageParagraph.textContent = result.error || "Ocorreu um erro ao submeter o elemento.";
                    messageParagraph.classList.add('error-message');
                    messageParagraph.classList.remove('success-message');
                }

            } catch (error) {
                console.error("Erro ao submeter elemento:", error);
                messageParagraph.textContent = "Erro de conexão ao submeter o elemento. Tente novamente.";
                messageParagraph.classList.add('error-message');
                messageParagraph.classList.remove('success-message');
            }
        }

        function resetQuizUI() {
            foundElementsClient = [];
            loadFoundElements();
            elementInput.value = '';
            messageParagraph.textContent = "Quiz reiniciado! Digite um elemento para começar.";
            messageParagraph.classList.remove('error-message', 'success-message');
            familyFilterSelect.value = '';
            loadFamilies();
        }

        async function saveQuizProgress() {
            const acertos = foundElementsClient.length;

            try {
                const response = await fetch('/api/quiz/salvar', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        acertos: acertos,
                        elementos: foundElementsClient
                    })
                });

                const result = await response.json();

                if (response.ok) {
                    messageParagraph.textContent = `Quiz salvo com sucesso! Acertos: ${acertos}/118.`;
                    messageParagraph.classList.add('success-message');
                    messageParagraph.classList.remove('error-message');

                    statsList.innerHTML = '';
                    if (result.estatisticas && result.estatisticas.length > 0) {
                        const ul = document.createElement('ul');
                        result.estatisticas.forEach(stat => {
                            const li = document.createElement('li');
                            li.textContent = `${stat.nome} (${stat.simbolo}): ${stat.porcentagem}% dos quizzes`;
                            ul.appendChild(li);
                        });
                        statsList.appendChild(ul);
                    } else {
                        statsList.innerHTML = '<p>Nenhuma estatística de uso de elementos encontrada ainda.</p>';
                    }
                    quizStatsPopup.style.display = 'flex';

                } else {
                    messageParagraph.textContent = result.error || "Erro ao salvar o quiz.";
                    messageParagraph.classList.add('error-message');
                    messageParagraph.classList.remove('success-message');
                }

            } catch (error) {
                console.error("Erro ao salvar progresso do quiz:", error);
                messageParagraph.textContent = "Erro de conexão ao salvar o quiz. Verifique o console.";
                messageParagraph.classList.add('error-message');
                messageParagraph.classList.remove('success-message');
            }
        }

        elementInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                submitElement();
            }
        });

        familyFilterSelect.addEventListener('change', loadFoundElements);

        saveQuizBtn.addEventListener('click', saveQuizProgress);

        closeStatsPopupBtn.addEventListener('click', () => {
            quizStatsPopup.style.display = 'none';
            resetQuizUI();
        });

        loadFamilies();
        loadFoundElements();