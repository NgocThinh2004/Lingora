import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../../auth/optional-jwt-auth.guard';
import { PublicUsersService } from './public-users.service';

@Controller('users')
export class PublicUsersController {
  constructor(private readonly usersService: PublicUsersService) {}

  @Get('recommended')
  @UseGuards(OptionalJwtAuthGuard)
  getRecommended(@Req() req: any) {
    return this.usersService.getRecommended(req.user?.id);
  }

  @Get(':id/followers')
  async getFollowers(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.usersService.getFollowers(id) };
  }

  @Get(':id/following')
  async getFollowing(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.usersService.getFollowing(id) };
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async getProfile(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return { data: await this.usersService.getProfile(id, req.user?.id) };
  }
}
