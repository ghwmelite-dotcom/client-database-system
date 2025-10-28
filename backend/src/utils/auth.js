import bcrypt from 'bcryptjs';

export class Auth {
  constructor(jwtSecret) {
    this.jwtSecret = jwtSecret;
  }

  async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }

  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  async generateToken(userId, username, role) {
    const payload = {
      userId,
      username,
      role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };

    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const base64Header = btoa(JSON.stringify(header)).replace(/=/g, '');
    const base64Payload = btoa(JSON.stringify(payload)).replace(/=/g, '');
    const signature = await this.sign(`${base64Header}.${base64Payload}`, this.jwtSecret);
    
    return `${base64Header}.${base64Payload}.${signature}`;
  }

  async verifyToken(token) {
    try {
      const [header, payload, signature] = token.split('.');
      
      const expectedSignature = await this.sign(`${header}.${payload}`, this.jwtSecret);
      
      if (signature !== expectedSignature) {
        return null;
      }

      const decodedPayload = JSON.parse(atob(payload));
      
      if (decodedPayload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return decodedPayload;
    } catch (error) {
      return null;
    }
  }

  async sign(data, secret) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(data)
    );
    
    return btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '');
  }
}