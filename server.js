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
    secret: process.env.SESSION_SECRET || 'metallspravka-secret-key-2025',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,  // Измените на false
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Временное хранилище данных (потом заменим на БД)
let products = [
    { id: 1, name: 'Труба профильная 20x20x2', price: 75000, unit: 'руб/тонна' },
    { id: 2, name: 'Арматура А3 12мм', price: 68000, unit: 'руб/тонна' },
    { id: 3, name: 'Лист стальной 3мм', price: 82000, unit: 'руб/тонна' }
];

// Хранилище админов с хешированными паролями
// Пароль: admin123
const admins = {
    admin: '$2b$10$e6SvKzwn9encTvmlSzPhqOjAkUyh7yzRQrHCJVxv8lVNkdINGRXy2'
};

// Функция для создания нового админа (используйте локально для генерации хеша)
async function createAdmin(username, password) {
    const hash = await bcrypt.hash(password, 10);
    console.log(`Хеш для пользователя ${username}:`);
    console.log(hash);
    return hash;
}

// Middleware проверки авторизации
function requireAuth(req, res, next) {
    if (req.session && req.session.admin) {
        return next();
    } else {
        res.redirect('/admin/login');
    }
}

// ==================== ПУБЛИЧНЫЕ РОУТЫ ====================

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API для получения списка продуктов
app.get('/api/products', (req, res) => {
    res.json(products);
});

// ==================== РОУТЫ АДМИНКИ ====================

// Страница входа
app.get('/admin/login', (req, res) => {
    // Если уже авторизован, перенаправляем в админку
    if (req.session && req.session.admin) {
        return res.redirect('/admin');
    }
    res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});

// Обработка входа
app.post('/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        console.log('=== ОТЛАДКА ВХОДА ===');
        console.log('Username:', username);
        console.log('Password:', password);
        console.log('Body:', req.body);
        
        // Временно: простая проверка без bcrypt
        if (username === 'admin' && password === 'admin123') {
            req.session.admin = username;
            req.session.save((err) => {
                if (err) {
                    console.error('Ошибка сохранения сессии:', err);
                    return res.redirect('/admin/login?error=1');
                }
                console.log('Сессия сохранена, редирект на /admin');
                res.redirect('/admin');
            });
        } else {
            console.log('Неверные данные входа');
            res.redirect('/admin/login?error=1');
        }
    } catch (error) {
        console.error('Ошибка входа:', error);
        res.redirect('/admin/login?error=1');
    }
});

// Главная страница админки
app.get('/admin', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});

// Выход из админки
app.get('/admin/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Ошибка при выходе:', err);
        }
        res.redirect('/admin/login');
    });
});

// ==================== API АДМИНКИ ====================

// Получить все продукты (для админки)
app.get('/api/admin/products', (req, res) => {
    res.json(products);
});

// Добавить новый продукт
app.post('/api/admin/products', requireAuth, (req, res) => {
    try {
        const { name, price, unit } = req.body;
        
        // Валидация
        if (!name || !price || !unit) {
            return res.status(400).json({ error: 'Заполните все поля' });
        }
        
        const newProduct = {
            id: Date.now(),
            name: name.trim(),
            price: parseFloat(price),
            unit: unit.trim()
        };
        
        products.push(newProduct);
        console.log('Добавлен продукт:', newProduct);
        
        res.json(newProduct);
    } catch (error) {
        console.error('Ошибка добавления продукта:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Обновить продукт
app.put('/api/admin/products/:id', requireAuth, (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { name, price, unit } = req.body;
        
        const productIndex = products.findIndex(p => p.id === id);
        
        if (productIndex === -1) {
            return res.status(404).json({ error: 'Продукт не найден' });
        }
        
        products[productIndex] = {
            ...products[productIndex],
            name: name.trim(),
            price: parseFloat(price),
            unit: unit.trim()
        };
        
        console.log('Обновлен продукт:', products[productIndex]);
        res.json(products[productIndex]);
    } catch (error) {
        console.error('Ошибка обновления продукта:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Удалить продукт
app.delete('/api/admin/products/:id', requireAuth, (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const initialLength = products.length;
        
        products = products.filter(p => p.id !== id);
        
        if (products.length === initialLength) {
            return res.status(404).json({ error: 'Продукт не найден' });
        }
        
        console.log('Удален продукт с ID:', id);
        res.json({ success: true, message: 'Продукт удален' });
    } catch (error) {
        console.error('Ошибка удаления продукта:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ==================== ЗАПУСК СЕРВЕРА ====================

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log(`Локальный адрес: http://localhost:${PORT}`);
    console.log(`Админ панель: http://localhost:${PORT}/admin`);
});

// ==================== УТИЛИТЫ (для локального использования) ====================

// Раскомментируйте эту строку локально для генерации нового хеша пароля
// createAdmin('admin', 'admin123');