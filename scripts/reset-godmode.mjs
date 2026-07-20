import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

async function run() {
  try {
    const keys = await redis.keys('*godMode*');
    console.log('Keys matching *godMode*:', keys);
    
    // Also try checking the specific IP
    const keysIp = await redis.keys('*38.252.236.201*');
    console.log('Keys matching IP:', keysIp);

    if (keysIp.length > 0) {
      await redis.del(...keysIp);
      console.log('Deleted IP keys!');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
