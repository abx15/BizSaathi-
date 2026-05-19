import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: DatabaseService) {}

  async create(tenantId: string, dto: CreateCategoryDto) {
    return this.prisma.expenseCategory.create({
      data: {
        ...dto,
        tenantId,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.expenseCategory.findMany({
      where: {
        OR: [
          { tenantId },
          { tenantId: null, isDefault: true },
        ],
      },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    });
  }

  async findOne(tenantId: string, id: string) {
    const category = await this.prisma.expenseCategory.findFirst({
      where: {
        id,
        OR: [{ tenantId }, { tenantId: null, isDefault: true }],
      },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async update(tenantId: string, id: string, dto: UpdateCategoryDto) {
    const category = await this.findOne(tenantId, id);
    if (category.isDefault) {
      throw new NotFoundException('Cannot modify system default categories');
    }

    return this.prisma.expenseCategory.update({
      where: { id },
      data: dto,
    });
  }

  async remove(tenantId: string, id: string) {
    const category = await this.findOne(tenantId, id);
    if (category.isDefault) {
      throw new NotFoundException('Cannot delete system default categories');
    }

    const usedCount = await this.prisma.expense.count({
      where: { categoryId: id },
    });
    
    if (usedCount > 0) {
      return this.prisma.expenseCategory.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return this.prisma.expenseCategory.delete({
      where: { id },
    });
  }
}
