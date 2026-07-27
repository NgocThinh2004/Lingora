import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { SearchService } from './search.service';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';

@Controller('search')
@UseGuards(ThrottlerGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  globalSearch(@Query('q') q: string, @Req() req: any) {
    return this.searchService.globalSearch(q, req.user?.id);
  }
}
