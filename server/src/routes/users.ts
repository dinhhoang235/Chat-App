import { Router } from 'express';
import {
  login,
  signup,
  refreshToken,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} from '../controllers/userController.js';

const router = Router();

// Auth routes
router.post('/login', login);
router.post('/signup', signup);
router.post('/refresh', refreshToken);

// User routes
router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.patch('/:id', updateUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
