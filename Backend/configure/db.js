const { MongoClient } = require('mongodb');
require('dotenv').config();

const credentials = process.env.PATH_TO_PEM

const client = new MongoClient(process.env.DB_CONNECTION, {
  sslKey: credentials,
  sslCert: credentials
});
let db; 
const dbconnection = client.connect();
const database = client.db(process.env.DB_NAME);
const collection = database.collection(process.env.COLLECTION);
console.log(`Connected to DB ... `);

module.exports.client = client;
module.exports.dbconnection = dbconnection;
module.exports.database = database;
module.exports.collection = collection;

async function connectDB() {
  if (db) return db;
  await client.connect();
  db = client.db('photobooth');

  await db.collection('photos').createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: 300 }
  );

  console.log('MongoDB verbunden, TTL-Index aktiv');
  return db;
}

module.exports.connectDB = connectDB; // [PRÜFEN] steht das schon so bei dir drin?
