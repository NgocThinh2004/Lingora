import { ConfigService } from '@nestjs/config';
import { SequelizeModuleOptions } from '@nestjs/sequelize';
import { databaseModels } from '../database/models';

export function databaseConfig(configService: ConfigService): SequelizeModuleOptions {
  return {
    dialect: 'mysql',
    host: configService.get<string>('DB_HOST', '127.0.0.1'),
    port: configService.get<number>('DB_PORT', 3306),
    username: configService.get<string>('DB_USER', 'lingora_app'),
    password: configService.get<string>('DB_PASSWORD', ''),
    database: configService.get<string>('DB_NAME', 'lingora_dev'),
    models: databaseModels,
    autoLoadModels: false,
    synchronize: false,
    logging: configService.get<string>('DB_LOGGING') === 'true' ? console.log : false,
    define: {
      underscored: true,
      freezeTableName: true,
    },
  };
}
