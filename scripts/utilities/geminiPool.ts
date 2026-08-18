import "./loadEnv";

class GeminiKeyPool {
  private keys: string[] = [];
  private currentIndex: number = 0;
  private throttledKeys: Map<string, number> = new Map();

  constructor() {
    const raw = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
    this.keys = raw
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
  }

  public hasKeys(): boolean {
    return this.keys.length > 0;
  }

  public getKey(): string | null {
    if (this.keys.length === 0) return null;

    const now = Date.now();
    for (let i = 0; i < this.keys.length; i++) {
      const idx = (this.currentIndex + i) % this.keys.length;
      const candidate = this.keys[idx];
      const throttledUntil = this.throttledKeys.get(candidate) || 0;

      if (now > throttledUntil) {
        this.currentIndex = (idx + 1) % this.keys.length;
        return candidate;
      }
    }

    const key = this.keys[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    return key;
  }

  public markRateLimited(key: string, cooldownMs: number = 300000) {
    this.throttledKeys.set(key, Date.now() + cooldownMs);
    console.log(`[gemini-pool] Key ...${key.slice(-8)} temporarily paused for ${cooldownMs / 1000}s. Switched to next active key.`);
  }

  public getPoolSize(): number {
    return this.keys.length;
  }
}

export const geminiKeyPool = new GeminiKeyPool();
