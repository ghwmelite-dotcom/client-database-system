import { Hono } from 'hono';

export function createFilesRoutes(db, r2Bucket) {
  const router = new Hono();

  // Upload file
  router.post('/:clientId/files', async (c) => {
    try {
      const user = c.get('user');
      const { clientId } = c.req.param();
      
      const formData = await c.req.formData();
      const file = formData.get('file');

      if (!file) {
        return c.json({ error: 'No file provided' }, 400);
      }

      // Verify client exists
      const client = await db.prepare(
        'SELECT id FROM clients WHERE id = ?'
      ).bind(clientId).first();

      if (!client) {
        return c.json({ error: 'Client not found' }, 404);
      }

      // Generate unique file key
      const fileKey = `clients/${clientId}/${Date.now()}-${file.name}`;
      
      // Upload to R2
      await r2Bucket.put(fileKey, file.stream(), {
        httpMetadata: {
          contentType: file.type
        }
      });

      // Save file record
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
      return c.json({ error: 'Failed to upload file', details: error.message }, 500);
    }
  });

  // Get files for client
  router.get('/:clientId/files', async (c) => {
    try {
      const { clientId } = c.req.param();

      const { results } = await db.prepare(
        'SELECT * FROM client_files WHERE client_id = ? ORDER BY uploaded_at DESC'
      ).bind(clientId).all();

      return c.json({ files: results });
    } catch (error) {
      return c.json({ error: 'Failed to retrieve files', details: error.message }, 500);
    }
  });

  // Download file
  router.get('/files/:fileId/download', async (c) => {
    try {
      const { fileId } = c.req.param();

      const file = await db.prepare(
        'SELECT * FROM client_files WHERE id = ?'
      ).bind(fileId).first();

      if (!file) {
        return c.json({ error: 'File not found' }, 404);
      }

      const r2Object = await r2Bucket.get(file.file_key);

      if (!r2Object) {
        return c.json({ error: 'File not found in storage' }, 404);
      }

      return new Response(r2Object.body, {
        headers: {
          'Content-Type': file.file_type,
          'Content-Disposition': `attachment; filename="${file.file_name}"`
        }
      });
    } catch (error) {
      return c.json({ error: 'Failed to download file', details: error.message }, 500);
    }
  });

  // Delete file
  router.delete('/files/:fileId', async (c) => {
    try {
      const { fileId } = c.req.param();

      const file = await db.prepare(
        'SELECT * FROM client_files WHERE id = ?'
      ).bind(fileId).first();

      if (!file) {
        return c.json({ error: 'File not found' }, 404);
      }

      // Delete from R2
      await r2Bucket.delete(file.file_key);

      // Delete from database
      await db.prepare('DELETE FROM client_files WHERE id = ?').bind(fileId).run();

      return c.json({ message: 'File deleted successfully' });
    } catch (error) {
      return c.json({ error: 'Failed to delete file', details: error.message }, 500);
    }
  });

  return router;
}