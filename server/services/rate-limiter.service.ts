
export class RateLimiter {
  private requests: number[] = [];

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  async checkLimit(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      throw new Error(`Rate limit exceeded. Wait ${Math.ceil(waitTime / 1000)}s`);
    }
    
    this.requests.push(now);
  }

  getUsage(): { current: number; limit: number; resetTime: number } {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    const resetTime = this.requests.length > 0 
      ? this.requests[0] + this.windowMs 
      : now;
    
    return {
      current: this.requests.length,
      limit: this.maxRequests,
      resetTime
    };
  }
}
