import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { databaseModels } from './models';

@Module({
  imports: [
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        dialect: 'mysql',
        host: configService.get<string>('DB_HOST') ?? '127.0.0.1',
        port: configService.get<number>('DB_PORT') ?? 3306,
        username: configService.get<string>('DB_USER') ?? 'lingora_app',
        password: configService.get<string>('DB_PASSWORD') ?? '',
        database: configService.get<string>('DB_NAME') ?? 'lingora_dev',
        models: databaseModels,
        autoLoadModels: false,
        synchronize: false,
        logging: configService.get<string>('DB_LOGGING') === 'true' ? console.log : false,
        define: {
          underscored: true,
          freezeTableName: true,
        },
      }),
    }),
  ],
  exports: [SequelizeModule],
})
export class DatabaseModule {}
