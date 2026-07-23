import { Controller, Get } from '@nestjs/common';
import { LanguagesService } from '../languages.service';

@Controller('languages')
export class PublicLanguagesController {
  constructor(private readonly languagesService: LanguagesService) {}

  @Get()
  findActive() {
    return this.languagesService.findActive();
  }
}
