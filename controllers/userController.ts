import { Request, Response } from 'express';
import { getAllUsers, createUser, deleteUser, disableUser } from '../services/userService';

export const userController = {
  async getUsers(req: Request, res: Response) {
    try {
      const users = await getAllUsers();
      res.status(200).json(users);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async createUser(req: Request, res: Response) {
    try {
      const userData = req.body;
      const result = await createUser(userData);
      res.status(result.status).json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async deleteUser(req: Request, res: Response) {
    try {
      const userId = req.params.id;
      const result = await deleteUser(userId);
      res.status(result.code).json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async disableUser(req: Request, res: Response) {
    try {
      const userId = req.params.id;
      const result = await disableUser(userId);
      res.status(result.code).json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },
};
