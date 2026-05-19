import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto';
import { AttendanceFilterDto } from './dto/attendance-filter.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('mark')
  @ApiOperation({ summary: 'Mark attendance for a single staff' })
  mark(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: MarkAttendanceDto,
  ) {
    return this.attendanceService.mark(tenantId, userId, dto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Bulk mark attendance for all staff' })
  bulkMark(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: BulkAttendanceDto,
  ) {
    return this.attendanceService.bulkMark(tenantId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List attendance records with filters' })
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query() filter: AttendanceFilterDto,
  ) {
    return this.attendanceService.findAll(tenantId, filter);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get monthly attendance summary for all staff' })
  @ApiQuery({ name: 'month', required: true, example: '2025-01' })
  getSummary(
    @CurrentUser('tenantId') tenantId: string,
    @Query('month') month: string,
  ) {
    return this.attendanceService.getSummary(tenantId, month);
  }

  @Get('today')
  @ApiOperation({ summary: 'Get today attendance status for all staff' })
  getToday(@CurrentUser('tenantId') tenantId: string) {
    return this.attendanceService.getToday(tenantId);
  }
}
