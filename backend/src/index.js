import { Hono } from 'hono';
import { Encryption } from './utils/encryption';
import { Auth } from './utils/auth';
import { corsMiddleware } from './middleware/cors';

const app = new Hono();

// Apply CORS middleware globally
app.use('/*', corsMiddleware());

// Health check
app.get('/', (c) => {
  return c.json({
    service: 'Client Database API',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// TEMPORARY TEST ENDPOINT - Remove after testing
app.get('/api/test/hash', async (c) => {
  const auth = new Auth(c.env.JWT_SECRET);
  const password = 'Admin@123';
  const hash = await auth.hashPassword(password);
  
  return c.json({
    password: password,
    hash: hash,
    message: 'Use this hash in your database'
  });
});

app.get('/api/test/verify', async (c) => {
  const auth = new Auth(c.env.JWT_SECRET);
  const password = 'Admin@123';
  const dbHash = '$2a$10$8K1p/a0dL3LRJRcfcXZ1qeiSSqNWbAsKW5z1zP0xO3PQfH1vHZ8Pa';
  
  const isValid = await auth.verifyPassword(password, dbHash);
  
  return c.json({
    password: password,
    hash: dbHash,
    isValid: isValid,
    message: isValid ? 'Password matches!' : 'Password does not match'
  });
});

// ========================================
// AUTH ROUTES
// ========================================

app.post('/api/auth/login', async (c) => {
  try {
    const { username, password } = await c.req.json();
    const db = c.env.DB;
    const auth = new Auth(c.env.JWT_SECRET);

    if (!username || !password) {
      return c.json({ error: 'Username and password required' }, 400);
    }

    const user = await db.prepare(
      'SELECT * FROM users WHERE username = ? AND is_active = 1'
    ).bind(username).first();

    if (!user || !(await auth.verifyPassword(password, user.password_hash))) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

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
    console.error('Login error:', error);
    return c.json({ error: 'Login failed', details: error.message }, 500);
  }
});

app.post('/api/auth/register', async (c) => {
  try {
    const { username, password, email, role } = await c.req.json();
    const db = c.env.DB;
    const auth = new Auth(c.env.JWT_SECRET);

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
      'INSERT INTO users (username, password_hash, email, role) VALUES (?, ?, ?, ?)'
    ).bind(username, passwordHash, email, role || 'user').run();

    return c.json({
      message: 'User created successfully',
      userId: result.meta.last_row_id
    }, 201);
  } catch (error) {
    console.error('Registration error:', error);
    return c.json({ error: 'Registration failed', details: error.message }, 500);
  }
});

app.get('/api/auth/verify', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const auth = new Auth(c.env.JWT_SECRET);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'No token provided' }, 401);
    }

    const token = authHeader.substring(7);
    const decoded = await auth.verifyToken(token);
    
    if (!decoded) {
      return c.json({ error: 'Invalid token' }, 401);
    }

    return c.json({ valid: true, user: decoded });
  } catch (error) {
    console.error('Verify error:', error);
    return c.json({ error: 'Verification failed' }, 401);
  }
});

// ========================================
// AUTH MIDDLEWARE
// ========================================

const requireAuth = async (c, next) => {
  try {
    const authHeader = c.req.header('Authorization');
    const auth = new Auth(c.env.JWT_SECRET);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized - No token provided' }, 401);
    }

    const token = authHeader.substring(7);
    const decoded = await auth.verifyToken(token);
    
    if (!decoded) {
      return c.json({ error: 'Unauthorized - Invalid token' }, 401);
    }

    c.set('user', decoded);
    await next();
  } catch (error) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
};

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

// ========================================
// SETTINGS ROUTES
// ========================================

// Get current user profile
app.get('/api/settings/profile', requireAuth, async (c) => {
  try {
    const currentUser = c.get('user');
    const db = c.env.DB;

    const user = await db.prepare(
      'SELECT id, username, email, role, created_at, last_login FROM users WHERE id = ?'
    ).bind(currentUser.id).first();

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    return c.json({ error: 'Failed to retrieve profile', details: error.message }, 500);
  }
});

