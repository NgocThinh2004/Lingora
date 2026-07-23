import { Test, TestingModule } from '@nestjs/testing';
import { LikesService } from './likes.service';
import { getModelToken } from '@nestjs/sequelize';
import { PostLike } from './models/post-like.model';
import { CommentLike } from './models/comment-like.model';
import { Post } from '../posts/models/post.model';
import { Comment } from '../comments/models/comment.model';

describe('LikesService', () => {
  let service: LikesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LikesService,
        { provide: getModelToken(PostLike), useValue: {} },
        { provide: getModelToken(CommentLike), useValue: {} },
        { provide: getModelToken(Post), useValue: {} },
        { provide: getModelToken(Comment), useValue: {} },
      ],
    }).compile();

    service = module.get<LikesService>(LikesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
