const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const elementosPath = path.join(__dirname, '../data/elementos.json');
const respostasPath = path.join(__dirname, '../data/respostas.json');

let elementosData = [];
async function loadElements() {
    try {
        const data = await fs.readFile(elementosPath, 'utf8');
        elementosData = JSON.parse(data);
    } catch (error) {
        console.error("Erro ao carregar elementos.json:", error);
    }
}
loadElements();

router.get('/familias', (req, res) => {
    try {
        const familias = [...new Set(elementosData.map(e => e.familia))].filter(Boolean);
        res.json(familias);
    } catch (error) {
        console.error("Erro ao processar famílias:", error);
        res.status(500).json({ error: "Erro interno do servidor." });
    }
});

let elementosEncontrados = [];

router.get('/elementos/encontrados', (req, res) => {
    res.json(elementosEncontrados);
});

router.post('/elementos/submeter', (req, res) => {
    const { name } = req.body;
    const elemento = elementosData.find(e => 
        e.nome.toLowerCase() === name.toLowerCase() || 
        e.simbolo.toLowerCase() === name.toLowerCase()
    );

    if (elemento) {
        const jaEncontrado = elementosEncontrados.some(e => e.simbolo === elemento.simbolo);
        if (!jaEncontrado) {
            elementosEncontrados.push(elemento);
            res.status(200).json({ message: "Elemento encontrado!", elemento });
        } else {
            res.status(200).json({ message: "Você já encontrou este elemento." });
        }
    } else {
        res.status(404).json({ error: "Elemento não encontrado. Tente novamente." });
    }
});

router.post('/elementos/limpar', async (req, res) => {
    try {
        elementosEncontrados = [];

        console.log('Progresso do quiz limpo no servidor.');
        res.status(200).json({ message: 'Progresso do quiz limpo com sucesso.' });
    } catch (error) {
        console.error('Erro ao limpar o progresso do quiz:', error);
        res.status(500).json({ error: 'Erro interno do servidor ao limpar o progresso.' });
    }
});

router.post('/quiz/salvar', async (req, res) => {
    try {
        const { quizData } = req.body;
        
        let quizHistory = {
            historicoDeTentativas: []
        };
        
        try {
            const data = await fs.readFile(respostasPath, 'utf8');
            const fileContent = JSON.parse(data);
            if (fileContent.historicoDeTentativas && Array.isArray(fileContent.historicoDeTentativas)) {
                quizHistory = fileContent;
            }
        } catch (readError) {
            if (readError.code === 'ENOENT' || readError instanceof SyntaxError) {
                console.log('Arquivo de respostas não encontrado ou inválido. Criando um novo.');
            } else {
                throw readError;
            }
        }
        
        quizHistory.historicoDeTentativas.push(quizData);
        
        const totalDeTentativas = quizHistory.historicoDeTentativas.length;
        const allFoundElements = quizHistory.historicoDeTentativas.flatMap(q => q.elementosDaTentativa);
        const elementCounts = {};
        allFoundElements.forEach(name => {
            elementCounts[name] = (elementCounts[name] || 0) + 1;
        });
        
        const porcentagens = {};
        for (const name in elementCounts) {
            if (Object.prototype.hasOwnProperty.call(elementCounts, name)) {
                const count = elementCounts[name];
                const percentage = (count / totalDeTentativas) * 100;
                porcentagens[name] = `${percentage.toFixed(0)}%`;
            }
        }
        
        const finalResponse = {
            totalDeTentativas: totalDeTentativas,
            dataUltimaTentativa: quizData.data,
            acertos: `${quizData.acertos}/118`,
            elementosDaTentativa: quizData.elementosDaTentativa,
            Porcentagens: porcentagens
        };

        await fs.writeFile(respostasPath, JSON.stringify(quizHistory, null, 2), 'utf8');
        
        res.status(200).json(finalResponse);

    } catch (error) {
        console.error("Erro ao salvar quiz no arquivo JSON:", error);
        res.status(500).json({ error: "Erro ao salvar o quiz. Verifique o console do servidor." });
    }
});

module.exports = router;