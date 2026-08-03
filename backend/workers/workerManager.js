// workers/
import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class WorkerManager {
    constructor() {
        this.workers = new Map();  // Track active workers
        this.taskId = 0;
    }
    
    // Process an image in a worker thread
    processImage(userId, imageBuffer, imageType, imageName) {
        return new Promise((resolve, reject) => {
            const taskId = this.taskId++;
            
            // Create worker
            const worker = new Worker(
                path.join(__dirname, 'imageWorker.js'),
                {
                    workerData: {
                        userId,
                        imageBuffer,
                        imageType,
                        imageName
                    }
                }
            );
            
            // Store worker
            this.workers.set(taskId, worker);
            
            // Handle messages from worker
            worker.on('message', (result) => {
                this.workers.delete(taskId);
                if (result.success) {
                    resolve(result.data);
                } else {
                    reject(new Error(result.error));
                }
            });
            
            // Handle errors
            worker.on('error', (error) => {
                this.workers.delete(taskId);
                reject(error);
            });
            
            // Handle exit
            worker.on('exit', (code) => {
                if (code !== 0) {
                    this.workers.delete(taskId);
                    reject(new Error(`Worker stopped with exit code ${code}`));
                }
            });
            
            // Timeout after 30 seconds
            setTimeout(() => {
                if (this.workers.has(taskId)) {
                    worker.terminate();
                    this.workers.delete(taskId);
                    reject(new Error('Image processing timeout'));
                }
            }, 30000);
        });
    }
    
    // Get number of active workers
    getActiveWorkerCount() {
        return this.workers.size;
    }
    
    // Terminate all workers (on shutdown)
    async terminateAll() {
        const terminationPromises = [];
        for (const [id, worker] of this.workers) {
            terminationPromises.push(worker.terminate());
        }
        await Promise.all(terminationPromises);
        this.workers.clear();
    }
}

// Singleton instance
export const workerManager = new WorkerManager();