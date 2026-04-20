const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    try {
        await pool.query(
            'INSERT INTO companies (name, email, password) VALUES ($1, $2, $3)',
            [name, email, hashed]
        );
        res.json({ message: '註冊成功' });
    } catch (err) {
        res.status(400).json({ error: 'Email 已存在' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM companies WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: '帳號不存在' });
    const match = await bcrypt.compare(password, result.rows[0].password);
    if (!match) return res.status(401).json({ error: '密碼錯誤' });
    const token = jwt.sign({ id: result.rows[0].id }, process.env.JWT_SECRET);
    res.json({ token, name: result.rows[0].name });
});

app.post('/api/ingest', async (req, res) => {
    const { device_id, temperature, humidity, timestamp, alert } = req.body;
    try {
        await pool.query(
            `INSERT INTO raw_data (device_id, temperature, humidity, recorded_at, is_alert)
             VALUES ($1, $2, $3, $4, $5)`,
            [device_id, temperature, humidity, timestamp, alert || false]
        );
        res.json({ status: 'ok' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: '數據儲存失敗' });
    }
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
