export const validateClient = async (c, next) => {
  const body = await c.req.json();
  
  const errors = [];

  if (!body.first_name || body.first_name.trim().length === 0) {
    errors.push('First name is required');
  }

  if (!body.last_name || body.last_name.trim().length === 0) {
    errors.push('Last name is required');
  }

  if (!body.telephone || !/^\d{10}$/.test(body.telephone.replace(/\D/g, ''))) {
    errors.push('Valid 10-digit telephone number is required');
  }

  if (!body.date_of_birth || !/^\d{4}-\d{2}-\d{2}$/.test(body.date_of_birth)) {
    errors.push('Valid date of birth (YYYY-MM-DD) is required');
  }

  if (!body.social_security_number || !/^\d{9}$/.test(body.social_security_number.replace(/\D/g, ''))) {
    errors.push('Valid 9-digit social security number is required');
  }

  if (errors.length > 0) {
    return c.json({ error: 'Validation failed', details: errors }, 400);
  }

  c.set('validatedBody', body);
  await next();
};