import { Router, Request, Response, NextFunction } from "express";

import { CreateUserDTO, CachedUser } from "../types/user";
import userService from "../services/UserService";


const router = Router();

interface UserRequest extends Request {
  userId?: number;
}

const validateUserId = (
  req: UserRequest,
  res: Response,
  next: NextFunction
) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      error: "Invalid user ID",
      message: "User ID must be a positive integer",
    });
  }

  req.userId = id;
  next();
};

const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const validateCreateUser = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { name, email } = req.body as CreateUserDTO;

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({
      success: false,
      error: "Invalid name",
      message: "Name is required and must be a non-empty string",
    });
  }

  if (!email || typeof email !== "string" || !isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      error: "Invalid email",
      message: "A valid email address is required",
    });
  }

  next();
};

const validateUpdateUser = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { name, email } = req.body as Partial<CreateUserDTO>;

  if (name && (typeof name !== "string" || !name.trim())) {
    return res.status(400).json({
      success: false,
      error: "Invalid name",
      message: "Name must be a non-empty string if provided",
    });
  }

  if (email && (typeof email !== "string" || !isValidEmail(email))) {
    return res.status(400).json({
      success: false,
      error: "Invalid email",
      message: "Email must be valid if provided",
    });
  }

  next();
};

router.get("/:id", validateUserId, async (req: UserRequest, res: Response) => {
  const startTime = Date.now();
  const userId = req.userId!;

  try {
    const user = (await userService.getUserById(userId)) as CachedUser | null;

    const responseTime = Date.now() - startTime;

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
        message: `User with ID ${userId} does not exist`,
        timestamp: new Date().toISOString(),
        responseTime,
      });
    }

    res.json({
      success: true,
      data: user,
      cached: user.cached ?? false,
      timestamp: new Date().toISOString(),
      responseTime,
    });
  } catch (error) {
    console.error(`[API] Error fetching user ${userId}:`, error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to fetch user",
      timestamp: new Date().toISOString(),
    });
  }
});

router.post("/", validateCreateUser, async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const userData: CreateUserDTO = req.body;
    const newUser = await userService.createUser(userData);

    res.status(201).json({
      success: true,
      data: newUser,
      message: "User created successfully",
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
    });
  } catch (error) {
    console.error("[API] Error creating user:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to create user",
      timestamp: new Date().toISOString(),
    });
  }
});

router.put(
  "/:id",
  validateUserId,
  validateUpdateUser,
  async (req: UserRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.userId!;

    try {
      const updatedUser = await userService.updateUser(userId, req.body);

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          error: "User not found",
          message: `User with ID ${userId} does not exist`,
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
        });
      }

      res.json({
        success: true,
        data: updatedUser,
        message: "User updated successfully",
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      });
    } catch (error) {
      console.error(`[API] Error updating user ${userId}:`, error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to update user",
        timestamp: new Date().toISOString(),
      });
    }
  }
);

router.delete(
  "/:id",
  validateUserId,
  async (req: UserRequest, res: Response) => {
    const startTime = Date.now();
    const userId = req.userId!;

    try {
      const deleted = await userService.deleteUser(userId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: "User not found",
          message: `User with ID ${userId} does not exist`,
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
        });
      }

      res.json({
        success: true,
        message: "User deleted successfully",
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      });
    } catch (error) {
      console.error(`[API] Error deleting user ${userId}:`, error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to delete user",
        timestamp: new Date().toISOString(),
      });
    }
  }
);

router.get("/", async (_req: Request, res: Response) => {
  try {
    const users = await userService.getAllUsers();

    res.json({
      success: true,
      data: users,
      count: users.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[API] Error fetching users:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to fetch users",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
