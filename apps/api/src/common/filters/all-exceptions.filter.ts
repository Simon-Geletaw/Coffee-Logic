import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  catch(exception: unknown, host: ArgumentsHost): void {
    // Get the context of the request and response objects
    const ctx = host.switchToHttp(); // Get the response object from the context
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    // Log the exception (you can customize this as needed)
    //send status to the client
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error: string = 'InternalServerError';
    if (exception instanceof HttpException) {
      const payload = exception.getResponse();
      if (typeof payload === 'string') {
        message = payload;
        error = exception.name;
      } else if (typeof payload === 'object' && payload !== null) {
        const body = payload as { message?: string | string[]; error?: string }; // change the object to match the existing structure
        message = body.message || 'An error occurred';
        error = body.error || exception.name;
      }
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${String(message)}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }
    response.status(status).json({
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
