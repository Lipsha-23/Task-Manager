const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const app = express();
app.use(cors());
app.use(express.json());

const users = [];           // { id, name, email, hash }
const tasks = [];           // { id, userId, title, description, priority, dueDate, completed, createdAt }
let nextId = 1;

const sign = (u) => jwt.sign({ sub: u.id }, SECRET, { expiresIn: '2h' });
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email });

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password || password.length < 6)
    return res.status(400).json({ message: 'Name, email and a password of 6+ characters are required.' });
  if (users.some((u) => u.email === email.toLowerCase()))
    return res.status(409).json({ message: 'That email is already registered.' });
  const user = { id: nextId++, name, email: email.toLowerCase(), hash: bcrypt.hashSync(password, 10) };
  users.push(user);
  res.status(201).json({ token: sign(user), user: publicUser(user) });
});

app.post('/api/auth/login', (req, res) => {
  const { email = '', password = '' } = req.body || {};
  const user = users.find((u) => u.email === email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.hash))
    return res.status(401).json({ message: 'Incorrect email or password.' });
  res.json({ token: sign(user), user: publicUser(user) });
});

// JWT middleware for everything below
app.use('/api/tasks', (req, res, next) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try { req.userId = jwt.verify(token, SECRET).sub; next(); }
  catch { res.status(401).json({ message: 'Session expired. Please sign in again.' }); }
});

const own = (req) => tasks.find((t) => t.id === +req.params.id && t.userId === req.userId);

app.get('/api/tasks', (req, res) => res.json(tasks.filter((t) => t.userId === req.userId)));

app.post('/api/tasks', (req, res) => {
  const { title, description = '', priority = 'medium', dueDate = null } = req.body || {};
  if (!title || title.trim().length < 3) return res.status(400).json({ message: 'Title must be at least 3 characters.' });
  const task = { id: nextId++, userId: req.userId, title: title.trim(), description, priority, dueDate, completed: false, createdAt: new Date().toISOString() };
  tasks.push(task);
  res.status(201).json(task);
});

app.put('/api/tasks/:id', (req, res) => {
  const task = own(req);
  if (!task) return res.status(404).json({ message: 'Task not found.' });
  const { title, description, priority, dueDate, completed } = req.body;
  Object.assign(task, { title, description, priority, dueDate, completed });
  res.json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
  const task = own(req);
  if (!task) return res.status(404).json({ message: 'Task not found.' });
  tasks.splice(tasks.indexOf(task), 1);
  res.status(204).end();
});

app.listen(3000, () => console.log('API running on http://localhost:3000'));
