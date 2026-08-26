import pino from 'pino';
import { pinoHttp } from 'pino-http';
import { randomUUID } from 'crypto';
import { env } from '../config/env.js';
import { IncomingMessage, ServerResponse } from 'http';

export const logger = pino({
  level: env.nodeEnv === 'production' ? 'info' : 'debug',
  transport:
    env.nodeEnv !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req: IncomingMessage) => (req.headers['x-request-id'] as string) || randomUUID(),
  customLogLevel: (req: IncomingMessage, res: ServerResponse, err?: Error) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req: (req: any) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      query: req.query,
      params: req.params,
      headers: {
        'user-agent': req.headers['user-agent'],
        'x-request-id': req.headers['x-request-id'],
      },
    }),
    res: (res: any) => ({
      statusCode: res.statusCode,
    }),
  },
});
