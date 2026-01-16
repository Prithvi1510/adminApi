import { Request, Response } from "express";
import { getAllClientRoles } from "../services/roleService";

export const roleController = {
  // GET /roles/client/:clientId
  async getAllClientRoles(req: Request, res: Response) {
    try {
      const { clientId } = req.params;

      if (!clientId) {
        return res.status(400).json({
          success: false,
          message: "clientId is required",
        });
      }

      const roles: any = await getAllClientRoles(clientId);

      return res.status(200).json({
        success: true,
        message: "Client roles fetched successfully",
        total: roles.length,
        data: roles,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error?.message || "Failed to fetch client roles",
      });
    }
  },
};
