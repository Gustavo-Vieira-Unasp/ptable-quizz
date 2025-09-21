const express = require("express");
const router = express.Router();
const { isMongoConnected, dbName, collectionName, getDb } = require("../utils/db");
const { normalizeString } = require("../utils/normalize");

const elementosData = require('../data/elementos');

let foundElements = [];
let elementosPreenchidosNoQuizz = new Set();

router.get("/familias", async (req, res) => {
    if (isMongoConnected) {
        try {
            const database = getDb().db(dbName);
            const collection = database.collection(collectionName);
            const families = await collection.distinct("familia");
            const cleanedFamilies = families
                .filter(f => f && typeof f === 'string' && f.trim() !== '')
                .sort((a, b) => a.localeCompare(b));
            res.json(cleanedFamilies);
        } catch (error) {
            console.error("Erro ao buscar famílias no MongoDB:", error);
            res.status(500).json({ error: "Erro interno do servidor ao buscar as famílias." });
        }
    } else {
        const families = [...new Set(elementosData.map(el => el.familia))].filter(Boolean).sort();
        res.json(families);
    }
});

router.post("/elementos/submeter", async (req, res) => {
    const { name } = req.body;
    if (!name || name.trim() === '') {
        return res.status(400).json({ error: "O nome do elemento não pode ser vazio." });
    }
    const normalizedName = normalizeString(name);

    let element = null;

    if (isMongoConnected) {
        try {
            const database = getDb().db(dbName);
            const collection = database.collection(collectionName);
            
            element = await collection.findOne({ simbolo: { $regex: `^${normalizedName}$`, $options: "i" } });
            
            if (!element) {
                element = await collection.findOne({
                    $or: [
                        { nome: { $regex: `^${normalizedName}$`, $options: "i" } },
                        { palavras_chave: { $regex: `\\b${normalizedName}\\b`, $options: "i" } }
                    ]
                });
            }
        } catch (error) {
            console.error("Erro ao submeter elemento no MongoDB:", error);
            return res.status(500).json({ error: "Erro interno do servidor ao verificar o elemento." });
        }
    } else {
        element = elementosData.find(el => normalizeString(el.simbolo) === normalizedName);
        
        if (!element) {
            element = elementosData.find(el => 
                normalizeString(el.nome) === normalizedName ||
                (el.palavras_chave && el.palavras_chave.some(kw => normalizeString(kw) === normalizedName))
            );
        }
    }

    if (element) {
        const alreadyFound = foundElements.some(e => e.simbolo === element.simbolo);
        if (alreadyFound) {
            return res.status(200).json({ message: `Elemento '${element.nome}' (${element.simbolo}) já foi encontrado!`, element: element });
        } else {
            foundElements.push(element);
            return res.status(200).json({ message: `Parabéns! Você encontrou o elemento '${element.nome}' (${element.simbolo})!`, element: element });
        }
    } else {
        return res.status(404).json({ error: "Elemento não encontrado. Tente novamente!" });
    }
});

router.get("/elementos/encontrados", (req, res) => {
    res.json(foundElements);
});

router.post("/quiz/salvar", async (req, res) => {
    if (!isMongoConnected) {
        return res.status(500).json({ error: "O salvamento de quiz requer uma conexão ativa com o banco de dados. Tente novamente quando a conexão estiver disponível." });
    }
    
    const { acertos, elementos } = req.body;

    if (acertos === undefined || !elementos || !Array.isArray(elementos)) {
        return res.status(400).json({ error: "Dados incompletos ou inválidos para salvar o quiz." });
    }

    try {
        const database = getDb().db(dbName);
        const quizSavesCollection = database.collection('quiz_saves');

        const quizDataToSave = {
            dateTime: new Date().toISOString(), 
            acertos: acertos,
            elementos: elementos.map(el => ({ simbolo: el.simbolo, nome: el.nome })) 
        };

        const result = await quizSavesCollection.insertOne(quizDataToSave);

        const totalQuizSaves = await quizSavesCollection.countDocuments();

        let elementStats = [];
        if (totalQuizSaves > 0) {
            elementStats = await quizSavesCollection.aggregate([
                { $unwind: "$elementos" },
                {
                    $group: {
                        _id: "$elementos.simbolo", 
                        nome: { $first: "$elementos.nome" },
                        count: { $sum: 1 } 
                    }
                },
                {
                    $project: {
                        _id: 0,
                        simbolo: "$_id",
                        nome: 1,
                        porcentagem: {
                            $round: [{
                                $multiply: [{ $divide: ["$count", totalQuizSaves] }, 100]
                            }, 2]
                        }
                    }
                },
                { $sort: { porcentagem: -1, nome: 1 } }
            ]).toArray();
        }

        res.status(201).json({
            message: "Progresso do quiz salvo com sucesso!",
            id: result.insertedId,
            estatisticas: elementStats
        });

    } catch (error) {
        console.error("Erro ao salvar progresso do quiz:", error);
        res.status(500).json({ error: "Erro interno ao salvar o progresso do quiz." });
    }
});

module.exports = router;