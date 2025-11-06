import React, { useState, useEffect } from 'react';
import ConversationList from './ConversationList';
import MessageArea from './MessageArea';
import UserSearch from './UserSearch';
import Profile from './Profile';
import socketService from '../services/socket';
import { conversationAPI } from '../services/api';
import './Chat.css';

function Chat({ onLogout }) {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    setCurrentUser(user);
    loadConversations();

    // Socket event listeners
    socketService.on('message:new', handleNewMessage);
    socketService.on('user:online', handleUserOnline);
    socketService.on('user:offline', handleUserOffline);
    socketService.on('message:read', handleMessageRead);
    socketService.on('message:delivered', handleMessageDelivered);

    return () => {
      socketService.off('message:new', handleNewMessage);
      socketService.off('user:online', handleUserOnline);
      socketService.off('user:offline', handleUserOffline);
      socketService.off('message:read', handleMessageRead);
      socketService.off('message:delivered', handleMessageDelivered);
    };
  }, []);

  const loadConversations = async () => {
    try {
      const response = await conversationAPI.getConversations();
      setConversations(response.data.conversations);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const handleNewMessage = (message) => {
    // Update conversation list
    setConversations((prev) => {
      const updated = prev.map((conv) => {
        if (conv.id === message.conversation_id) {
          // Only increment unread count if:
          // 1. Message is NOT from current user
          // 2. Conversation is NOT currently selected (not viewing it)
          const shouldIncrementUnread =
            message.sender_id !== currentUser?.id &&
            selectedConversation?.id !== message.conversation_id;

          return {
            ...conv,
            lastMessage: message,
            unreadCount: shouldIncrementUnread ? conv.unreadCount + 1 : conv.unreadCount
          };
        }
        return conv;
      });
      return updated.sort((a, b) => new Date(b.lastMessage?.created_at || 0) - new Date(a.lastMessage?.created_at || 0));
    });

    // Mark as delivered and read if conversation is open
    if (selectedConversation?.id === message.conversation_id) {
      socketService.markAsDelivered(message.id, message.conversation_id);
      // Auto-mark as read if message is from someone else and conversation is open
      if (message.sender_id !== currentUser?.id) {
        socketService.markAsRead(message.id, message.conversation_id);
      }
    }
  };

  const handleUserOnline = ({ userId }) => {
    setOnlineUsers((prev) => new Set([...prev, userId]));
  };

  const handleUserOffline = ({ userId }) => {
    setOnlineUsers((prev) => {
      const updated = new Set(prev);
      updated.delete(userId);
      return updated;
    });
  };

  const handleMessageRead = ({ messageId, conversationId }) => {
    // Update read status in conversation if needed
    if (selectedConversation?.id === conversationId) {
      // Handled in MessageArea component
    }
  };

  const handleMessageDelivered = ({ messageId, conversationId }) => {
    // Update delivery status if needed
  };

  const handleSelectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    socketService.joinConversation(conversation.id);

    // Reset unread count
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversation.id ? { ...conv, unreadCount: 0 } : conv
      )
    );
  };

  const handleStartConversation = async (userId) => {
    try {
      const response = await conversationAPI.createOrGetConversation(userId);
      await loadConversations();
      const newConv = conversations.find((c) => c.id === response.data.conversation.id);
      if (newConv) {
        setSelectedConversation(newConv);
      }
      setShowSearch(false);
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
  };

  return (
    <div className="chat-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Chats</h2>
          <div className="sidebar-actions">
            <button
              className="icon-btn"
              onClick={() => setShowProfile(true)}
              title="My Profile"
            >
              👤
            </button>
            <button
              className="icon-btn"
              onClick={() => setShowSearch(!showSearch)}
              title="New Chat"
            >
              ➕
            </button>
            <button className="icon-btn" onClick={onLogout} title="Logout">
              🚪
            </button>
          </div>
        </div>
        {showSearch && (
          <UserSearch
            onSelectUser={handleStartConversation}
            onClose={() => setShowSearch(false)}
          />
        )}
        <ConversationList
          conversations={conversations}
          selectedConversation={selectedConversation}
          onSelectConversation={handleSelectConversation}
          currentUserId={currentUser?.id}
          onlineUsers={onlineUsers}
        />
      </div>
      <div className={`main-area ${selectedConversation ? 'active' : ''}`}>
        {selectedConversation ? (
          <MessageArea
            conversation={selectedConversation}
            currentUser={currentUser}
            onlineUsers={onlineUsers}
            onBack={handleBackToList}
          />
        ) : (
          <div className="no-conversation">
            <h2>Select a conversation to start chatting</h2>
            <p>or click the + button to start a new chat</p>
          </div>
        )}
      </div>
      {showProfile && (
        <Profile
          currentUser={currentUser}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
}

export default Chat;
