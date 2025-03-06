// backend/src/utils/redis.mts
import redis from "redis";
import * as dotenv from "dotenv";
dotenv.config();

let client: redis.RedisClientType;

const createRedisClient = async () => {
  try {
    client = redis.createClient({
      url: process.env.REDIS_URL,
    });

    client.on("error", (err: any) => console.error("Redis Client Error", err));

    await client.connect();
    console.log("Redis client connected");
    return client;
  } catch (error) {
    console.error("Error connecting to Redis:", error);
    throw error; // Rethrow the error to be handled by the caller.
  }
};

const getRedisClient = async (): Promise<redis.RedisClientType> => {
  if (!client || !client.isOpen) {
    return createRedisClient();
  }
  return client;
};

export default getRedisClient;
