import { Router } from 'express';
import jwt from 'jsonwebtoken';
import db from '../db.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-for-travelmate';

// Middleware to authenticate JWT
const authenticate = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
};

router.use(authenticate);

// Profile
router.get('/profile', (req: any, res) => {
  const user = db.prepare('SELECT id, username, email, bio, preferences FROM users WHERE id = ?').get(req.user.userId);
  res.json(user);
});

router.put('/profile', (req: any, res) => {
  const { bio, preferences } = req.body;
  db.prepare('UPDATE users SET bio = ?, preferences = ? WHERE id = ?').run(bio, JSON.stringify(preferences), req.user.userId);
  res.json({ message: 'Profile updated' });
});

// Trips
router.get('/trips', (req: any, res) => {
  const trips = db.prepare('SELECT * FROM trips WHERE user_id = ?').all(req.user.userId);
  res.json(trips);
});

router.post('/trips', (req: any, res) => {
  const { destination, start_date, end_date, notes } = req.body;
  const info = db.prepare('INSERT INTO trips (user_id, destination, start_date, end_date, notes) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.userId, destination, start_date, end_date, notes);
  res.json({ id: info.lastInsertRowid, destination, start_date, end_date, notes });
});

router.delete('/trips/:id', (req: any, res) => {
  db.prepare('DELETE FROM trips WHERE id = ? AND user_id = ?').run(req.params.id, req.user.userId);
  res.json({ message: 'Trip deleted' });
});

// Buddy Finder (Mock Algorithm)
router.get('/buddies', (req: any, res) => {
  // Find users who are not the current user, mock compatibility
  const potentialBuddies = db.prepare(`
    SELECT id, username, bio, preferences 
    FROM users 
    WHERE id != ?
    LIMIT 10
  `).all(req.user.userId) as any[];

  const buddiesWithScore = potentialBuddies.map(buddy => ({
    ...buddy,
    compatibility_score: Math.floor(Math.random() * 40) + 60, // Random score 60-100
    preferences: buddy.preferences ? JSON.parse(buddy.preferences) : []
  })).sort((a, b) => b.compatibility_score - a.compatibility_score);

  res.json(buddiesWithScore);
});

// Matches
router.get('/matches', (req: any, res) => {
  const matches = db.prepare(`
    SELECT bm.id, bm.compatibility_score, bm.status, u.username, u.id as buddy_id
    FROM buddy_matches bm
    JOIN users u ON (bm.user1_id = u.id OR bm.user2_id = u.id)
    WHERE (bm.user1_id = ? OR bm.user2_id = ?) AND u.id != ?
  `).all(req.user.userId, req.user.userId, req.user.userId);
  res.json(matches);
});

router.post('/matches', (req: any, res) => {
  const { buddy_id } = req.body;
  const info = db.prepare('INSERT INTO buddy_matches (user1_id, user2_id, compatibility_score, status) VALUES (?, ?, ?, ?)')
    .run(req.user.userId, buddy_id, Math.floor(Math.random() * 40) + 60, 'connected');
  res.json({ id: info.lastInsertRowid, message: 'Match created' });
});

export default router;
