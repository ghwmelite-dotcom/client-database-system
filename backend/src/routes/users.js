// ========================================
// USER MANAGEMENT ROUTES
// ========================================

app.get('/api/users', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const db = c.env.DB;

    // Only admins can view all users
    if (user.role !== 'admin') {
      return c.json({ error: 'Unauthorized - Admin access required' }, 403);
    }

    const { results } = await db.prepare(
      'SELECT id, username, email, role, is_active, created_at, last_login FROM users ORDER BY created_at DESC'
    ).all();

    return c.json({ users: results });
  } catch (error) {
    console.error('Get users error:', error);
    return c.json({ error: 'Failed to retrieve users', details: error.message }, 500);
  }
});

app.post('/api/users', requireAuth, async (c) => {
  try {
    const currentUser = c.get('user');
    const { username, email, password, role, is_active } = await c.req.json();
    const db = c.env.DB;
    const auth = new Auth(c.env.JWT_SECRET);

    // Only admins can create users
    if (currentUser.role !== 'admin') {
      return c.json({ error: 'Unauthorized - Admin access required' }, 403);
    }

    if (!username || !password || !email) {
      return c.json({ error: 'Username, password, and email required' }, 400);
    }

    const existingUser = await db.prepare(
      'SELECT id FROM users WHERE username = ? OR email = ?'
    ).bind(username, email).first();

    if (existingUser) {
      return c.json({ error: 'Username or email already exists' }, 409);
    }

    const passwordHash = await auth.hashPassword(password);

    const result = await db.prepare(
      'INSERT INTO users (username, password_hash, email, role, is_active) VALUES (?, ?, ?, ?, ?)'
    ).bind(username, passwordHash, email, role || 'user', is_active ? 1 : 0).run();

    return c.json({
      message: 'User created successfully',
      userId: result.meta.last_row_id
    }, 201);
  } catch (error) {
    console.error('Create user error:', error);
    return c.json({ error: 'Failed to create user', details: error.message }, 500);
  }
});

app.put('/api/users/:id', requireAuth, async (c) => {
  try {
    const currentUser = c.get('user');
    const { id } = c.req.param();
    const { email, password, role, is_active } = await c.req.json();
    const db = c.env.DB;
    const auth = new Auth(c.env.JWT_SECRET);

    // Only admins can update users
    if (currentUser.role !== 'admin') {
      return c.json({ error: 'Unauthorized - Admin access required' }, 403);
    }

    const existingUser = await db.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).bind(id).first();

    if (!existingUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    let passwordHash = existingUser.password_hash;
    if (password && password.trim()) {
      passwordHash = await auth.hashPassword(password);
    }

    await db.prepare(`
      UPDATE users SET
        email = ?,
        password_hash = ?,
        role = ?,
        is_active = ?
      WHERE id = ?
    `).bind(
      email || existingUser.email,
      passwordHash,
      role || existingUser.role,
      is_active ? 1 : 0,
      id
    ).run();

    return c.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    return c.json({ error: 'Failed to update user', details: error.message }, 500);
  }
});

app.patch('/api/users/:id/status', requireAuth, async (c) => {
  try {
    const currentUser = c.get('user');
    const { id } = c.req.param();
    const { is_active } = await c.req.json();
    const db = c.env.DB;

    // Only admins can update user status
    if (currentUser.role !== 'admin') {
      return c.json({ error: 'Unauthorized - Admin access required' }, 403);
    }

    const result = await db.prepare(
      'UPDATE users SET is_active = ? WHERE id = ?'
    ).bind(is_active ? 1 : 0, id).run();

    if (result.meta.changes === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ message: 'User status updated successfully' });
  } catch (error) {
    console.error('Update user status error:', error);
    return c.json({ error: 'Failed to update user status', details: error.message }, 500);
  }
});

app.delete('/api/users/:id', requireAuth, async (c) => {
  try {
    const currentUser = c.get('user');
    const { id } = c.req.param();
    const db = c.env.DB;

    // Only admins can delete users
    if (currentUser.role !== 'admin') {
      return c.json({ error: 'Unauthorized - Admin access required' }, 403);
    }

    // Prevent deleting yourself
    if (currentUser.id.toString() === id.toString()) {
      return c.json({ error: 'Cannot delete your own account' }, 400);
    }

    const result = await db.prepare(
      'DELETE FROM users WHERE id = ?'
    ).bind(id).run();

    if (result.meta.changes === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    return c.json({ error: 'Failed to delete user', details: error.message }, 500);
  }
});

