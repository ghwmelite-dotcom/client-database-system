export const authMiddleware = (auth) => {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization');
    
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
  };
};

export const adminOnly = async (c, next) => {
  const user = c.get('user');
  
  if (user.role !== 'admin') {
    return c.json({ error: 'Forbidden - Admin access required' }, 403);
  }

  await next();
};