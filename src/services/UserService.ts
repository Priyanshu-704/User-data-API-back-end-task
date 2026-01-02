import { createLRUCache } from "../cache/LRUCache";
import { createAsyncQueue } from "../queue/AsyncQueue";
import { User, CachedUser, CreateUserDTO, CacheStats } from "../types/user";

function createConcurrentManager() {
  const pendingRequests = new Map<string, Promise<any>>();

  const execute = async <T>(key: string, fn: () => Promise<T>): Promise<T> => {
    if (pendingRequests.has(key)) {
      return pendingRequests.get(key)!;
    }

    const promise = (async () => {
      try {
        return await fn();
      } finally {
        pendingRequests.delete(key);
      }
    })();

    pendingRequests.set(key, promise);
    return promise;
  };

  return {
    execute,
    getPendingCount: () => pendingRequests.size,
    clear: () => pendingRequests.clear(),
  };
}

const userService = (() => {
  const cache = createLRUCache<User>({
    maxSize: 100,
    ttl: 60_000,
    cleanupInterval: 10_000,
  });

  const concurrentManager = createConcurrentManager();
  const asyncQueue = createAsyncQueue<any>(3);

  const mockUsers = new Map<number, User>([
    [
      1,
      {
        id: 1,
        name: "John Doe",
        email: "john@example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    [
      2,
      {
        id: 2,
        name: "Jane Smith",
        email: "jane@example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    [
      3,
      {
        id: 3,
        name: "Alice Johnson",
        email: "alice@example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  ]);

  let nextId = 4;
  let responseTimes: number[] = [];

  const getUserById = async (id: number): Promise<CachedUser | null> => {
    const cacheKey = `user:${id}`;
    let wasCacheHit = true;

    try {
      const user = await cache.getOrSet(cacheKey, async () => {
        wasCacheHit = false;
        return asyncQueue.enqueue(
          async () => {
            await new Promise((res) => setTimeout(res, 200));
            const user = mockUsers.get(id);
            if (!user) throw new Error("User not found");
            return { ...user };
          },
          1,
          `fetch-user-${id}`
        );
      });

      return user ? { ...user, cached: wasCacheHit } : null;
    } catch {
      return null;
    }
  };

  const createUser = async (userData: CreateUserDTO): Promise<User> => {
    const key = `create:${Date.now()}:${userData.email}`;
    const start = Date.now();

    return concurrentManager.execute(key, async () =>
      asyncQueue.enqueue(
        async () => {
          const delay = 200 + Math.random() * 100;
          await new Promise((res) => setTimeout(res, delay));

          const newUser: User = {
            id: nextId++,
            name: userData.name,
            email: userData.email,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          mockUsers.set(newUser.id, newUser);
          cache.delete(`user:${newUser.id}`);

          responseTimes.push(Date.now() - start);

          return newUser;
        },
        2,
        `create-user-${userData.email}`
      )
    );
  };

  const updateUser = async (
    id: number,
    updates: Partial<User>
  ): Promise<User | null> => {
    const key = `update:${id}:${Date.now()}`;
    const start = Date.now();

    return concurrentManager.execute(key, async () =>
      asyncQueue.enqueue(
        async () => {
          const user = mockUsers.get(id);
          if (!user) return null;

          const updatedUser = {
            ...user,
            ...updates,
            updatedAt: new Date(),
          };

          mockUsers.set(id, updatedUser);
          cache.set(`user:${id}`, { ...updatedUser });

          responseTimes.push(Date.now() - start);

          return updatedUser;
        },
        2,
        `update-user-${id}`
      )
    );
  };

  const deleteUser = async (id: number): Promise<boolean> => {
    const key = `delete:${id}:${Date.now()}`;
    const start = Date.now();

    return concurrentManager.execute(key, async () =>
      asyncQueue.enqueue(
        async () => {
          const existed = mockUsers.delete(id);
          cache.delete(`user:${id}`);

          responseTimes.push(Date.now() - start);

          return existed;
        },
        2,
        `delete-user-${id}`
      )
    );
  };

  const getAllUsers = async (): Promise<User[]> =>
    asyncQueue.enqueue(
      async () => {
        await new Promise((res) => setTimeout(res, 100));
        return Array.from(mockUsers.values());
      },
      0,
      "get-all-users"
    );

  const getCacheStats = (): CacheStats => cache.getStats();

  const getConcurrentStats = () => ({
    pendingRequests: concurrentManager.getPendingCount(),
  });

  const getQueueStats = () => asyncQueue.getStats();

  const clearCache = () => {
    cache.clear();
    concurrentManager.clear();
    responseTimes = [];
  };

  const clearQueue = () => asyncQueue.clear();

  const getCacheKeys = () => cache.getKeys();

  const getUserCount = () => mockUsers.size;

  const getEnhancedCacheInfo = () => {
    const stats = cache.getStats();
    const keys = cache.getKeys();

    const avgResponse =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    return {
      cacheKeys: keys,
      cacheSize: keys.length,
      userKeys: keys.filter((k: string) => k.startsWith("user:")).length,
      cacheStats: stats,
      responseTimeTracking: {
        count: responseTimes.length,
        average: avgResponse,
        last10: responseTimes.slice(-10),
      },
      concurrentPending: concurrentManager.getPendingCount(),
      userCount: mockUsers.size,
    };
  };

  const destroy = () => {
    cache.destroy();
    concurrentManager.clear();
    asyncQueue.clear();
  };

  return {
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getAllUsers,
    getCacheStats,
    getConcurrentStats,
    getQueueStats,
    clearCache,
    clearQueue,
    getCacheKeys,
    getUserCount,
    getEnhancedCacheInfo,
    destroy,
  };
})();

export default userService;
