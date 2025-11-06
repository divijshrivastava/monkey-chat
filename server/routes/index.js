const express = require('express');
const authController = require('../controllers/authController');
const conversationController = require('../controllers/conversationController');
const uploadController = require('../controllers/uploadController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Auth routes
router.post('/auth/register', authController.register.bind(authController));
router.post('/auth/login', authController.login.bind(authController));
router.post('/auth/logout', authMiddleware, authController.logout.bind(authController));
router.get('/auth/me', authMiddleware, authController.getCurrentUser.bind(authController));

// Conversation routes
router.get('/conversations', authMiddleware, conversationController.getUserConversations.bind(conversationController));
router.post('/conversations', authMiddleware, conversationController.createOrGetDirectConversation.bind(conversationController));
router.get('/conversations/:conversationId/messages', authMiddleware, conversationController.getConversationMessages.bind(conversationController));

// User routes
router.get('/users/search', authMiddleware, conversationController.searchUsers.bind(conversationController));

// Upload routes
router.post('/upload', authMiddleware, uploadController.uploadMiddleware(), uploadController.uploadFile.bind(uploadController));

module.exports = router;
