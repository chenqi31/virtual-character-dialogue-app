import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse();
      if (typeof r === 'string') {
        message = r;
      } else if (typeof r === 'object' && r !== null) {
        message = (r as { message?: string | string[] }).message ?? r;
      }
      code = HttpStatus[status] ?? code;
    } else if (exception instanceof Error) {
      message = exception.message;
      // MySQL / better-sqlite3 断连错误信息
      const codeStr = (exception as { code?: string }).code;
      if (codeStr === 'PROTOCOL_CONNECTION_LOST' || codeStr === 'ECONNRESET') {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        code = 'DB_CONNECTION_LOST';
        message = '数据库连接已断开，请稍后重试';
      }
    }

    this.logger.error(`[${status}] ${code} ${JSON.stringify(message)}`);
    res.status(status).json({ code, message, status });
  }
}
