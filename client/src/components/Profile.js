import React, { useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import './Profile.css';

function Profile({ onClose, currentUser }) {
  const [user, setUser] = useState(currentUser);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const response = await authAPI.getCurrentUser();
      setUser(response.data.user);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (username) => {
    return username ? username.substring(0, 2).toUpperCase() : '??';
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="profile-overlay">
        <div className="profile-container">
          <div className="profile-loading">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-container" onClick={(e) => e.stopPropagation()}>
        <div className="profile-header">
          <h2>My Profile</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="profile-content">
          <div className="profile-avatar-large">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.username} />
            ) : (
              <div className="avatar-initials">{getInitials(user?.username)}</div>
            )}
          </div>

          <div className="profile-info">
            <div className="profile-field">
              <label>Username</label>
              <div className="profile-value">{user?.username || 'N/A'}</div>
            </div>

            <div className="profile-field">
              <label>Email</label>
              <div className="profile-value">{user?.email || 'N/A'}</div>
            </div>

            <div className="profile-field">
              <label>Status</label>
              <div className="profile-value">
                <span className={`status-badge ${user?.status}`}>
                  {user?.status || 'offline'}
                </span>
              </div>
            </div>

            <div className="profile-field">
              <label>Last Seen</label>
              <div className="profile-value">
                {user?.last_seen ? formatDate(user.last_seen) : 'Never'}
              </div>
            </div>

            <div className="profile-field">
              <label>Member Since</label>
              <div className="profile-value">
                {formatDate(user?.created_at)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
