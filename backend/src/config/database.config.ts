import { SequelizeModuleOptions } from '@nestjs/sequelize';
import { databaseModels } from '../database/models';

export function databaseConfig(): SequelizeModuleOptions {
  return {
    dialect: 'mysql',
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    username: process.env.DB_USER ?? 'lingora_app',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'lingora_dev',
    models: databaseModels,
    autoLoadModels: false,
    synchronize: false,
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    define: {
      underscored: true,
      freezeTableName: true,
    },
  };
}