// Update user profile
app.put('/api/settings/profile', requireAuth, async (c) => {
  try {
    const currentUser = c.get('user');
    const { username, email } = await c.req.json();
    const db = c.env.DB;

    if (!username || !email) {
      return c.json({ error: 'Username and email are required' }, 400);
    }

    // Check if username or email already exists (excluding current user)
    const existingUser = await db.prepare(
      'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?'
    ).bind(username, email, currentUser.id).first();

    if (existingUser) {
      return c.json({ error: 'Username or email already exists' }, 409);
    }

    await db.prepare(
      'UPDATE users SET username = ?, email = ? WHERE id = ?'
    ).bind(username, email, currentUser.id).run();

    return c.json({ 
      message: 'Profile updated successfully',
      user: { username, email }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return c.json({ error: 'Failed to update profile', details: error.message }, 500);
  }
});

// Change password
app.put('/api/settings/password', requireAuth, async (c) => {
  try {
    const currentUser = c.get('user');
    const { currentPassword, newPassword } = await c.req.json();
    const db = c.env.DB;
    const auth = new Auth(c.env.JWT_SECRET);

    if (!currentPassword || !newPassword) {
      return c.json({ error: 'Current password and new password are required' }, 400);
    }

    if (newPassword.length < 8) {
      return c.json({ error: 'New password must be at least 8 characters' }, 400);
    }

    // Get user's current password hash
    const user = await db.prepare(
      'SELECT password_hash FROM users WHERE id = ?'
    ).bind(currentUser.id).first();

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Verify current password
    const isValidPassword = await auth.verifyPassword(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return c.json({ error: 'Current password is incorrect' }, 401);
    }

    // Hash new password
    const newPasswordHash = await auth.hashPassword(newPassword);

    // Update password
    await db.prepare(
      'UPDATE users SET password_hash = ? WHERE id = ?'
    ).bind(newPasswordHash, currentUser.id).run();

    return c.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return c.json({ error: 'Failed to change password', details: error.message }, 500);
  }
});

// Get user preferences
app.get('/api/settings/preferences', requireAuth, async (c) => {
  try {
    const currentUser = c.get('user');
    const db = c.env.DB;

    // Check if preferences table exists, if not create it
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        email_notifications BOOLEAN DEFAULT 1,
        sms_notifications BOOLEAN DEFAULT 0,
        dark_mode BOOLEAN DEFAULT 0,
        language TEXT DEFAULT 'en',
        timezone TEXT DEFAULT 'America/New_York',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id)
      )
    `).run();

    let preferences = await db.prepare(
      'SELECT * FROM user_preferences WHERE user_id = ?'
    ).bind(currentUser.id).first();

    // Create default preferences if they don't exist
    if (!preferences) {
      await db.prepare(`
        INSERT INTO user_preferences (user_id, email_notifications, sms_notifications, dark_mode, language, timezone)
        VALUES (?, 1, 0, 0, 'en', 'America/New_York')
      `).bind(currentUser.id).run();

      preferences = await db.prepare(
        'SELECT * FROM user_preferences WHERE user_id = ?'
      ).bind(currentUser.id).first();
    }

    return c.json({ 
      preferences: {
        emailNotifications: !!preferences.email_notifications,
        smsNotifications: !!preferences.sms_notifications,
        darkMode: !!preferences.dark_mode,
        language: preferences.language,
        timezone: preferences.timezone
      }
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    return c.json({ error: 'Failed to retrieve preferences', details: error.message }, 500);
  }
});

// Update user preferences
app.put('/api/settings/preferences', requireAuth, async (c) => {
  try {
    const currentUser = c.get('user');
    const { emailNotifications, smsNotifications, darkMode, language, timezone } = await c.req.json();
    const db = c.env.DB;

    // Ensure preferences table exists
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        email_notifications BOOLEAN DEFAULT 1,
        sms_notifications BOOLEAN DEFAULT 0,
        dark_mode BOOLEAN DEFAULT 0,
        language TEXT DEFAULT 'en',
        timezone TEXT DEFAULT 'America/New_York',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id)
      )
    `).run();

    // Check if preferences exist
    const existing = await db.prepare(
      'SELECT id FROM user_preferences WHERE user_id = ?'
    ).bind(currentUser.id).first();

    if (existing) {
      // Update existing preferences
      await db.prepare(`
        UPDATE user_preferences SET
          email_notifications = ?,
          sms_notifications = ?,
          dark_mode = ?,
          language = ?,
          timezone = ?,
          updated_at = datetime('now')
        WHERE user_id = ?
      `).bind(
        emailNotifications ? 1 : 0,
        smsNotifications ? 1 : 0,
        darkMode ? 1 : 0,
        language || 'en',
        timezone || 'America/New_York',
        currentUser.id
      ).run();
    } else {
      // Create new preferences
      await db.prepare(`
        INSERT INTO user_preferences (
          user_id, email_notifications, sms_notifications, dark_mode, language, timezone
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        currentUser.id,
        emailNotifications ? 1 : 0,
        smsNotifications ? 1 : 0,
        darkMode ? 1 : 0,
        language || 'en',
        timezone || 'America/New_York'
      ).run();
    }

    return c.json({ message: 'Preferences updated successfully' });
  } catch (error) {
    console.error('Update preferences error:', error);
    return c.json({ error: 'Failed to update preferences', details: error.message }, 500);
  }
});

// Get database statistics (Admin only)
app.get('/api/settings/database/stats', requireAuth, async (c) => {
  try {
    const currentUser = c.get('user');
    const db = c.env.DB;

    // Only admins can view database stats
    if (currentUser.role !== 'admin') {
      return c.json({ error: 'Unauthorized - Admin access required' }, 403);
    }

    const [clients, users, notes, files] = await Promise.all([
      db.prepare('SELECT COUNT(*) as count FROM clients').first(),
      db.prepare('SELECT COUNT(*) as count FROM users').first(),
      db.prepare('SELECT COUNT(*) as count FROM notes').first(),
      db.prepare('SELECT COUNT(*) as count FROM client_files').first()
    ]);

    return c.json({
      stats: {
        totalClients: clients.count,
        totalUsers: users.count,
        totalNotes: notes.count,
        totalFiles: files.count
      }
    });
  } catch (error) {
    console.error('Get database stats error:', error);
    return c.json({ error: 'Failed to retrieve database stats', details: error.message }, 500);
  }
});

// ========================================
// CLIENT ROUTES
// ========================================

app.post('/api/clients', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const db = c.env.DB;
    const encryption = new Encryption(c.env.ENCRYPTION_KEY);

    // Validation
    if (!body.first_name || !body.last_name || !body.telephone || 
        !body.date_of_birth || !body.social_security_number) {
      return c.json({ error: 'Required fields missing' }, 400);
    }

    // Encrypt SSN
    const encryptedSSN = await encryption.encrypt(body.social_security_number.replace(/\D/g, ''));

    const result = await db.prepare(`
      INSERT INTO clients (
        first_name, last_name, telephone, email, address, 
        city, state, zip_code, date_of_birth, social_security_number,
        status, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.first_name,
      body.last_name,
      body.telephone.replace(/\D/g, ''),
      body.email || null,
      body.address || null,
      body.city || null,
      body.state || null,
      body.zip_code || null,
      body.date_of_birth,
      encryptedSSN,
      body.status || 'active',
      user.username,
      user.username
    ).run();

    return c.json({
      message: 'Client created successfully',
      clientId: result.meta.last_row_id
    }, 201);
  } catch (error) {
    console.error('Create client error:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'Client with this telephone or SSN already exists' }, 409);
    }
    return c.json({ error: 'Failed to create client', details: error.message }, 500);
  }
});

app.get('/api/clients', requireAuth, async (c) => {
  try {
    const { search, status, limit = '50', offset = '0' } = c.req.query();
    const db = c.env.DB;
    const encryption = new Encryption(c.env.ENCRYPTION_KEY);

    let query = 'SELECT * FROM clients WHERE 1=1';
    const bindings = [];

    if (search) {
      query += ` AND (
        first_name LIKE ? OR 
        last_name LIKE ? OR 
        telephone LIKE ? OR
        date_of_birth LIKE ?
      )`;
      const searchTerm = `%${search}%`;
      bindings.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (status) {
      query += ' AND status = ?';
      bindings.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    bindings.push(parseInt(limit), parseInt(offset));

    const { results } = await db.prepare(query).bind(...bindings).all();

    // Decrypt SSNs for display (last 4 digits only)
    const clientsWithMaskedSSN = await Promise.all(
      results.map(async (client) => {
        try {
          const decryptedSSN = await encryption.decrypt(client.social_security_number);
          return {
            ...client,
            social_security_number: `***-**-${decryptedSSN.slice(-4)}`
          };
        } catch (error) {
          return {
            ...client,
            social_security_number: '***-**-****'
          };
        }
      })
    );

    return c.json({
      clients: clientsWithMaskedSSN,
      total: results.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get clients error:', error);
    return c.json({ error: 'Failed to retrieve clients', details: error.message }, 500);
  }
});

app.get('/api/clients/:id', requireAuth, async (c) => {
  try {
    const { id } = c.req.param();
    const db = c.env.DB;
    const encryption = new Encryption(c.env.ENCRYPTION_KEY);

    const client = await db.prepare(
      'SELECT * FROM clients WHERE id = ?'
    ).bind(id).first();

    if (!client) {
      return c.json({ error: 'Client not found' }, 404);
    }

    // Decrypt SSN (masked)
    try {
      const decryptedSSN = await encryption.decrypt(client.social_security_number);
      client.social_security_number = `***-**-${decryptedSSN.slice(-4)}`;
    } catch (error) {
      client.social_security_number = '***-**-****';
    }

    return c.json(client);
  } catch (error) {
    console.error('Get client error:', error);
    return c.json({ error: 'Failed to retrieve client', details: error.message }, 500);
  }
});

app.put('/api/clients/:id', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const { id } = c.req.param();
    const body = await c.req.json();
    const db = c.env.DB;
    const encryption = new Encryption(c.env.ENCRYPTION_KEY);

    const existingClient = await db.prepare(
      'SELECT * FROM clients WHERE id = ?'
    ).bind(id).first();

    if (!existingClient) {
      return c.json({ error: 'Client not found' }, 404);
    }

    let encryptedSSN = existingClient.social_security_number;
    if (body.social_security_number) {
      encryptedSSN = await encryption.encrypt(body.social_security_number.replace(/\D/g, ''));
    }

    await db.prepare(`
      UPDATE clients SET
        first_name = ?,
        last_name = ?,
        telephone = ?,
        email = ?,
        address = ?,
        city = ?,
        state = ?,
        zip_code = ?,
        date_of_birth = ?,
        social_security_number = ?,
        status = ?,
        updated_by = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      body.first_name,
      body.last_name,
      body.telephone.replace(/\D/g, ''),
      body.email || null,
      body.address || null,
      body.city || null,
      body.state || null,
      body.zip_code || null,
      body.date_of_birth,
      encryptedSSN,
      body.status || 'active',
      user.username,
      id
    ).run();

    return c.json({ message: 'Client updated successfully' });
  } catch (error) {
    console.error('Update client error:', error);
    return c.json({ error: 'Failed to update client', details: error.message }, 500);
  }
});

app.delete('/api/clients/:id', requireAuth, async (c) => {
  try {
    const { id } = c.req.param();
    const db = c.env.DB;

    const client = await db.prepare(
      'SELECT * FROM clients WHERE id = ?'
    ).bind(id).first();

    if (!client) {
      return c.json({ error: 'Client not found' }, 404);
    }

    await db.prepare('DELETE FROM clients WHERE id = ?').bind(id).run();

    return c.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Delete client error:', error);
    return c.json({ error: 'Failed to delete client', details: error.message }, 500);
  }
});

app.get('/api/clients/export/csv', requireAuth, async (c) => {
  try {
    const { status } = c.req.query();
    const db = c.env.DB;
    const encryption = new Encryption(c.env.ENCRYPTION_KEY);

    let query = 'SELECT * FROM clients WHERE 1=1';
    const bindings = [];

    if (status) {
      query += ' AND status = ?';
      bindings.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const { results } = await db.prepare(query).bind(...bindings).all();

    // Generate CSV with SSN and Notes
    let csv = 'ID,First Name,Last Name,Telephone,Email,Address,City,State,ZIP,Date of Birth,SSN,Status,Notes,Created At\n';

    for (const client of results) {
      // Decrypt SSN for export (masked for security)
      const decryptedSSN = await encryption.decrypt(client.social_security_number);
      const maskedSSN = `***-**-${decryptedSSN.slice(-4)}`;

      // Fetch all notes for this client
      const { results: notes } = await db.prepare(
        'SELECT note_text, note_type, created_at FROM notes WHERE client_id = ? ORDER BY created_at DESC'
      ).bind(client.id).all();

      // Combine notes into a single field with type and date
      const notesText = notes.map(n =>
        `[${n.note_type.toUpperCase()}] ${n.note_text} (${n.created_at})`
      ).join(' | ');

      csv += `${client.id},"${client.first_name}","${client.last_name}","${client.telephone}","${client.email || ''}","${client.address || ''}","${client.city || ''}","${client.state || ''}","${client.zip_code || ''}","${client.date_of_birth}","${maskedSSN}","${client.status}","${notesText.replace(/"/g, '""')}","${client.created_at}"\n`;
    }

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="clients-${Date.now()}.csv"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    return c.json({ error: 'Failed to export clients', details: error.message }, 500);
  }
});

// ========================================
// NOTES ROUTES
// ========================================

app.post('/api/clients/:clientId/notes', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const { clientId } = c.req.param();
    const { note_text, note_type, is_private } = await c.req.json();
    const db = c.env.DB;

    if (!note_text || note_text.trim().length === 0) {
      return c.json({ error: 'Note text is required' }, 400);
    }

    const client = await db.prepare(
      'SELECT id FROM clients WHERE id = ?'
    ).bind(clientId).first();

    if (!client) {
      return c.json({ error: 'Client not found' }, 404);
    }

    const result = await db.prepare(`
      INSERT INTO notes (client_id, note_text, note_type, created_by, is_private)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      clientId,
      note_text,
      note_type || 'general',
      user.username,
      is_private ? 1 : 0
    ).run();

    return c.json({
      message: 'Note added successfully',
      noteId: result.meta.last_row_id
    }, 201);
  } catch (error) {
    console.error('Add note error:', error);
    return c.json({ error: 'Failed to add note', details: error.message }, 500);
  }
});

app.get('/api/clients/:clientId/notes', requireAuth, async (c) => {
  try {
    const { clientId } = c.req.param();
    const { type, limit = '50', offset = '0' } = c.req.query();
    const db = c.env.DB;

    let query = 'SELECT * FROM notes WHERE client_id = ?';
    const bindings = [clientId];

    if (type) {
      query += ' AND note_type = ?';
      bindings.push(type);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    bindings.push(parseInt(limit), parseInt(offset));

    const { results } = await db.prepare(query).bind(...bindings).all();

    return c.json({
      notes: results,
      total: results.length
    });
  } catch (error) {
    console.error('Get notes error:', error);
    return c.json({ error: 'Failed to retrieve notes', details: error.message }, 500);
  }
});

app.delete('/api/notes/:noteId', requireAuth, async (c) => {
  try {
    const { noteId } = c.req.param();
    const db = c.env.DB;

    const result = await db.prepare(
      'DELETE FROM notes WHERE id = ?'
    ).bind(noteId).run();

    if (result.meta.changes === 0) {
      return c.json({ error: 'Note not found' }, 404);
    }

    return c.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Delete note error:', error);
    return c.json({ error: 'Failed to delete note', details: error.message }, 500);
  }
});

// ========================================
// FILES ROUTES
// ========================================

app.post('/api/clients/:clientId/files', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const { clientId } = c.req.param();
    const db = c.env.DB;
    const r2 = c.env.FILES;
    
    const formData = await c.req.formData();
    const file = formData.get('file');

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    const client = await db.prepare(
      'SELECT id FROM clients WHERE id = ?'
    ).bind(clientId).first();

    if (!client) {
      return c.json({ error: 'Client not found' }, 404);
    }

    const fileKey = `clients/${clientId}/${Date.now()}-${file.name}`;
    
    await r2.put(fileKey, file.stream(), {
      httpMetadata: {
        contentType: file.type
      }
    });

    const result = await db.prepare(`
      INSERT INTO client_files (client_id, file_name, file_key, file_type, file_size, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      clientId,
      file.name,
      fileKey,
      file.type,
      file.size,
      user.username
    ).run();

    return c.json({
      message: 'File uploaded successfully',
      fileId: result.meta.last_row_id,
      fileKey
    }, 201);
  } catch (error) {
    console.error('Upload file error:', error);
    return c.json({ error: 'Failed to upload file', details: error.message }, 500);
  }
});

