import { Router } from 'express';
import {
  login,
  signup,
  refreshToken,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  searchUsers,
  saveSearchHistory,
  getSearchHistory,
  deleteSearchHistory,
  clearSearchHistory
} from '../controllers/userController.js';
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  getPendingFriendRequests,
  getSentFriendRequests,
  getFriendsList,
  removeFriend,
  checkFriendshipStatus,
  searchFriendByPhone
} from '../controllers/friendshipController.js';
import { upload } from '../middleware/upload.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Auth routes (không cần auth)
router.post('/login', login);
router.post('/signup', signup);
router.post('/refresh', refreshToken);

// User routes
router.get('/', getAllUsers);
router.get('/search', authMiddleware, searchUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.patch('/:id', upload.any(), updateUser);
router.put('/:id', upload.any(), updateUser);
router.delete('/:id', deleteUser);

// Search history routes
router.post('/search/history', authMiddleware, saveSearchHistory);
router.get('/search/history', authMiddleware, getSearchHistory);
router.post('/search/history/remove', authMiddleware, deleteSearchHistory);
router.post('/search/history/clear', authMiddleware, clearSearchHistory);

// Friend request routes (yêu cầu auth)
router.post('/friends/request/send', authMiddleware, sendFriendRequest);
router.post('/friends/request/accept', authMiddleware, acceptFriendRequest);
router.post('/friends/request/reject', authMiddleware, rejectFriendRequest);
router.post('/friends/request/cancel', authMiddleware, cancelFriendRequest);
router.get('/friends/requests/pending', authMiddleware, getPendingFriendRequests);
router.get('/friends/requests/sent', authMiddleware, getSentFriendRequests);
router.get('/friends/list', authMiddleware, getFriendsList);
router.post('/friends/remove', authMiddleware, removeFriend);
router.get('/friends/status/:targetUserId', authMiddleware, checkFriendshipStatus);
router.get('/friends/search', authMiddleware, searchFriendByPhone);

export default router;
