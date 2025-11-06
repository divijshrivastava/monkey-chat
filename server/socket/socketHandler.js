const db = require('../database/db');
const { sessionHelpers } = require('../config/redis');

class SocketHandler {
  constructor(io) {
    this.io = io;
  }

  async handleConnection(socket) {
    const user = socket.user;
    console.log(`User connected: ${user.username} (${socket.id})`);

    try {
      // Store session in Redis
      await sessionHelpers.setSession(user.id, socket.id);
      await sessionHelpers.setUserOnline(user.id);

      // Update user status in database
      await db.query(
        'UPDATE users SET status = $1, last_seen = CURRENT_TIMESTAMP WHERE id = $2',
        ['online', user.id]
      );

      // Get user's conversations and join rooms
      const conversations = await db.query(
        'SELECT conversation_id FROM conversation_participants WHERE user_id = $1',
        [user.id]
      );

      conversations.rows.forEach((conv) => {
        socket.join(`conversation:${conv.conversation_id}`);
      });

      // Broadcast user online status
      socket.broadcast.emit('user:online', { userId: user.id });

      // Handle incoming messages
      socket.on('message:send', async (data) => {
        await this.handleSendMessage(socket, data);
      });

      // Handle typing indicators
      socket.on('typing:start', async (data) => {
        await this.handleTypingStart(socket, data);
      });

      socket.on('typing:stop', async (data) => {
        await this.handleTypingStop(socket, data);
      });

      // Handle message read receipts
      socket.on('message:read', async (data) => {
        await this.handleMessageRead(socket, data);
      });

      // Handle message delivered receipts
      socket.on('message:delivered', async (data) => {
        await this.handleMessageDelivered(socket, data);
      });

      // Handle join conversation
      socket.on('conversation:join', async (data) => {
        await this.handleJoinConversation(socket, data);
      });

      // Handle disconnect
      socket.on('disconnect', async () => {
        await this.handleDisconnect(socket);
      });
    } catch (error) {
      console.error('Socket connection error:', error);
    }
  }

  async handleSendMessage(socket, data) {
    try {
      const { conversationId, content, messageType = 'text', fileUrl, fileName, fileSize } = data;
      const userId = socket.user.id;

      // Verify user is participant
      const participantCheck = await db.query(
        'SELECT id FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
        [conversationId, userId]
      );

      if (participantCheck.rows.length === 0) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      // Save message to database
      const result = await db.query(
        `INSERT INTO messages (conversation_id, sender_id, content, message_type, file_url, file_name, file_size)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, conversation_id, sender_id, content, message_type, file_url, file_name, file_size, created_at`,
        [conversationId, userId, content, messageType, fileUrl, fileName, fileSize]
      );

      const message = result.rows[0];

      // Update conversation timestamp
      await db.query(
        'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [conversationId]
      );

      // Get sender info
      const userResult = await db.query(
        'SELECT id, username, avatar_url FROM users WHERE id = $1',
        [userId]
      );

      // Convert to camelCase for frontend
      const messageWithSender = {
        id: message.id,
        conversation_id: message.conversation_id,
        sender_id: message.sender_id,
        content: message.content,
        message_type: message.message_type,
        messageType: message.message_type,
        file_url: message.file_url,
        fileUrl: message.file_url,
        file_name: message.file_name,
        fileName: message.file_name,
        file_size: message.file_size,
        fileSize: message.file_size,
        created_at: message.created_at,
        createdAt: message.created_at,
        sender: userResult.rows[0],
        readBy: [],
        deliveredTo: [],
      };

      // Emit to all participants in the conversation
      this.io.to(`conversation:${conversationId}`).emit('message:new', messageWithSender);

      // Auto-create delivery receipts for online participants
      const participants = await db.query(
        'SELECT user_id FROM conversation_participants WHERE conversation_id = $1 AND user_id != $2',
        [conversationId, userId]
      );

      for (const participant of participants.rows) {
        const session = await sessionHelpers.getSession(participant.user_id);
        if (session) {
          await db.query(
            'INSERT INTO delivery_receipts (message_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [message.id, participant.user_id]
          );
        }
      }
    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  async handleTypingStart(socket, data) {
    const { conversationId } = data;
    const userId = socket.user.id;

    socket.to(`conversation:${conversationId}`).emit('typing:start', {
      conversationId,
      userId,
      username: socket.user.username,
    });
  }

  async handleTypingStop(socket, data) {
    const { conversationId } = data;
    const userId = socket.user.id;

    socket.to(`conversation:${conversationId}`).emit('typing:stop', {
      conversationId,
      userId,
    });
  }

  async handleMessageRead(socket, data) {
    try {
      const { messageId, conversationId } = data;
      const userId = socket.user.id;

      // Insert read receipt and get timestamp
      const readResult = await db.query(
        'INSERT INTO read_receipts (message_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING read_at',
        [messageId, userId]
      );

      const readAt = readResult.rows[0]?.read_at || new Date();

      // Broadcast to entire conversation room (so all participants see the update)
      this.io.to(`conversation:${conversationId}`).emit('message:read', {
        messageId,
        userId,
        conversationId,
        readAt,
      });
    } catch (error) {
      console.error('Message read error:', error);
    }
  }

  async handleMessageDelivered(socket, data) {
    try {
      const { messageId, conversationId } = data;
      const userId = socket.user.id;

      // Insert delivery receipt and get timestamp
      const deliveredResult = await db.query(
        'INSERT INTO delivery_receipts (message_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING delivered_at',
        [messageId, userId]
      );

      const deliveredAt = deliveredResult.rows[0]?.delivered_at || new Date();

      // Broadcast to entire conversation room
      this.io.to(`conversation:${conversationId}`).emit('message:delivered', {
        messageId,
        userId,
        conversationId,
        deliveredAt,
      });
    } catch (error) {
      console.error('Message delivered error:', error);
    }
  }

  async handleJoinConversation(socket, data) {
    const { conversationId } = data;
    socket.join(`conversation:${conversationId}`);
  }

  async handleDisconnect(socket) {
    const user = socket.user;
    console.log(`User disconnected: ${user.username} (${socket.id})`);

    try {
      // Remove session from Redis
      await sessionHelpers.deleteSession(user.id, socket.id);
      await sessionHelpers.setUserOffline(user.id);

      // Update user status in database
      await db.query(
        'UPDATE users SET status = $1, last_seen = CURRENT_TIMESTAMP WHERE id = $2',
        ['offline', user.id]
      );

      // Broadcast user offline status
      socket.broadcast.emit('user:offline', {
        userId: user.id,
        lastSeen: new Date(),
      });
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }
}

module.exports = SocketHandler;
