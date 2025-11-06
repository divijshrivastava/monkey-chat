import React, { useState } from 'react';
import { userAPI } from '../services/api';
import './UserSearch.css';

function UserSearch({ onSelectUser, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (searchQuery) => {
    setQuery(searchQuery);

    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await userAPI.searchUsers(searchQuery);
      setResults(response.data.users);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-search">
      <div className="search-header">
        <input
          type="text"
          placeholder="Search users..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          autoFocus
        />
        <button onClick={onClose}>✕</button>
      </div>
      <div className="search-results">
        {loading && <div className="loading">Searching...</div>}
        {!loading && results.length === 0 && query.length >= 2 && (
          <div className="no-results">No users found</div>
        )}
        {results.map((user) => (
          <div
            key={user.id}
            className="user-result"
            onClick={() => onSelectUser(user.id)}
          >
            <div className="user-avatar">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.username} />
              ) : (
                <div className="avatar-emoji">👤</div>
              )}
            </div>
            <div className="user-info">
              <h4>{user.username}</h4>
              <p>{user.email}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default UserSearch;
