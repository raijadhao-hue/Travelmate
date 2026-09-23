import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import crypto from 'crypto';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-for-travelmate';

router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const stmt = db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)');
    const info = stmt.run(username, email, hashedPassword);
    
    const token = jwt.sign({ userId: info.lastInsertRowid }, JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ token, user: { id: info.lastInsertRowid, username, email } });
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = stmt.get(email) as any;

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, bio: user.bio, preferences: user.preferences } });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  try {
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as any;
    if (!user) {
      // Return success even if user not found to prevent email enumeration
      return res.json({ message: 'If an account exists, a reset link has been sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now

    db.prepare('INSERT INTO reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)')
      .run(user.id, token, expiresAt);

    // In a real app, send email here. For now, we'll just return the token for testing.
    res.json({ message: 'Reset token generated', token }); 
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    const resetRecord = db.prepare('SELECT * FROM reset_tokens WHERE token = ? AND expires_at > ?')
      .get(token, new Date().toISOString()) as any;

    if (!resetRecord) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    db.transaction(() => {
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashedPassword, resetRecord.user_id);
      db.prepare('DELETE FROM reset_tokens WHERE id = ?').run(resetRecord.id);
    })();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
