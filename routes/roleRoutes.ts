import { Router } from "express";
import { roleController } from "../controllers/roleController";

const roleRouter = Router();

// Example: GET /roles/client/my-client
roleRouter.get("/client/:clientId", roleController.getAllClientRoles);

export default roleRouter;