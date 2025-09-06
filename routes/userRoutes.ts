import { Router } from 'express';
import { userController } from '../controllers/userController';

const userRouter = Router();

userRouter.get('/', userController.getUsers);
userRouter.post('/', userController.createUser);
userRouter.delete('/:id', userController.deleteUser);
userRouter.put('/:id/disable', userController.disableUser);

export default userRouter;
