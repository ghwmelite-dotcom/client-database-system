import { Hono } from 'hono';

export function createClientRoutes(encryption, db) {
  const router = new Hono();

  // Create client
  router.post('/', async (c) => {
    try {
      const user = c.get('user');
      const body = c.get('validatedBody');

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

      // Log audit
      await db.prepare(`
        INSERT INTO audit_logs (user_id, action, table_name, record_id, changes)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        user.userId,
        'CREATE',
        'clients',
        result.meta.last_row_id,
        JSON.stringify({ created: body })
      ).run();

      return c.json({
        message: 'Client created successfully',
        clientId: result.meta.last_row_id
      }, 201);
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        return c.json({ error: 'Client with this telephone or SSN already exists' }, 409);
      }
      return c.json({ error: 'Failed to create client', details: error.message }, 500);
    }
  });

  // Search/List clients
  router.get('/', async (c) => {
    try {
      const { search, status, limit = '50', offset = '0' } = c.req.query();

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
          const decryptedSSN = await encryption.decrypt(client.social_security_number);
          return {
            ...client,
            social_security_number: `***-**-${decryptedSSN.slice(-4)}`
          };
        })
      );

      return c.json({
        clients: clientsWithMaskedSSN,
        total: results.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    } catch (error) {
      return c.json({ error: 'Failed to retrieve clients', details: error.message }, 500);
    }
  });

  // Get single client
  router.get('/:id', async (c) => {
    try {
      const { id } = c.req.param();

      const client = await db.prepare(
        'SELECT * FROM clients WHERE id = ?'
      ).bind(id).first();

      if (!client) {
        return c.json({ error: 'Client not found' }, 404);
      }

      // Decrypt SSN (masked)
      const decryptedSSN = await encryption.decrypt(client.social_security_number);
      client.social_security_number = `***-**-${decryptedSSN.slice(-4)}`;

      return c.json(client);
    } catch (error) {
      return c.json({ error: 'Failed to retrieve client', details: error.message }, 500);
    }
  });

  // Update client
  router.put('/:id', async (c) => {
    try {
      const user = c.get('user');
      const { id } = c.req.param();
      const body = c.get('validatedBody');

      // Check if client exists
      const existingClient = await db.prepare(
        'SELECT * FROM clients WHERE id = ?'
      ).bind(id).first();

      if (!existingClient) {
        return c.json({ error: 'Client not found' }, 404);
      }

      // Encrypt SSN if provided
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

      // Log audit
      await db.prepare(`
        INSERT INTO audit_logs (user_id, action, table_name, record_id, changes)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        user.userId,
        'UPDATE',
        'clients',
        id,
        JSON.stringify({ before: existingClient, after: body })
      ).run();

      return c.json({ message: 'Client updated successfully' });
    } catch (error) {
      return c.json({ error: 'Failed to update client', details: error.message }, 500);
    }
  });

  // Delete client
  router.delete('/:id', async (c) => {
    try {
      const user = c.get('user');
      const { id } = c.req.param();

      // Check if client exists
      const client = await db.prepare(
        'SELECT * FROM clients WHERE id = ?'
      ).bind(id).first();

      if (!client) {
        return c.json({ error: 'Client not found' }, 404);
      }

      await db.prepare('DELETE FROM clients WHERE id = ?').bind(id).run();

      // Log audit
      await db.prepare(`
        INSERT INTO audit_logs (user_id, action, table_name, record_id, changes)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        user.userId,
        'DELETE',
        'clients',
        id,
        JSON.stringify({ deleted: client })
      ).run();

      return c.json({ message: 'Client deleted successfully' });
    } catch (error) {
      return c.json({ error: 'Failed to delete client', details: error.message }, 500);
    }
  });

  // Export clients (CSV)
  router.get('/export/csv', async (c) => {
    try {
      const { status } = c.req.query();

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
        // Decrypt SSN for export (full SSN - masked for security)
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
          'Content-Disposition': `attachment; filename="clients-${Date.now()}.csv"`
        }
      });
    } catch (error) {
      return c.json({ error: 'Failed to export clients', details: error.message }, 500);
    }
  });

  // Import clients (CSV)
  router.post('/import/csv', async (c) => {
    try {
      const user = c.get('user');
      const body = await c.req.text();
      
      const lines = body.split('\n').filter(line => line.trim());
      const imported = [];
      const errors = [];

      // Skip header
      for (let i = 1; i < lines.length; i++) {
        try {
          const values = lines[i].match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
          
          if (values && values.length >= 10) {
            const [firstName, lastName, telephone, email, address, city, state, zip, dob, ssn] = 
              values.map(v => v.replace(/^"|"$/g, '').trim());

            const encryptedSSN = await encryption.encrypt(ssn.replace(/\D/g, ''));

            await db.prepare(`
              INSERT INTO clients (
                first_name, last_name, telephone, email, address,
                city, state, zip_code, date_of_birth, social_security_number,
                created_by, updated_by
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              firstName, lastName, telephone, email, address,
              city, state, zip, dob, encryptedSSN,
              user.username, user.username
            ).run();

            imported.push(i);
          }
        } catch (err) {
          errors.push({ line: i, error: err.message });
        }
      }

      return c.json({
        message: 'Import completed',
        imported: imported.length,
        errors: errors.length,
        details: errors
      });
    } catch (error) {
      return c.json({ error: 'Import failed', details: error.message }, 500);
    }
  });

  return router;
}