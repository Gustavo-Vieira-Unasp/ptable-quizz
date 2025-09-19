const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;
const collectionName = process.env.COLLECTION_NAME;

const elementosData = require('./data/elementos');

const app = express();
const port = process.env.PORT || 8081;

let dbClient;
let isMongoConnected = false;
let foundElements = [];
let elementosPreenchidosNoQuizz = new Set();

app.use(express.json());

function normalizeString(str) {
    if (typeof str !== 'string') {
        return '';
    }
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

async function tryConnectToMongo() {
    console.log("Tentando conectar ao MongoDB...");
    const connectPromise = new Promise(async (resolve, reject) => {
        try {
            dbClient = new MongoClient(uri, {
                serverApi: {
                    version: ServerApiVersion.v1,
                    strict: false,
                    deprecationErrors: true,
                },
            });
            await dbClient.connect();
            console.log("Conectado ao MongoDB!");
            isMongoConnected = true;
            resolve();
        } catch (error) {
            reject(error);
        }
    });

    const timeoutPromise = new Promise((resolve, reject) => {
        setTimeout(() => {
            reject(new Error("Timeout de 30 segundos atingido para conexão com MongoDB."));
        }, 30000);
    });

    try {
        await Promise.race([connectPromise, timeoutPromise]);
    } catch (error) {
        console.error("Erro ao conectar ao MongoDB:", error.message);
        console.warn("Usando dados de backup de 'elementos.js'.");
        isMongoConnected = false;
        dbClient = null;
    }
}

async function startServer() {
    await tryConnectToMongo();

    app.use(express.static(path.join(__dirname, "html")));
    app.use('/css', express.static(path.join(__dirname, 'css')));

    app.get("/", (req, res) => {
        res.sendFile(path.join(__dirname, "html", "index.html"));
    });

    app.get("/familias", async (req, res) => {
        if (isMongoConnected) {
            try {
                const database = dbClient.db(dbName);
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

    app.post("/elementos/submeter", async (req, res) => {
        const { name } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: "O nome do elemento não pode ser vazio." });
        }
        const normalizedName = normalizeString(name);

        let element = null;

        if (isMongoConnected) {
            try {
                const database = dbClient.db(dbName);
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

    app.get("/elementos/encontrados", (req, res) => {
        res.json(foundElements);
    });

    app.post("/quiz/salvar", async (req, res) => {
        if (!isMongoConnected) {
            return res.status(500).json({ error: "O salvamento de quiz requer uma conexão ativa com o banco de dados. Tente novamente quando a conexão estiver disponível." });
        }
        
        const { acertos, elementos } = req.body;
    
        if (acertos === undefined || !elementos || !Array.isArray(elementos)) {
            return res.status(400).json({ error: "Dados incompletos ou inválidos para salvar o quiz." });
        }
    
        try {
            const database = dbClient.db(dbName);
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

    app.listen(port, () => {
        console.log(`Servidor Rodando na porta ${port} :D`);
    });
}

startServer();

process.on('SIGINT', async () => {
    if (dbClient) {
        await dbClient.close();
        console.log('Conexão com MongoDB encerrada.');
    }
    process.exit(0);
});
