import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  AdminLanguagesQueryDto,
  CreateAdminLanguageDto,
  UpdateAdminLanguageDto,
} from './dto/admin-languages.dto';
import { LanguagesService } from './languages.service';

@Controller('languages')
export class PublicLanguagesController {
  constructor(private readonly languagesService: LanguagesService) {}

  @Get()
  findActive() {
    return this.languagesService.findActive();
  }
}

@Controller('admin/languages')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminLanguagesController {
  constructor(private readonly languagesService: LanguagesService) {}

  @Get()
  findAll(@Query() query: AdminLanguagesQueryDto) {
    return this.languagesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) languageId: number) {
    return this.languagesService.findOne(languageId);
  }

  @Post()
  create(@Body() dto: CreateAdminLanguageDto) {
    return this.languagesService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) languageId: number,
    @Body() dto: UpdateAdminLanguageDto,
  ) {
    return this.languagesService.update(languageId, dto);
  }
}
