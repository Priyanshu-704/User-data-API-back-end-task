import { AsyncQueueStats } from "index";

export interface QueueItem<T> {
  id: string;
  task: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: any) => void;
  priority?: number; 
}

export function createAsyncQueue<T = any>(maxConcurrent: number = 5) {
  let queue: QueueItem<T>[] = [];
  let isProcessing = false;
  let activeWorkers = 0;
  let completedTasks = 0;
  let failedTasks = 0;

  const processQueue = async (): Promise<void> => {
    if (isProcessing || activeWorkers >= maxConcurrent) {
      return;
    }

    isProcessing = true;

    while (queue.length > 0 && activeWorkers < maxConcurrent) {
      const item = queue.shift();
      if (!item) continue;

      activeWorkers++;
     

      item
        .task()
        .then(result => {
          completedTasks++;
          item.resolve(result);
        
        })
        .catch(error => {
          failedTasks++;
          item.reject(error);
         
        })
        .finally(() => {
          activeWorkers--;
          isProcessing = false;
          processQueue();
        });
    }

    isProcessing = false;
  };

  const enqueue = (
    task: () => Promise<T>,
    priority: number = 0,
    id?: string
  ): Promise<T> => {
    const taskId =
      id ??
      `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    return new Promise<T>((resolve, reject) => {
      const item: QueueItem<T> = {
        id: taskId,
        task,
        resolve,
        reject,
        priority
      };

      let inserted = false;
      for (let i = 0; i < queue.length; i++) {
        if ((queue[i].priority ?? 0) < priority) {
          queue.splice(i, 0, item);
          inserted = true;
          break;
        }
      }

      if (!inserted) {
        queue.push(item);
      }

      processQueue();
    });
  };

  const getStats = (): AsyncQueueStats => ({
    queueSize: queue.length,
    activeWorkers,
    maxConcurrent,
    completedTasks,
    failedTasks,
    totalProcessed: completedTasks + failedTasks
  });

  const clear = (): void => {
    const cleared = queue.length;
    queue = [];
  
  };

  const getQueueItems = (): QueueItem<T>[] => [...queue];

  return {
    enqueue,
    getStats,
    clear,
    getQueueItems
  };
}
