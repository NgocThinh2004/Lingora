import { Controller, Get, Param } from '@nestjs/common';
import { LocaleBundlesService } from '../locale-bundles.service';

@Controller('locales')
export class PublicLocalesController {
  constructor(private readonly localeBundlesService: LocaleBundlesService) {}

  @Get(':code')
  getBundle(@Param('code') code: string) {
    return this.localeBundlesService.getActiveBundle(code);
  }
}
