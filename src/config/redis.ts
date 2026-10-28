import { Redis } from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

// In-memory fallback map for environments without an active Redis instance
const memoryStore = new Map<
  string,
  { value: string; expiresAt: number | null }
>();

class CacheManager {
  private redis: Redis | null = null;
  private isConnected = false;

  constructor() {
    try {
      this.redis = new Redis(REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // Don't block if Redis server is down
        connectTimeout: 2000,
      });

      this.redis.on("connect", () => {
        this.isConnected = true;
        console.log("[Redis] Connected successfully to Redis server");
      });

      this.redis.on("error", (err: any) => {
        if (this.isConnected) {
          console.warn(
            "[Redis] Connection lost, switching to in-memory cache:",
            err.message,
          );
        }
        this.isConnected = false;
      });

      // Attempt async connection
      this.redis.connect().catch(() => {
        this.isConnected = false;
        console.log(
          "[Redis] Redis not available locally. Utilizing high-performance In-Memory cache fallback.",
        );
      });
    } catch {
      this.isConnected = false;
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.isConnected && this.redis) {
      try {
        return await this.redis.get(key);
      } catch {
        // Fallback to memory
      }
    }
    const item = memoryStore.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      memoryStore.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.isConnected && this.redis) {
      try {
        if (ttlSeconds) {
          await this.redis.set(key, value, "EX", ttlSeconds);
        } else {
          await this.redis.set(key, value);
        }
        return;
      } catch {
        // Fallback to memory
      }
    }
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    memoryStore.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    if (this.isConnected && this.redis) {
      try {
        await this.redis.del(key);
      } catch {
        // Ignore
      }
    }
    memoryStore.delete(key);
  }

  async delPattern(pattern: string): Promise<void> {
    if (this.isConnected && this.redis) {
      try {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch {
        // Ignore
      }
    }
    const prefix = pattern.replace("*", "");
    for (const key of memoryStore.keys()) {
      if (key.startsWith(prefix)) {
        memoryStore.delete(key);
      }
    }
  }
}

export const cache = new CacheManager();
