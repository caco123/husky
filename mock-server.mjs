import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import chalk from 'chalk';
import { watch } from 'chokidar';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { App } from '@tinyhttp/app';
import { createApp } from 'json-server/lib/app.js';
import { Observer } from 'json-server/lib/adapters/observer.js';
import { NormalizedAdapter } from 'json-server/lib/adapters/normalized-adapter.js';

const DB_FILE = resolve(process.cwd(), process.env.DB_FILE || 'db.json');
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || 'localhost';

// Ensure db file exists
if (!existsSync(DB_FILE)) {
  console.log(chalk.yellow(`Warning: ${DB_FILE} not found. Initializing empty database.`));
  writeFileSync(DB_FILE, JSON.stringify({ users: [] }, null, 2));
}

// Lowdb database with Observer adapter for file sync
const adapter = new JSONFile(DB_FILE);
const observer = new Observer(new NormalizedAdapter(adapter));
const db = new Low(observer, { users: [] });
await db.read();

if (!db.data.users) {
  db.data.users = [];
  await db.write();
}

// Create base json-server app (includes CORS, sirv static files, json body parser, home page)
const app = createApp(db, { logger: false });

// Custom router to satisfy dummy-openapi contract
const openApiRouter = new App();

// 1. GET /users (Supports page, limit, search query parameters and returns UserListResponse)
openApiRouter.get('/users', (req, res) => {
  const pageRaw = req.query.page ?? req.query._page;
  const limitRaw = req.query.limit ?? req.query._per_page;
  const search = (req.query.search ?? req.query.q ?? '').toString().trim().toLowerCase();

  const page = Math.max(1, parseInt(pageRaw || '1', 10) || 1);
  const limit = Math.max(1, parseInt(limitRaw || '10', 10) || 10);

  let filtered = [...(db.data.users || [])];

  if (search) {
    filtered = filtered.filter((u) => {
      const username = (u.username || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const firstName = (u.firstName || '').toLowerCase();
      const lastName = (u.lastName || '').toLowerCase();
      const role = (u.role || '').toLowerCase();
      return (
        username.includes(search) ||
        email.includes(search) ||
        firstName.includes(search) ||
        lastName.includes(search) ||
        role.includes(search)
      );
    });
  }

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const startIndex = (page - 1) * limit;
  const paginatedUsers = filtered.slice(startIndex, startIndex + limit);

  // Return UserListResponse expected by dummy-openapi
  res.json({
    users: paginatedUsers,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
    },
  });
});

// 2. GET /users/:id (Returns UserResponse or 404 ErrorResponse)
openApiRouter.get('/users/:id', (req, res) => {
  const { id } = req.params;
  const user = db.data.users?.find((u) => u.id === id);

  if (!user) {
    return res.status(404).json({
      error: `User with id "${id}" was not found`,
      code: 'USER_NOT_FOUND',
      details: { userId: id },
    });
  }

  res.json(user);
});

// 3. POST /users (Accepts CreateUserRequest and returns UserResponse with HTTP 201)
openApiRouter.post('/users', async (req, res) => {
  const body = req.body || {};
  const { username, email, firstName, lastName, role } = body;

  if (!username || !email || !firstName || !lastName) {
    return res.status(400).json({
      error: 'Missing required fields: username, email, firstName, lastName',
      code: 'VALIDATION_ERROR',
    });
  }

  const exists = db.data.users?.some(
    (u) => u.username?.toLowerCase() === username.toLowerCase() || u.email?.toLowerCase() === email.toLowerCase(),
  );

  if (exists) {
    return res.status(409).json({
      error: 'A user with the specified username or email already exists',
      code: 'USER_ALREADY_EXISTS',
    });
  }

  const now = new Date().toISOString();
  const newUser = {
    id: randomUUID(),
    username,
    email,
    firstName,
    lastName,
    role: role || 'user',
    isActive: body.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };

  db.data.users.push(newUser);
  await db.write();

  res.status(201).json(newUser);
});

