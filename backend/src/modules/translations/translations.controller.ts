import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { RetryTranslationDto } from './dto/retry-translation.dto';
import { TranslationsService } from './translations.service';

@Controller('translations')
export class TranslationsController {
  constructor(private readonly translationsService: TranslationsService) {}

  @Get('posts/:postId/matrix')
  async getPostMatrix(
    @Headers('x-user-id') userId: string | undefined,
    @Headers('x-user-role') role: string | undefined,
    @Param('postId') postId: string,
  ) {
    this.assertAuthenticated(userId, role);

    return {
      data: await this.translationsService.getPostMatrix(postId),
    };
  }

  @Get(':id/attempts')
  async getAttempts(
    @Headers('x-user-id') userId: string | undefined,
    @Headers('x-user-role') role: string | undefined,
    @Param('id') postTranslationId: string,
  ) {
    this.assertAuthenticated(userId, role);

    return {
      data: await this.translationsService.getAttempts(postTranslationId),
    };
  }

  @Post('retry')
  async retry(
    @Headers('x-user-id') userId: string | undefined,
    @Headers('x-user-role') role: string | undefined,
    @Body() dto: RetryTranslationDto,
  ) {
    this.assertAuthenticated(userId, role);

    return {
      data: await this.translationsService.retryTranslation(dto.postTranslationId),
    };
  }

  @Post('worker/run-once')
  async runWorkerOnce(@Headers('x-user-role') role: string | undefined) {
    this.assertAdmin(role);

    return {
      data: await this.translationsService.processNextQueuedTranslation(),
    };
  }

  @Get('metrics')
  async getMetrics(@Headers('x-user-role') role: string | undefined) {
    this.assertAdmin(role);

    return {
      data: await this.translationsService.getMetrics(),
    };
  }

  private assertAuthenticated(userId: string | undefined, role: string | undefined): void {
    if (userId?.trim() || role?.trim().toLowerCase() === 'admin') {
      return;
    }

    throw new UnauthorizedException('x-user-id or x-user-role: admin header is required until auth guards are available');
  }

  private assertAdmin(role: string | undefined): void {
    if (role?.trim().toLowerCase() !== 'admin') {
      throw new ForbiddenException('x-user-role: admin header is required until the role guard is available');
    }
  }
}