app.get('/api/clients/:clientId/files', requireAuth, async (c) => {
  try {
    const { clientId } = c.req.param();
    const db = c.env.DB;

    const { results } = await db.prepare(
      'SELECT * FROM client_files WHERE client_id = ? ORDER BY uploaded_at DESC'
    ).bind(clientId).all();

    return c.json({ files: results });
  } catch (error) {
    console.error('Get files error:', error);
    return c.json({ error: 'Failed to retrieve files', details: error.message }, 500);
  }
});

app.get('/api/files/:fileId/download', requireAuth, async (c) => {
  try {
    const { fileId } = c.req.param();
    const db = c.env.DB;
    const r2 = c.env.FILES;

    const file = await db.prepare(
      'SELECT * FROM client_files WHERE id = ?'
    ).bind(fileId).first();

    if (!file) {
      return c.json({ error: 'File not found' }, 404);
    }

    const r2Object = await r2.get(file.file_key);

    if (!r2Object) {
      return c.json({ error: 'File not found in storage' }, 404);
    }

    return new Response(r2Object.body, {
      headers: {
        'Content-Type': file.file_type,
        'Content-Disposition': `attachment; filename="${file.file_name}"`,
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Download file error:', error);
    return c.json({ error: 'Failed to download file', details: error.message }, 500);
  }
});

app.delete('/api/files/:fileId', requireAuth, async (c) => {
  try {
    const { fileId } = c.req.param();
    const db = c.env.DB;
    const r2 = c.env.FILES;

    const file = await db.prepare(
      'SELECT * FROM client_files WHERE id = ?'
    ).bind(fileId).first();

    if (!file) {
      return c.json({ error: 'File not found' }, 404);
    }

    await r2.delete(file.file_key);
    await db.prepare('DELETE FROM client_files WHERE id = ?').bind(fileId).run();

    return c.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    return c.json({ error: 'Failed to delete file', details: error.message }, 500);
  }
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({
    error: 'Internal server error',
    details: err.message
  }, 500);
});

export default app;