import { Controller, Post, Body, UseGuards, Get, Put, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { BusinessSetupDto } from './dto/business-setup.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload, JwtRefreshPayload } from './interfaces/jwt-payload.interface';
import { RefreshTokenGuard } from '../common/guards/refresh-token.guard';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() sendOtpDto: SendOtpDto) {
    const { expiresIn } = await this.authService.sendOtp(sendOtpDto.phone);
    return {
      message: 'OTP sent',
      expiresIn,
    };
  }

  @Public()
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto, @Req() req: Request) {
    const result = await this.authService.verifyOtp(verifyOtpDto.phone, verifyOtpDto.otp, req.headers['x-tenant-id'] as string);
    return result;
  }

  @Public()
  @UseGuards(RefreshTokenGuard)
  @Post('token/refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@CurrentUser() user: JwtRefreshPayload) {
    return this.authService.refreshToken(user.sub, user.tokenId);
  }

  @Post('business/setup')
  async setupBusiness(@CurrentUser() user: JwtPayload, @Body() setupDto: BusinessSetupDto) {
    const tenant = await this.authService.setupBusiness(user.tenantId, setupDto);
    return { tenant };
  }

  @Put('me')
  async updateProfile(@CurrentUser() user: JwtPayload, @Body() updateDto: UpdateProfileDto) {
    const updatedUser = await this.authService.updateProfile(user.sub, updateDto);
    return { user: updatedUser };
  }

  @Get('me')
  async getProfile(@CurrentUser() user: JwtPayload) {
    return this.authService.getProfile(user.sub, user.tenantId);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: JwtPayload) {
    await this.authService.logout(user.sub);
    return { message: 'Logged out' };
  }
}
