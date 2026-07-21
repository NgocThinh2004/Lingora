import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse: any = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else {
        message = exceptionResponse.message || message;
        errors = exceptionResponse.error || exceptionResponse.errors || null;
      }
    } else if (exception instanceof Error) {
      // For unhandled exceptions
      message = exception.message;
    }

    response.status(status).json({
      data: null,
      meta: {
        error: {
          statusCode: status,
          message: Array.isArray(message) ? message[0] : message, // take first error if class-validator returns array
          details: Array.isArray(message) ? message : errors,
        }
      }
    });
  }
}
