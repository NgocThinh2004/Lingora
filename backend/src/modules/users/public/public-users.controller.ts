import { Controller, Get, UseGuards, Req, Param } from '@nestjs/common';
import { PublicUsersService } from './public-users.service';
import { OptionalJwtAuthGuard } from '../../auth/optional-jwt-auth.guard';

@Controller('users')
export class PublicUsersController {
  constructor(private readonly usersService: PublicUsersService) {}

  @Get('recommended')
  @UseGuards(OptionalJwtAuthGuard)
  getRecommended(@Req() req: any) {
    return this.usersService.getRecommended(req.user?.id);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  getById(@Param('id') id: string, @Req() req: any) {
    return this.usersService.getById(id, req.user?.id);
  }
}
