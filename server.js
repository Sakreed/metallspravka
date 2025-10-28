const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Сессии для админки
app.use(session({
    secret: 'your-secret-key-change-this',
    resave: false,
    saveUninitialized: false
}));

// Временное хранилище данных (потом заменим на БД)
let products = [
    { id: 1, name: 'Труба 20x20', price: 75000, unit: 'руб/тонна' },
    { id: 2, name: 'Арматура 12мм', price: 68000, unit: 'руб/тонна' }
];

// Простая "база" админов (пароль: admin123)
const admins = {
    admin: '$2a$10$CwTycUXKUPCPkpJRmDtFd.KjMxI5.V5V5tYj5yJLqQaFvtU7PCQm.'
};

// Middleware проверки авторизации
function requireAuth(req, res, next) {
    if (req.session && req.session.admin) {
        return next();
    } else {
        res.redirect('/admin/login');
    }
}

// Роуты админки
app.get('/admin/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});

app.post('/admin/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (admins[username] && await bcrypt.compare(password, admins[username])) {
        req.session.admin = username;
        res.redirect('/admin');
    } else {
        res.redirect('/admin/login?error=1');
    }
});

app.get('/admin', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});

app.get('/admin/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});

// API для админки
app.get('/api/admin/products', requireAuth, (req, res) => {
    res.json(products);
});

app.post('/api/admin/products', requireAuth, (req, res) => {
    const newProduct = {
        id: Date.now(),
        ...req.body
    };
    products.push(newProduct);
    res.json(newProduct);
});

app.delete('/api/admin/products/:id', requireAuth, (req, res) => {
    products = products.filter(p => p.id != req.params.id);
    res.json({ success: true });
});

// Публичное API
app.get('/api/products', (req, res) => {
    res.json(products);
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});