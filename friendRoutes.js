const express = require('express');
const router = express.Router();
const db = require('../db');
const FriendModel = require('../models/friendModel');
const ensureAuth = require('../Middleware/authMiddleware');

// 1) Send a friend request
router.post('/friends/request', ensureAuth, async (req, res) => {
  const fromId = req.user.userId;
  const { toUsername } = req.body;

  try {
    // Get recipient ID from username
    const [rows] = await db.query('SELECT id FROM users WHERE username = ?', [toUsername]);
    if (!rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    const toId = rows[0].id;

    // Check for existing request (in either direction)
    const [existing] = await db.query(
      'SELECT * FROM friend_requests WHERE ((from_user = ? AND to_user = ?) OR (from_user = ? AND to_user = ?)) AND status = "pending"',
      [fromId, toId, toId, fromId]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Friend request already pending' });
    }

    await FriendModel.sendFriendRequest(fromId, toId);
    req.io.to(toUsername).emit('friend-request-received', { fromId });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 2) Get incoming & outgoing requests
router.get('/friends/requests', ensureAuth, async (req, res) => {
  const userId = req.user.userId;
  try {
    const incoming = await FriendModel.getFriendRequests(userId);
    const outgoing = await FriendModel.getPendingRequests(userId);
    res.json({ incoming, outgoing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3) Accept request
router.post('/friends/request/:fromId/accept', ensureAuth, async (req, res) => {
  const toId = req.user.userId;
  const fromId = parseInt(req.params.fromId);
  try {
    await FriendModel.respondToFriendRequest(fromId, toId, true);
    req.io.to(fromId).emit('friend-request-accepted', { by: toId });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 4) Decline request
router.post('/friends/request/:fromId/decline', ensureAuth, async (req, res) => {
  const toId = req.user.userId;
  const fromId = parseInt(req.params.fromId);
  try {
    await FriendModel.respondToFriendRequest(fromId, toId, false);
    req.io.to(fromId).emit('friend-request-declined', { by: toId });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 5) Remove a friend
router.delete('/friends/:friendId', ensureAuth, async (req, res) => {
  const userA = req.user.userId;
  const userB = parseInt(req.params.friendId);
  try {
    await FriendModel.removeFriend(userA, userB);
    req.io.to(userB).emit('friend-removed', { by: userA });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 6) Get current user's friend list
router.get('/friends', ensureAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const friends = await FriendModel.getFriendsList(userId);
    res.json(friends);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
