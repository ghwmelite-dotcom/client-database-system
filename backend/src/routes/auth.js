import { Hono } from 'hono';

export function createAuthRoutes(auth, db) {
  const router = new Hono();

  // Login
  router.post('/login', async (c) => {
    try {
      const { username, password } = await c.req.json();

      if (!username || !password) {
        return c.json({ error: 'Username and password required' }, 400);
      }

      const user = await db.prepare(
        'SELECT * FROM users WHERE username = ? AND is_active = 1'
      ).bind(username).first();

      if (!user || !(await auth.verifyPassword(password, user.password_hash))) {
        return c.json({ error: 'Invalid credentials' }, 401);
      }

      // Update last login
      await db.prepare(
        'UPDATE users SET last_login = datetime("now") WHERE id = ?'
      ).bind(user.id).run();

      const token = await auth.generateToken(user.id, user.username, user.role);

      return c.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      return c.json({ error: 'Login failed', details: error.message }, 500);
    }
  });

  // Register (admin only in production)
  router.post('/register', async (c) => {
    try {
      const { username, password, email, role } = await c.req.json();

      if (!username || !password || !email) {
        return c.json({ error: 'Username, password, and email required' }, 400);
      }

      // Check if user exists
      const existingUser = await db.prepare(
        'SELECT id FROM users WHERE username = ? OR email = ?'
      ).bind(username, email).first();

      if (existingUser) {
        return c.json({ error: 'Username or email already exists' }, 409);
      }

      const passwordHash = await auth.hashPassword(password);

      const result = await db.prepare(
        'INSERT INTO users (username, password_hash, email, role) VALUES (?, ?, ?, ?)'
      ).bind(username, passwordHash, email, role || 'user').run();

      return c.json({
        message: 'User created successfully',
        userId: result.meta.last_row_id
      }, 201);
    } catch (error) {
      return c.json({ error: 'Registration failed', details: error.message }, 500);
    }
  });

  // Verify token
  router.get('/verify', async (c) => {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'No token provided' }, 401);
    }

    const token = authHeader.substring(7);
    const decoded = await auth.verifyToken(token);
    
    if (!decoded) {
      return c.json({ error: 'Invalid token' }, 401);
    }

    return c.json({ valid: true, user: decoded });
  });

  return router;
}