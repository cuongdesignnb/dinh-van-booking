import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { Prisma } from '../../generated/prisma/client';

/**
 * Turns the database's own complaints into the HTTP answers the admin expects.
 * Without this a duplicate slug reaches the client as a bare 500, which tells
 * the person nothing about what to change.
 */
@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientValidationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(
    exception: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientValidationError,
    host: ArgumentsHost,
  ): void {
    const reply = host.switchToHttp().getResponse<FastifyReply>();

    if (!(exception instanceof Prisma.PrismaClientKnownRequestError)) {
      // A malformed query is our bug, not the caller's — log it, say little.
      this.logger.error('Prisma validation error', exception.message);
      void reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: 'internal_error',
        message: 'Có lỗi nội bộ. Thử lại hoặc báo quản trị viên.',
      });
      return;
    }

    const target = Array.isArray(exception.meta?.target)
      ? (exception.meta.target as string[]).join(', ')
      : (exception.meta?.target as string | undefined);

    switch (exception.code) {
      case 'P2034':
        void reply.status(HttpStatus.CONFLICT).send({
          statusCode: HttpStatus.CONFLICT,
          code: 'transaction_conflict',
          message: 'Dữ liệu vừa được cập nhật đồng thời. Hãy tải lại và thử lại.',
        });
        return;
      case 'P2002':
        void reply.status(HttpStatus.CONFLICT).send({
          statusCode: HttpStatus.CONFLICT,
          code: 'duplicate',
          message: 'Giá trị này đã tồn tại. Chọn giá trị khác.',
          field: target ?? null,
        });
        return;
      case 'P2003':
        void reply.status(HttpStatus.BAD_REQUEST).send({
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'invalid_reference',
          message: 'Bản ghi liên kết không tồn tại.',
          field: target ?? null,
        });
        return;
      case 'P2025':
        void reply.status(HttpStatus.NOT_FOUND).send({
          statusCode: HttpStatus.NOT_FOUND,
          code: 'not_found',
          message: 'Không tìm thấy bản ghi.',
        });
        return;
      case 'P2007':
      case 'P2023':
        void reply.status(HttpStatus.BAD_REQUEST).send({
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'invalid_input',
          message: 'Dữ liệu gửi lên không hợp lệ.',
        });
        return;
      default:
        // A check constraint tripping means our own guard let something through.
        this.logger.error(`Unhandled Prisma error ${exception.code}`, exception.message);
        void reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          code: 'internal_error',
          message: 'Có lỗi nội bộ. Thử lại hoặc báo quản trị viên.',
        });
    }
  }
}
