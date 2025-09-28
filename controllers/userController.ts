import { Request, Response } from 'express';
import { getAllUsers, createUser, deleteUser, disableUser  , getOneUser , updateUser} from '../services/userService';

//Role Imports 
import {getUserRoles , getAllUsersRoles } from '../services/userService'

export const userController = {
  async getUsers(req: Request, res: Response) {
    try {
      const users = await getAllUsers();
      res.status(200).json(users);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  },

  async getOneUser(req: Request, res: Response) {
    try {
      const userId = req.params.id;
      const user = await getOneUser(userId);
      if (user) {
        res.status(200).json(user);
      } else {
        res.status(404).json({ message: 'User not found' });
      }
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

  async updateUser(req: Request, res: Response) {
    try {
      const userId = req.params.id;
      const userData = req.body;
      const result = await updateUser(userId, userData);
      res.status(result.code).json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }, 


  ///////////////ROLES PART/////////////////
  async getUserRoles(req: Request, res: Response) {
    try {
      const userId = req.params.id;
      const roles = await getUserRoles(userId);
      res.status(200).json({ code: 200, message: `Roles for user ${userId}`, data: roles });
    } catch (error: any) {
      res.status(500).json({ code: 500, message: error.message });
    }
  },

  async getAllUsersRoles(req: Request, res: Response) {
    try {
      // Expecting an array of user IDs in the request body
      const { userIds } = req.body;
      if (!Array.isArray(userIds)) {
        return res.status(400).json({ code: 400, message: "userIds must be an array" });
      }

      const roles = await getAllUsersRoles(userIds);
      res.status(200).json({ code: 200, message: "Roles for users", data: roles });
    } catch (error: any) {
      res.status(500).json({ code: 500, message: error.message });
    }
  }

};

