import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(_err: any, user: any, _info: any) {
    // Return the user if authentication succeeds, otherwise return null without throwing an error
    return user || null;
  }
}
