import { redis } from '../redis/redis';
import { pool } from '../db/db';
import { logger } from '../utils/logger';

export type BotState =
  | 'idle'
  | 'waiting_invoice_selection'
  | 'waiting_report_period'
  | 'waiting_confirmation';

export interface BotSession {
  phone: string;
  tenantId: string | null;
  role: 'user' | 'customer' | 'unknown';
  state: BotState;
  context: Record<string, any>;
  lastMessageAt: string;
}

class SessionService {
  private readonly sessionTtl = 1800; // 30 minutes in seconds

  /**
   * Get session from Redis. If missing, initializes a new session.
   */
  async getSession(phone: string, businessPhoneNumberId: string): Promise<BotSession> {
    const key = `bot:session:${phone}`;
    try {
      const data = await redis.get(key);
      if (data) {
        return JSON.parse(data) as BotSession;
      }
    } catch (err) {
      logger.error(`Redis error getting session for ${phone}`, err);
    }

    // Resolve tenantId and user role from Database
    const { tenantId, role } = await this.resolveTenantAndRole(phone);

    const newSession: BotSession = {
      phone,
      tenantId,
      role,
      state: 'idle',
      context: {},
      lastMessageAt: new Date().toISOString(),
    };

    await this.setSession(phone, newSession);
    return newSession;
  }

  /**
   * Save session to Redis with a 30 minutes TTL
   */
  async setSession(phone: string, session: BotSession): Promise<void> {
    const key = `bot:session:${phone}`;
    session.lastMessageAt = new Date().toISOString();
    try {
      await redis.set(key, JSON.stringify(session), 'EX', this.sessionTtl);
    } catch (err) {
      logger.error(`Redis error setting session for ${phone}`, err);
    }
  }

  /**
   * Delete session from Redis
   */
  async clearSession(phone: string): Promise<void> {
    const key = `bot:session:${phone}`;
    try {
      await redis.del(key);
    } catch (err) {
      logger.error(`Redis error clearing session for ${phone}`, err);
    }
  }

  /**
   * Determine tenantId and sender role:
   * 1. Check if phone matches User.phone (Business Owner/Admin)
   * 2. If not, check if phone matches Customer.phone (Client)
   */
  private async resolveTenantAndRole(phone: string): Promise<{ tenantId: string | null; role: 'user' | 'customer' | 'unknown' }> {
    // Standardize phone search matching (try with and without 91 country code)
    const cleaned = phone.replace(/\D/g, '');
    const clean10 = cleaned.length > 10 ? cleaned.slice(-10) : cleaned;
    const cleanWith91 = `91${clean10}`;
    const cleanWithPlus = `+91${clean10}`;
    const cleanWithZero = `0${clean10}`;

    const phoneVariants = [cleaned, clean10, cleanWith91, cleanWithPlus, cleanWithZero];

    try {
      // 1. Check if user is a business owner/admin
      const userRes = await pool.query(
        `SELECT "tenantId" FROM "User" WHERE phone = ANY($1) AND "isActive" = true LIMIT 1`,
        [phoneVariants],
      );

      if (userRes.rows.length > 0) {
        return {
          tenantId: userRes.rows[0].tenantId,
          role: 'user',
        };
      }

      // 2. Check if user is a customer
      const customerRes = await pool.query(
        `SELECT "tenantId" FROM "Customer" WHERE phone = ANY($1) AND "isActive" = true LIMIT 1`,
        [phoneVariants],
      );

      if (customerRes.rows.length > 0) {
        return {
          tenantId: customerRes.rows[0].tenantId,
          role: 'customer',
        };
      }
    } catch (err) {
      logger.error(`Database error resolving tenant for phone ${phone}`, err);
    }

    return {
      tenantId: null,
      role: 'unknown',
    };
  }

  /**
   * Find which tenant owns this phone number.
   * Maps wa:phone:{businessPhoneNumberId} -> tenantId
   */
  async getTenantByPhoneNumberId(phoneNumberId: string): Promise<string | null> {
    const key = `wa:phone:${phoneNumberId}`;
    try {
      const cached = await redis.get(key);
      if (cached) return cached;
    } catch (err) {
      logger.error(`Redis error looking up phone mapping for ${phoneNumberId}`, err);
    }

    // Default tenant or dynamically fetch from some config setting.
    // For now we query Tenant table and get first active tenant as default fallback
    try {
      const res = await pool.query(`SELECT id FROM "Tenant" WHERE "isActive" = true LIMIT 1`);
      if (res.rows.length > 0) {
        const defaultTenantId = res.rows[0].id;
        // Cache it
        await redis.set(key, defaultTenantId);
        return defaultTenantId;
      }
    } catch (err) {
      logger.error('DB error getting default fallback tenant', err);
    }

    return null;
  }
}

export const sessionService = new SessionService();
