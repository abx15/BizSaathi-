import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffFilterDto } from './dto/staff-filter.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';

@ApiTags('Staff')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new staff member' })
  create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateStaffDto,
  ) {
    return this.staffService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all staff with filters' })
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() filter: StaffFilterDto,
  ) {
    return this.staffService.findAll(tenantId, filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get staff profile with attendance, payroll, leaves' })
  findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.staffService.findOne(tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update staff details' })
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.staffService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Terminate staff member (soft delete)' })
  remove(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.staffService.remove(tenantId, id);
  }

  @Post(':id/documents')
  @ApiOperation({ summary: 'Upload staff document (Aadhar, PAN, etc.)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  uploadDocument(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') staffId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('docType') docType: string,
    @Body('title') title: string,
  ) {
    return this.staffService.uploadDocument(tenantId, staffId, file, docType, title);
  }
}
