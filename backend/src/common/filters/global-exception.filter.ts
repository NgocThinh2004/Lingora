import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

/**
 * GlobalExceptionFilter - Bộ lọc ngoại lệ toàn cục cho toàn bộ ứng dụng.
 * 
 * Mục đích: Bắt tất cả các ngoại lệ (cả đã xử lý và chưa xử lý) trong ứng dụng NestJS,
 * sau đó trả về response lỗi theo đúng format chuẩn đã thống nhất:
 * {
 *   success: false,
 *   data: null,
 *   status: <HTTP status code>,
 *   message: <thông báo lỗi>,
 *   details: <chi tiết lỗi nếu có>
 * }
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    
    // Giá trị mặc định cho trường hợp lỗi chưa được xử lý (500 Internal Server Error)
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let details: any = null;

    if (exception instanceof HttpException) {
      // Lỗi có kiểm soát từ NestJS (4xx, 5xx đã được throw có chủ ý)
      status = exception.getStatus();
      const exceptionResponse: any = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else {
        // class-validator thường trả về `message` là một mảng các lỗi validation
        // → lấy phần tử đầu tiên làm message chính, còn lại đưa vào details
        message = Array.isArray(exceptionResponse.message)
          ? exceptionResponse.message[0]
          : (exceptionResponse.message || message);
        details = Array.isArray(exceptionResponse.message)
          ? exceptionResponse.message
          : (exceptionResponse.error || exceptionResponse.errors || null);
      }
    } else if (exception instanceof Error) {
      // Lỗi runtime không mong muốn (VD: TypeError, ReferenceError, v.v.)
      message = exception.message;
    }

    // Trả về response lỗi theo format chuẩn đã thống nhất
    response.status(status).json({
      success: false,
      data: null,
      status,
      message,
      // Chỉ đưa details vào response nếu có giá trị (tránh trường details: null không cần thiết)
      ...(details ? { details } : {}),
    });
  }
}
