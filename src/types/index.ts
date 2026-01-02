import { Request, Response, NextFunction } from 'express';

export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}


export interface AsyncQueueStats {
  queueSize: number;
  activeWorkers: number;
  maxConcurrent: number;
  completedTasks: number;
  failedTasks: number;
  totalProcessed: number;
}