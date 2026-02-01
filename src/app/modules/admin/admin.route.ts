import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { AdminController } from './admin.controller';

const router = express.Router();

// Admin dashboard statistics (growth metrics)
router.get(
  '/stats',
  auth(USER_ROLES.SUPER_ADMIN),
  AdminController.getDashboardStats,
);

export const AdminRoutes = router;
