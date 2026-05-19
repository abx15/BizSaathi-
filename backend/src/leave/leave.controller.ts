import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LeaveService } from './leave.service';
import { ApplyLeaveDto } from './dto/apply-leave.dto';
import { ApproveLeaveDto } from './dto/approve-leave.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Leave')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leave')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post('apply')
  @ApiOperation({ summary: 'Apply for leave' })
  apply(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: ApplyLeaveDto,
  ) {
    return this.leaveService.apply(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List leave requests' })
  @ApiQuery({ name: 'staffId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'month', required: false })
  findAll(
    @CurrentUser('tenantId') tenantId: string,
    @Query('staffId') staffId?: string,
    @Query('status') status?: string,
    @Query('month') month?: string,
  ) {
    return this.leaveService.findAll(tenantId, staffId, status, month);
  }

  @Put(':id/approve')
  @ApiOperation({ summary: 'Approve a leave request' })
  approve(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.leaveService.approve(tenantId, id, userId);
  }

  @Put(':id/reject')
  @ApiOperation({ summary: 'Reject a leave request' })
  reject(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: ApproveLeaveDto,
  ) {
    return this.leaveService.reject(tenantId, id, userId, dto.rejectionNote);
  }

  @Get('balance/:staffId')
  @ApiOperation({ summary: 'Get leave balance for a staff member' })
  getBalance(
    @CurrentUser('tenantId') tenantId: string,
    @Param('staffId') staffId: string,
  ) {
    return this.leaveService.getBalance(tenantId, staffId);
  }
}
