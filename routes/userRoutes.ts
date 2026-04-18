import { Router } from 'express';
import { userController } from '../controllers/userController';

const userRouter = Router();

userRouter.get('/', userController.getUsers);
userRouter.post('/', userController.createUser);
userRouter.delete('/:id', userController.deleteUser);
userRouter.put('/:id/disable', userController.disableUser);
userRouter.put('/:id/enable', userController.enableUser);
userRouter.get('/:id', userController.getOneUser);
userRouter.put('/:id', userController.updateUser);
userRouter.get('/roles/:id', userController.getUserRoles);
userRouter.post('/:id/reset-password', userController.resetUserPassword);



export default userRouter;
