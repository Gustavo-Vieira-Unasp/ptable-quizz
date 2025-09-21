const { MongoClient, ServerApiVersion } = require("mongodb");
const dotenv = require("dotenv");

dotenv.config();

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;
const collectionName = process.env.COLLECTION_NAME;

let dbClient;
let isMongoConnected = false;

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

function getDb() {
    return dbClient;
}

module.exports = {
    tryConnectToMongo,
    dbClient,
    isMongoConnected,
    dbName,
    collectionName,
    getDb
};