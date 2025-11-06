const db = require('../database/db');

class ConversationController {
  // Get all conversations for a user
  async getUserConversations(req, res) {
    try {
      const userId = req.user.id;

      const result = await db.query(
        `SELECT c.id, c.type, c.name, c.created_at, c.updated_at,
         (SELECT json_agg(json_build_object(
           'id', u.id,
           'username', u.username,
           'avatarUrl', u.avatar_url,
           'status', u.status
         ))
         FROM conversation_participants cp2
         JOIN users u ON u.id = cp2.user_id
         WHERE cp2.conversation_id = c.id AND cp2.user_id != $1
         ) as participants,
         (SELECT json_build_object(
           'id', m.id,
           'content', m.content,
           'messageType', m.message_type,
           'createdAt', m.created_at,
           'senderId', m.sender_id
         )
         FROM messages m
         WHERE m.conversation_id = c.id AND m.deleted_at IS NULL
         ORDER BY m.created_at DESC
         LIMIT 1
         ) as "lastMessage",
         (SELECT COUNT(*)::int
         FROM messages m
         LEFT JOIN read_receipts rr ON rr.message_id = m.id AND rr.user_id = $1
         WHERE m.conversation_id = c.id
         AND m.sender_id != $1
         AND rr.id IS NULL
         ) as unreadCount
         FROM conversations c
         JOIN conversation_participants cp ON cp.conversation_id = c.id
         WHERE cp.user_id = $1
         GROUP BY c.id, c.type, c.name, c.created_at, c.updated_at
         ORDER BY c.updated_at DESC`,
        [userId]
      );

      res.json({ conversations: result.rows });
    } catch (error) {
      console.error('Get conversations error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Create or get direct conversation
  async createOrGetDirectConversation(req, res) {
    try {
      const userId = req.user.id;
      const { participantId } = req.body;

      if (!participantId) {
        return res.status(400).json({ error: 'Participant ID is required' });
      }

      if (participantId === userId) {
        return res
          .status(400)
          .json({ error: 'Cannot create conversation with yourself' });
      }

      // Check if conversation already exists
      const existingConv = await db.query(
        `SELECT c.id, c.type, c.created_at
         FROM conversations c
         JOIN conversation_participants cp1 ON cp1.conversation_id = c.id
         JOIN conversation_participants cp2 ON cp2.conversation_id = c.id
         WHERE c.type = 'direct'
         AND cp1.user_id = $1
         AND cp2.user_id = $2`,
        [userId, participantId]
      );

      if (existingConv.rows.length > 0) {
        return res.json({ conversation: existingConv.rows[0] });
      }

      // Create new conversation
      const convResult = await db.query(
        'INSERT INTO conversations (type, created_by) VALUES ($1, $2) RETURNING id, type, created_at',
        ['direct', userId]
      );

      const conversation = convResult.rows[0];

      // Add participants
      await db.query(
        'INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)',
        [conversation.id, userId, participantId]
      );

      res.status(201).json({ conversation });
    } catch (error) {
      console.error('Create conversation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get conversation messages
  async getConversationMessages(req, res) {
    try {
      const userId = req.user.id;
      const { conversationId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      // Verify user is participant
      const participantCheck = await db.query(
        'SELECT id FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
        [conversationId, userId]
      );

      if (participantCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get messages with read receipts
      const result = await db.query(
        `SELECT m.id, m.content, m.message_type, m.file_url, m.file_name,
         m.file_size, m.created_at, m.sender_id,
         json_build_object('id', u.id, 'username', u.username, 'avatarUrl', u.avatar_url) as sender,
         (SELECT json_agg(json_build_object('userId', rr.user_id, 'readAt', rr.read_at))
          FROM read_receipts rr WHERE rr.message_id = m.id) as readBy,
         (SELECT json_agg(json_build_object('userId', dr.user_id, 'deliveredAt', dr.delivered_at))
          FROM delivery_receipts dr WHERE dr.message_id = m.id) as deliveredTo
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         WHERE m.conversation_id = $1 AND m.deleted_at IS NULL
         ORDER BY m.created_at DESC
         LIMIT $2 OFFSET $3`,
        [conversationId, parseInt(limit), parseInt(offset)]
      );

      res.json({ messages: result.rows.reverse() });
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Search users
  async searchUsers(req, res) {
    try {
      const { query } = req.query;
      const userId = req.user.id;

      if (!query || query.length < 2) {
        return res.status(400).json({ error: 'Query too short' });
      }

      const result = await db.query(
        `SELECT id, username, email, avatar_url, status
         FROM users
         WHERE (username ILIKE $1 OR email ILIKE $1)
         AND id != $2
         LIMIT 20`,
        [`%${query}%`, userId]
      );

      res.json({ users: result.rows });
    } catch (error) {
      console.error('Search users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = new ConversationController();
