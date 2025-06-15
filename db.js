// server/db.js

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 4000),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: {
    // Point to the CA cert you just downloaded
    ca: fs.readFileSync(path.join(__dirname, 'certs', 'isrgrootx1.pem')),
  },
});

module.exports = db;
