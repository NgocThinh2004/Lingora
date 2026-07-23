import { Controller, Get } from '@nestjs/common';
import { PublicUsersService } from './public-users.service';

@Controller('users')
export class PublicUsersController {
  constructor(private readonly usersService: PublicUsersService) {}

  @Get('recommended')
  getRecommended() {
    return this.usersService.getRecommended();
  }
}
