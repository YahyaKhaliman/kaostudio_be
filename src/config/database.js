const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    timezone: "+07:00",
    dateStrings: true,
});

console.log("Koneksi ke database local berhasil dibuat.");

module.exports = {
    pool,
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,
};
