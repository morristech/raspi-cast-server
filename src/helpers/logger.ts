import path from 'path';
import { createLogger, format, transports } from 'winston';

const { combine, timestamp, printf } = format;

export const logger = createLogger({
  format: combine(
    timestamp(),
    printf((info: any) => `${info.timestamp} ${info.level}: ${info.message}`),
  ),
  transports: [
    process.env.NODE_ENV === 'production'
      ? new transports.File({
          filename: path.join(process.cwd(), 'error.log'),
          level: process.env.LOG_LEVEL,
          maxsize: 5242880,
        })
      : new transports.Console({
          colorize: true,
          level: process.env.DEBUG ? 'debug' : process.env.LOG_LEVEL,
        }),
  ],
});
