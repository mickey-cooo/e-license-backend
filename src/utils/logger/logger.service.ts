import { Injectable, LoggerService } from '@nestjs/common';
import chalk from 'chalk';
import dayjs from 'dayjs';

@Injectable()
export class Logger implements LoggerService {
  log(message: any, context?: string) {
    console.log(
      chalk.green(`${dayjs().format('YYYY-MM-DD:HH:mm:ss A')} ${message} `),
    );
  }

  error(message: any, context?: string) {
    console.error(
      chalk.red(`${dayjs().format('YYYY-MM-DD:HH:mm:ss A')} ${message}`),
    );
  }

  warn(message: any, context?: string) {
    console.warn(`${dayjs().format('YYYY-MM-DD:HH:mm:ss A')} ${message} `);
  }

  debug?(message: any, context?: string) {
    console.debug(`${dayjs().format('YYYY-MM-DD:HH:mm:ss A')} ${message} `);
  }
}
