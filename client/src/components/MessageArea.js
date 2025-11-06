import React, { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import socketService from '../services/socket';
import { conversationAPI, uploadAPI } from '../services/api';
import './MessageArea.css';

function MessageArea({ conversation, currentUser, onlineUsers, onBack }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadMessages();

    socketService.on('message:new', handleNewMessage);
    socketService.on('typing:start', handleTypingStart);
    socketService.on('typing:stop', handleTypingStop);
    socketService.on('message:read', handleMessageRead);

    return () => {
      socketService.off('message:new', handleNewMessage);
      socketService.off('typing:start', handleTypingStart);
      socketService.off('typing:stop', handleTypingStop);
      socketService.off('message:read', handleMessageRead);
    };
  }, [conversation.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Mark messages as read
    messages.forEach((msg) => {
      if (msg.sender_id !== currentUser.id && !isMessageReadByMe(msg)) {
        socketService.markAsRead(msg.id, conversation.id);
      }
    });
  }, [messages, conversation.id, currentUser.id]);

  const loadMessages = async () => {
    try {
      const response = await conversationAPI.getMessages(conversation.id);
      setMessages(response.data.messages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const handleNewMessage = (message) => {
    if (message.conversation_id === conversation.id) {
      setMessages((prev) => [...prev, message]);
      if (message.sender_id !== currentUser.id) {
        socketService.markAsRead(message.id, conversation.id);
      }
    }
  };

  const handleTypingStart = ({ conversationId, userId, username }) => {
    if (conversationId === conversation.id && userId !== currentUser.id) {
      setTypingUsers((prev) => new Set([...prev, username]));
    }
  };

  const handleTypingStop = ({ conversationId, userId }) => {
    if (conversationId === conversation.id) {
      const participant = conversation.participants?.find((p) => p.id === userId);
      if (participant) {
        setTypingUsers((prev) => {
          const updated = new Set(prev);
          updated.delete(participant.username);
          return updated;
        });
      }
    }
  };

  const handleMessageRead = ({ messageId }) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, readBy: [...(msg.readBy || []), { userId: currentUser.id }] }
          : msg
      )
    );
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);

    // Send typing indicator
    socketService.startTyping(conversation.id);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 1 second of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socketService.stopTyping(conversation.id);
    }, 1000);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!inputText.trim()) return;

    const content = inputText.trim();
    setInputText('');
    socketService.stopTyping(conversation.id);

    socketService.sendMessage(conversation.id, content);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const response = await uploadAPI.uploadFile(file);
      const { url, name, size } = response.data.file;

      socketService.sendMessage(
        conversation.id,
        name,
        'image',
        url,
        name,
        size
      );
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const isMessageReadByMe = (message) => {
    return message.readBy?.some((r) => r.userId === currentUser.id);
  };

  const getConversationName = () => {
    if (conversation.type === 'group') return conversation.name;
    return conversation.participants?.[0]?.username || 'Unknown';
  };

  const isParticipantOnline = () => {
    if (conversation.type === 'group') return false;
    const participant = conversation.participants?.[0];
    return participant && onlineUsers.has(participant.id);
  };

  const getImageUrl = (fileUrl) => {
    if (!fileUrl) return '';
    // If fileUrl is already a full URL, return it
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      return fileUrl;
    }
    // Get base URL from environment or use socket URL (which is the base URL)
    const baseUrl = process.env.REACT_APP_SOCKET_URL || 
                   (process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000');
    return `${baseUrl}${fileUrl}`;
  };

  return (
    <div className="message-area">
      <div className="message-area-header">
        {onBack && (
          <button className="back-button" onClick={onBack} title="Back to chats">
            ←
          </button>
        )}
        <div className="header-info">
          <h2>{getConversationName()}</h2>
          <span className={`status ${isParticipantOnline() ? 'online' : 'offline'}`}>
            {isParticipantOnline() ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      <div className="messages-container">
        {messages.map((message) => {
          const isOwn = message.sender_id === currentUser.id;
          const readCount = message.readBy?.length || 0;
          const deliveredCount = message.deliveredTo?.length || 0;

          return (
            <div
              key={message.id}
              className={`message ${isOwn ? 'own' : 'other'}`}
            >
              {!isOwn && (
                <div className="message-avatar">
                  {message.sender?.avatarUrl ? (
                    <img src={message.sender.avatarUrl} alt={message.sender.username} />
                  ) : (
                    '👤'
                  )}
                </div>
              )}
              <div className="message-content">
                {!isOwn && (
                  <div className="message-sender">{message.sender?.username}</div>
                )}
                {message.message_type === 'image' ? (
                  <div className="message-image">
                    <img
                      src={getImageUrl(message.file_url)}
                      alt={message.file_name}
                      onError={(e) => {
                        console.error('Failed to load image:', message.file_url);
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="message-text">{message.content}</div>
                )}
                <div className="message-meta">
                  <span className="message-time">
                    {format(new Date(message.created_at), 'HH:mm')}
                  </span>
                  {isOwn && (
                    <span className="message-status">
                      {readCount > 0 ? '✓✓' : deliveredCount > 0 ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {typingUsers.size > 0 && (
          <div className="typing-indicator">
            {Array.from(typingUsers).join(', ')} {typingUsers.size > 1 ? 'are' : 'is'} typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="message-input-container" onSubmit={handleSendMessage}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          style={{ display: 'none' }}
        />
        <button
          type="button"
          className="attach-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Upload image"
        >
          {uploading ? '⏳' : '📎'}
        </button>
        <input
          type="text"
          placeholder="Type a message..."
          value={inputText}
          onChange={handleInputChange}
          disabled={uploading}
        />
        <button type="submit" disabled={!inputText.trim() || uploading}>
          Send
        </button>
      </form>
    </div>
  );
}

export default MessageArea;
