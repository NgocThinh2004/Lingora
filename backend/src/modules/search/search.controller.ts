import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { SearchService } from './search.service';

@Controller('search')
@UseGuards(ThrottlerGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  globalSearch(@Query('q') q: string) {
    return this.searchService.globalSearch(q);
  }
}
