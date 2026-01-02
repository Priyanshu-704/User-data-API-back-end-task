import { Router, Request, Response } from "express";
import userService from "../services/UserService";

const router = Router();


router.delete("/", (_req: Request, res: Response) => {
  try {
    userService.clearCache();

    res.json({
      success: true,
      message: "Cache cleared successfully",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("[API] Error clearing cache:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to clear cache",
      timestamp: new Date().toISOString()
    });
  }
});


router.get("/status", (_req: Request, res: Response) => {
  try {
    const cacheStats = userService.getCacheStats();
    const concurrentStats = userService.getConcurrentStats();
    const queueStats = userService.getQueueStats();

    res.json({
      success: true,
      data: {
        cache: {
          ...cacheStats,
          hitRate:
            cacheStats.hits + cacheStats.misses > 0
              ? (
                  (cacheStats.hits /
                    (cacheStats.hits + cacheStats.misses)) *
                  100
                ).toFixed(2)
              : 0,
          averageResponseTime:
            cacheStats.averageResponseTime.toFixed(2) + "ms"
        },
        concurrent: concurrentStats,
        asyncQueue: queueStats,
        configuration: {
          maxSize: 100,
          ttl: "60 seconds",
          cleanupInterval: "10 seconds",
          strategy: "LRU (Least Recently Used)",
          maxConcurrentOperations: 3
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("[API] Error fetching cache stats:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to fetch cache statistics",
      timestamp: new Date().toISOString()
    });
  }
});

router.get("/keys", (_req: Request, res: Response) => {
  try {
    const keys: string[] = userService.getCacheKeys();

    const userKeys: string[] = keys
      .filter((k: string) => k.startsWith("user:"))
      .map((k: string) => k.replace("user:", ""));

    const otherKeys: string[] = keys.filter(
      (k: string) => !k.startsWith("user:")
    );

    res.json({
      success: true,
      data: {
        keys,
        count: keys.length,
        users: userKeys,
        other: otherKeys
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("[API] Error fetching cache keys:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to fetch cache keys",
      timestamp: new Date().toISOString()
    });
  }
});


router.delete("/queue", (_req: Request, res: Response) => {
  try {
    userService.clearQueue();

    res.json({
      success: true,
      message: "Async queue cleared successfully",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("[API] Error clearing queue:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to clear async queue",
      timestamp: new Date().toISOString()
    });
  }
});

router.get("/queue", (_req: Request, res: Response) => {
  try {
    const queueStats = userService.getQueueStats();

    res.json({
      success: true,
      data: queueStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("[API] Error fetching queue stats:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: "Failed to fetch queue statistics",
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
