
import { EventEmitter } from 'events';

interface Job {
  id: string;
  type: string;
  data: any;
  priority: number;
  attempts: number;
  maxAttempts: number;
  delay: number;
  createdAt: Date;
  scheduledFor: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  result?: any;
}

interface JobOptions {
  priority?: number;
  maxAttempts?: number;
  delay?: number;
  scheduledFor?: Date;
}

type JobHandler = (job: Job) => Promise<any>;

class JobQueue extends EventEmitter {
  private jobs = new Map<string, Job>();
  private handlers = new Map<string, JobHandler>();
  private processing = new Set<string>();
  private workers: Worker[] = [];
  private isRunning = false;
  private maxConcurrency = 5;
  private checkInterval = 1000;

  constructor(options: { maxConcurrency?: number; checkInterval?: number } = {}) {
    super();
    this.maxConcurrency = options.maxConcurrency || 5;
    this.checkInterval = options.checkInterval || 1000;
  }

  registerHandler(jobType: string, handler: JobHandler) {
    this.handlers.set(jobType, handler);
    console.log(`Registered handler for job type: ${jobType}`);
  }

  async add(type: string, data: any, options: JobOptions = {}): Promise<string> {
    const jobId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: Job = {
      id: jobId,
      type,
      data,
      priority: options.priority || 0,
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      delay: options.delay || 0,
      createdAt: new Date(),
      scheduledFor: options.scheduledFor || new Date(Date.now() + (options.delay || 0)),
      status: 'pending'
    };

    this.jobs.set(jobId, job);
    this.emit('job:added', job);
    
    console.log(`Added job ${jobId} of type ${type}`);
    return jobId;
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log(`Starting job queue with ${this.maxConcurrency} workers`);
    
    // Create workers
    for (let i = 0; i < this.maxConcurrency; i++) {
      this.workers.push(new Worker(i, this));
    }

    // Start the job checker
    this.startJobChecker();
  }

  stop() {
    this.isRunning = false;
    this.workers.forEach(worker => worker.stop());
    this.workers = [];
    console.log('Job queue stopped');
  }

  private startJobChecker() {
    const checkJobs = () => {
      if (!this.isRunning) return;

      this.processReadyJobs();
      setTimeout(checkJobs, this.checkInterval);
    };

    checkJobs();
  }

  private processReadyJobs() {
    const readyJobs = Array.from(this.jobs.values())
      .filter(job => 
        job.status === 'pending' && 
        job.scheduledFor <= new Date() &&
        !this.processing.has(job.id)
      )
      .sort((a, b) => b.priority - a.priority || a.createdAt.getTime() - b.createdAt.getTime());

    const availableWorkers = this.workers.filter(w => !w.isBusy());
    
    for (let i = 0; i < Math.min(readyJobs.length, availableWorkers.length); i++) {
      const job = readyJobs[i];
      const worker = availableWorkers[i];
      
      this.processing.add(job.id);
      worker.processJob(job);
    }
  }

  async processJob(job: Job): Promise<void> {
    const handler = this.handlers.get(job.type);
    
    if (!handler) {
      job.status = 'failed';
      job.error = `No handler registered for job type: ${job.type}`;
      this.processing.delete(job.id);
      this.emit('job:failed', job);
      return;
    }

    job.status = 'processing';
    job.attempts++;
    this.emit('job:started', job);

    try {
      const result = await handler(job);
      job.status = 'completed';
      job.result = result;
      this.processing.delete(job.id);
      this.emit('job:completed', job);
      console.log(`Job ${job.id} completed successfully`);
    } catch (error) {
      job.error = error.message;
      
      if (job.attempts >= job.maxAttempts) {
        job.status = 'failed';
        this.processing.delete(job.id);
        this.emit('job:failed', job);
        console.error(`Job ${job.id} failed permanently after ${job.attempts} attempts:`, error);
      } else {
        job.status = 'pending';
        job.scheduledFor = new Date(Date.now() + Math.pow(2, job.attempts) * 1000); // Exponential backoff
        this.processing.delete(job.id);
        this.emit('job:retry', job);
        console.warn(`Job ${job.id} failed, retrying in ${Math.pow(2, job.attempts)} seconds`);
      }
    }
  }

  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  getStats() {
    const jobs = Array.from(this.jobs.values());
    return {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'pending').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      activeWorkers: this.workers.filter(w => w.isBusy()).length,
      totalWorkers: this.workers.length
    };
  }

  cleanup(olderThanHours: number = 24) {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    let cleaned = 0;

    for (const [id, job] of this.jobs.entries()) {
      if ((job.status === 'completed' || job.status === 'failed') && job.createdAt < cutoff) {
        this.jobs.delete(id);
        cleaned++;
      }
    }

    console.log(`Cleaned up ${cleaned} old jobs`);
    return cleaned;
  }
}

class Worker {
  private busy = false;

  constructor(private id: number, private queue: JobQueue) {}

  isBusy(): boolean {
    return this.busy;
  }

  async processJob(job: Job) {
    this.busy = true;
    try {
      await this.queue.processJob(job);
    } finally {
      this.busy = false;
    }
  }

  stop() {
    // Workers stop automatically when they're not busy
  }
}

// Create global job queue instance
export const jobQueue = new JobQueue({ maxConcurrency: 5 });

// Register job handlers
jobQueue.registerHandler('research', async (job) => {
  console.log(`Processing research job ${job.id}`);
  
  // Import the research function dynamically to avoid circular dependencies
  const { performDeepResearch } = await import('../deerflow-integration');
  
  const result = await performDeepResearch(
    job.data.research_question,
    job.id,
    job.data.research_depth || 3
  );
  
  return result;
});

jobQueue.registerHandler('email_notification', async (job) => {
  console.log(`Processing email notification job ${job.id}`);
  // Implement email sending logic here
  return { sent: true, timestamp: new Date() };
});

jobQueue.registerHandler('cache_cleanup', async (job) => {
  console.log(`Processing cache cleanup job ${job.id}`);
  // Implement cache cleanup logic here
  return { cleaned: true, timestamp: new Date() };
});

jobQueue.registerHandler('data_backup', async (job) => {
  console.log(`Processing data backup job ${job.id}`);
  // Implement backup logic here
  return { backup_id: `backup_${Date.now()}`, timestamp: new Date() };
});

// Start the job queue
jobQueue.start();

// Schedule periodic cleanup
setInterval(() => {
  jobQueue.cleanup(24); // Clean up jobs older than 24 hours
}, 60 * 60 * 1000); // Run every hour
