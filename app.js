const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;
const collectionName = process.env.COLLECTION_NAME;

const app = express();
const port = process.env.PORT || 8081;

let dbClient;
let foundElements = []; 
let elementosPreenchidosNoQuizz = new Set();

app.use(express.json());

function normalizeString(str) {
    if (typeof str !== 'string') {
        return '';
    }
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

async function connectToMongo() {
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
    } catch (error) {
        console.error("Erro ao conectar ao MongoDB:", error);
        process.exit(1);
    }
}

connectToMongo();

app.use(express.static(path.join(__dirname, "html")));
app.use('/css', express.static(path.join(__dirname, 'css')));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "html", "index.html"));
});

app.get("/familias", async (req, res) => {
    if (!dbClient || !dbClient.db(dbName)) {
        console.error("Tentativa de acessar DB sem conexão ativa na rota /familias.");
        return res.status(500).json({ error: "Conexão com o banco de dados não estabelecida." });
    }
    try {
        const database = dbClient.db(dbName);
        const collection = database.collection(collectionName);

        const families = await collection.distinct("familia");

        const cleanedFamilies = families
            .filter(f => f && typeof f === 'string' && f.trim() !== '')
            .sort((a, b) => a.localeCompare(b));

        res.json(cleanedFamilies);
    } catch (error) {
        console.error("Erro ao buscar famílias:", error);
        res.status(500).json({ error: "Erro interno do servidor ao buscar as famílias." });
    }
});


app.post("/elementos/submeter", async (req, res) => {
    if (!dbClient || !dbClient.db(dbName)) {
        return res.status(500).json({ error: "Conexão com o banco de dados não estabelecida." });
    }

    const { name } = req.body;
    if (!name || name.trim() === '') {
        return res.status(400).json({ error: "O nome do elemento não pode ser vazio." });
    }

    const normalizedName = normalizeString(name);

    try {
        const database = dbClient.db(dbName);
        const collection = database.collection(collectionName);

        let element = null;

        element = await collection.findOne({
            simbolo: { $regex: `^${normalizedName}$`, $options: "i" }
        });

        if (!element && normalizedName.length === 1) {
            return res.status(404).json({ error: "Elemento não encontrado. Para inputs de um único caractere, deve ser um símbolo exato." });
        }

        if (!element) {
            let nameKeywordQuery = [];

            if (normalizedName.length >= 2) {
                nameKeywordQuery.push({ nome: { $regex: `\\b${normalizedName}\\b`, $options: "i" } });
                nameKeywordQuery.push({ palavras_chave: { $regex: `\\b${normalizedName}\\b`, $options: "i" } });
            }

            if (nameKeywordQuery.length > 0) {
                 element = await collection.findOne({ $or: nameKeywordQuery });
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

    } catch (error) {
        console.error("Erro ao submeter elemento:", error);
        res.status(500).json({ error: "Erro interno do servidor ao verificar o elemento." });
    }
});

app.get("/elementos/encontrados", (req, res) => {
    res.json(foundElements);
});

app.post("/quiz/salvar", async (req, res) => {
    if (!dbClient || !dbClient.db(dbName)) {
        return res.status(500).json({ error: "Conexão com o banco de dados não estabelecida." });
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
        foundElements = [];

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

process.on('SIGINT', async () => {
    if (dbClient) {
        await dbClient.close();
        console.log('Conexão com MongoDB encerrada.');
    }
    process.exit(0);
});