import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import { BusinessSetupDto } from './dto/business-setup.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtPayload, JwtRefreshPayload } from './interfaces/jwt-payload.interface';
import { HashUtil } from '../common/utils/hash.util';
import { LoggerService } from '../logger/logger.service';
import { QueueService } from '../queue/queue.service';
import { UserRole } from '@prisma/client';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: DatabaseService,
    private readonly redis: RedisService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly queue: QueueService,
  ) {
    this.logger.setContext(AuthService.name);
  }

  async sendOtp(phone: string) {
    const otpExpiry = this.configService.get<number>('otp.expirySeconds') || 600;
    
    // Check rate limit in Redis
    const rateLimitKey = `otp_rate_limit:${phone}`;
    const attempts = await this.redis.incr(rateLimitKey);
    if (attempts === 1) {
      await this.redis.expire(rateLimitKey, 600); // 10 minutes window
    }
    
    if (attempts > 3) {
      throw new BadRequestException('Maximum OTP requests reached. Please try again later.');
    }

    // Generate 6 digit OTP
    const otp = process.env.NODE_ENV === 'development' ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();
    
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + otpExpiry);

    // Save to database
    await this.prisma.otpVerification.create({
      data: {
        phone,
        otp,
        expiresAt,
      },
    });

    // Check if user exists to find email
    const user = await this.prisma.user.findUnique({
      where: { phone },
    });

    // Dispatch background OTP jobs
    await this.queue.sendOTPWhatsApp({
      phone,
      otp,
      expiryMinutes: Math.ceil(otpExpiry / 60),
    });

    if (user?.email) {
      await this.queue.sendOTPEmail({
        phone,
        email: user.email,
        otp,
        expiryMinutes: Math.ceil(otpExpiry / 60),
      });
    }

    if (process.env.NODE_ENV === 'development') {
      this.logger.log(`Development OTP for ${phone}: ${otp}`);
    }

    return { expiresIn: otpExpiry };
  }

  async verifyOtp(phone: string, otp: string, providedTenantId?: string) {
    const maxAttempts = this.configService.get<number>('otp.maxAttempts') || 5;

    const otpRecord = await this.prisma.otpVerification.findFirst({
      where: {
        phone,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new BadRequestException({ code: 'OTP_EXPIRED', message: 'OTP has expired or does not exist. Please request a new one.' });
    }

    if (otpRecord.attempts >= maxAttempts) {
      throw new BadRequestException('Maximum OTP attempts reached. Request a new OTP.');
    }

    if (otpRecord.otp !== otp) {
      await this.prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Invalid OTP');
    }

    // Mark verified
    await this.prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    // Check if user exists
    let user = await this.prisma.user.findUnique({
      where: { phone },
      include: { tenant: true },
    });

    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const tenantName = `Business - ${phone}`;
      const slug = `biz-${Date.now().toString(36)}`;

      user = await this.prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            name: tenantName,
            slug,
            phone,
          },
        });

        return tx.user.create({
          data: {
            phone,
            tenantId: tenant.id,
            role: UserRole.OWNER,
          },
          include: { tenant: true },
        });
      });
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }

    const tokens = await this.generateTokens(user.id, user.tenantId, user.role, user.phone);
    return { ...tokens, user, isNewUser };
  }

  private async generateTokens(userId: string, tenantId: string, role: UserRole, phone: string) {
    const accessSecret = this.configService.get<string>('jwt.accessSecret');
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret');
    const accessExpiresIn = this.configService.get<string>('jwt.accessExpiresIn');
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn');

    const accessPayload: JwtPayload = { sub: userId, tenantId, role, phone };
    const accessToken = this.jwtService.sign(accessPayload, {
      secret: accessSecret,
      expiresIn: accessExpiresIn,
    });

    const refreshTokenString = randomBytes(32).toString('hex');
    const hashedRefreshToken = await HashUtil.hash(refreshTokenString);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const refreshTokenRecord = await this.prisma.refreshToken.create({
      data: {
        userId,
        token: hashedRefreshToken,
        expiresAt,
      },
    });

    const refreshPayload: JwtRefreshPayload = { sub: userId, tokenId: refreshTokenRecord.id };
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn,
    });

    await this.redis.set(`session:${userId}`, refreshTokenRecord.id, 7 * 24 * 60 * 60);

    return { accessToken, refreshToken };
  }

  async refreshToken(userId: string, tokenId: string) {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { id: tokenId },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.isRevoked || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: tokenId },
      data: { isRevoked: true },
    });

    const user = tokenRecord.user;
    return this.generateTokens(user.id, user.tenantId, user.role, user.phone);
  }

  async setupBusiness(tenantId: string, dto: BusinessSetupDto) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: dto.businessName,
        gstNumber: dto.gstNumber,
        address: `${dto.address}, ${dto.city}, ${dto.state}`,
      },
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
  }

  async getProfile(userId: string, tenantId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    return { user, tenant };
  }

  async logout(userId: string) {
    const sessionTokenId = await this.redis.get(`session:${userId}`);
    if (sessionTokenId) {
      await this.prisma.refreshToken.update({
        where: { id: sessionTokenId },
        data: { isRevoked: true },
      });
      await this.redis.del(`session:${userId}`);
    }
  }
}
