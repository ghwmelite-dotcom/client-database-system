import { Hono } from 'hono';

export function createNotesRoutes(db) {
  const router = new Hono();

  // Add note to client
  router.post('/:clientId/notes', async (c) => {
    try {
      const user = c.get('user');
      const { clientId } = c.req.param();
      const { note_text, note_type, is_private } = await c.req.json();

      if (!note_text || note_text.trim().length === 0) {
        return c.json({ error: 'Note text is required' }, 400);
      }

      // Verify client exists
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
      return c.json({ error: 'Failed to add note', details: error.message }, 500);
    }
  });

  // Get notes for client
  router.get('/:clientId/notes', async (c) => {
    try {
      const { clientId } = c.req.param();
      const { type, limit = '50', offset = '0' } = c.req.query();

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
      return c.json({ error: 'Failed to retrieve notes', details: error.message }, 500);
    }
  });

  // Delete note
  router.delete('/notes/:noteId', async (c) => {
    try {
      const { noteId } = c.req.param();

      const result = await db.prepare(
        'DELETE FROM notes WHERE id = ?'
      ).bind(noteId).run();

      if (result.meta.changes === 0) {
        return c.json({ error: 'Note not found' }, 404);
      }

      return c.json({ message: 'Note deleted successfully' });
    } catch (error) {
      return c.json({ error: 'Failed to delete note', details: error.message }, 500);
    }
  });

  return router;
}