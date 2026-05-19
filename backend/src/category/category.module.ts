import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { CategorySeeder } from './category.seeder';

@Module({
  controllers: [CategoryController],
  providers: [CategoryService, CategorySeeder],
  exports: [CategoryService],
})
export class CategoryModule {}
