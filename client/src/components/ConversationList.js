import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import './ConversationList.css';

function ConversationList({
  conversations,
  selectedConversation,
  onSelectConversation,
  currentUserId,
  onlineUsers,
}) {
  const getConversationName = (conv) => {
    if (conv.type === 'group') {
      return conv.name;
    }
    const participant = conv.participants?.[0];
    return participant?.username || 'Unknown';
  };

  const getConversationAvatar = (conv) => {
    if (conv.type === 'group') {
      return '👥';
    }
    const participant = conv.participants?.[0];
    return participant?.avatarUrl || '👤';
  };

  const isUserOnline = (conv) => {
    if (conv.type === 'group') return false;
    const participant = conv.participants?.[0];
    return participant && onlineUsers.has(participant.id);
  };

  const formatLastMessage = (msg) => {
    if (!msg) return 'No messages yet';
    if (msg.messageType === 'image') return '📷 Image';
    return msg.content?.substring(0, 50) || '';
  };

  return (
    <div className="conversation-list">
      {conversations.length === 0 ? (
        <div className="empty-state">
          <p>No conversations yet</p>
          <p className="hint">Click + to start chatting</p>
        </div>
      ) : (
        conversations.map((conv) => (
          <div
            key={conv.id}
            className={`conversation-item ${
              selectedConversation?.id === conv.id ? 'active' : ''
            }`}
            onClick={() => onSelectConversation(conv)}
          >
            <div className="conversation-avatar">
              {typeof getConversationAvatar(conv) === 'string' &&
              getConversationAvatar(conv).startsWith('http') ? (
                <img
                  src={getConversationAvatar(conv)}
                  alt={getConversationName(conv)}
                />
              ) : (
                <div className="avatar-emoji">{getConversationAvatar(conv)}</div>
              )}
              {isUserOnline(conv) && <div className="online-indicator" />}
            </div>
            <div className="conversation-info">
              <div className="conversation-header">
                <h3>{getConversationName(conv)}</h3>
                {conv.lastMessage && conv.lastMessage.createdAt && (
                  <span className="timestamp">
                    {formatDistanceToNow(new Date(conv.lastMessage.createdAt), {
                      addSuffix: false,
                    })}
                  </span>
                )}
              </div>
              <div className="conversation-preview">
                <p>{formatLastMessage(conv.lastMessage)}</p>
                {conv.unreadCount > 0 && (
                  <span className="unread-badge">{conv.unreadCount}</span>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default ConversationList;
