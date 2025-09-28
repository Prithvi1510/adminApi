import { Router } from 'express';
import { userController } from '../controllers/userController';

const userRouter = Router();

userRouter.get('/', userController.getUsers);
userRouter.post('/', userController.createUser);
userRouter.delete('/:id', userController.deleteUser);
userRouter.put('/:id/disable', userController.disableUser);
userRouter.get('/:id', userController.getOneUser);
userRouter.put('/:id', userController.updateUser);
userRouter.get('/roles/:id', userController.getUserRoles);
userRouter.get('/allRoles', userController.getAllUsersRoles);


export default userRouter;