// 4. PUT /users/:id (Accepts UpdateUserRequest, updates fields and returns updated UserResponse)
openApiRouter.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  const userIndex = db.data.users?.findIndex((u) => u.id === id);

  if (userIndex === -1 || userIndex === undefined) {
    return res.status(404).json({
      error: `User with id "${id}" was not found`,
      code: 'USER_NOT_FOUND',
      details: { userId: id },
    });
  }

  const existing = db.data.users[userIndex];
  const updatedUser = {
    ...existing,
    email: body.email !== undefined ? body.email : existing.email,
    firstName: body.firstName !== undefined ? body.firstName : existing.firstName,
    lastName: body.lastName !== undefined ? body.lastName : existing.lastName,
    role: body.role !== undefined ? body.role : existing.role,
    isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
    updatedAt: new Date().toISOString(),
  };

  db.data.users[userIndex] = updatedUser;
  await db.write();

  res.json(updatedUser);
});

// 5. DELETE /users/:id (Removes user from db.json and returns 200)
openApiRouter.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  const userIndex = db.data.users?.findIndex((u) => u.id === id);

  if (userIndex === -1 || userIndex === undefined) {
    return res.status(404).json({
      error: `User with id "${id}" was not found`,
      code: 'USER_NOT_FOUND',
      details: { userId: id },
    });
  }

  const [deletedUser] = db.data.users.splice(userIndex, 1);
  await db.write();

  res.json({
    message: 'User deleted successfully',
    id: deletedUser.id,
  });
});

// Splice our custom routes before the generic '/:name' route in json-server's middleware stack
const genericNameIndex = app.middleware.findIndex((m) => m.path === '/:name');
if (genericNameIndex !== -1) {
  app.middleware.splice(genericNameIndex, 0, ...openApiRouter.middleware);
} else {
  app.middleware.push(...openApiRouter.middleware);
}

// Watch db.json file for changes
let isWriting = false;
observer.onWriteStart = () => {
  isWriting = true;
};
observer.onWriteEnd = () => {
  isWriting = false;
};

watch(DB_FILE, { ignoreInitial: true }).on('change', () => {
  if (!isWriting) {
    db.read().catch((err) => {
      console.error(chalk.red(`Error reading ${DB_FILE}:`), err.message);
    });
  }
});

// Start the server
const server = app.listen(PORT, HOST, () => {
  console.log('\n' + chalk.bold.cyan('╔════════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║   🚀 JSON-Server Mock adaptado para dummy-openapi          ║'));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════════╝'));
  console.log(`${chalk.green('✔')} Servidor activo en: ${chalk.bold.underline(`http://${HOST}:${PORT}`)}`);
  console.log(`${chalk.green('✔')} Archivo de base de datos: ${chalk.yellow(DB_FILE)}`);
  console.log(`\n${chalk.bold('Endpoints configurados para UsersService:')}`);
  console.log(`  ${chalk.blue('GET')}    /users              ${chalk.gray('(Filtros: ?page=1&limit=10&search=term)')}`);
  console.log(`  ${chalk.blue('GET')}    /users/:id          ${chalk.gray('(Detalle por UUID de usuario)')}`);
  console.log(`  ${chalk.green('POST')}   /users              ${chalk.gray('(Crea usuario con UUID y timestamps)')}`);
  console.log(`  ${chalk.yellow('PUT')}    /users/:id          ${chalk.gray('(Actualiza datos y updatedAt)')}`);
  console.log(`  ${chalk.red('DELETE')} /users/:id          ${chalk.gray('(Elimina usuario)')}`);
  console.log(`\n${chalk.bold('Index web:')} ${chalk.gray(`http://${HOST}:${PORT}/`)}`);
  console.log(chalk.gray('Presiona Ctrl+C para detener.\n'));
});

export { app, server, db };
