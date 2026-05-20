# BizSaathi Operations Runbook

This document is the official **Incident Management & Runbook** for the BizSaathi operations team. It provides actionable guidelines to resolve critical system issues in production.

---

## 🚨 Incident 1: System Down or High Error Rates

### Symptoms
* Prometheus alerts `ServiceDown` or `HighErrorRate` trigger.
* Grafana shows a spike in HTTP 5xx responses.
* Sentry begins receiving uncaught database or network errors.

### Action Plan
1. **Check System Health**:
   * Inspect basic health checking at `https://api.bizsaathi.com/api/health`
   * Inspect deep system checks (Database, Redis, Queues) at `https://api.bizsaathi.com/api/health/deep`
2. **Review Centralized Logs**:
   * If running on Docker Compose: `docker-compose -f docker-compose.prod.yml logs -f backend`
   * If on Railway: Run `railway logs` or check the service dashboard.
3. **Database Check**:
   * If database ping is down, verify PostgreSQL disk space and connection count.
   * Terminate long-running locking queries:
     ```sql
     SELECT pg_terminate_backend(pid) 
     FROM pg_stat_activity 
     WHERE state = 'active' AND age(clock_timestamp(), query_start) > interval '5 minutes';
     ```

---

## ⚡ Incident 2: Queue Pileups or Stuck Background Jobs

### Symptoms
* Prometheus alerts `QueueBacklogHigh` triggers (waiting queue counts exceed 5,000).
* Users report delays in PDF generation, SMS/WhatsApp delivery, or receipt processing.

### Action Plan
1. **Access Queue Dashboard API**:
   * Call `GET /api/v1/admin/queues` using admin credentials to see job statuses per queue.
2. **Prune/Retry Failed Jobs**:
   * Prune bloated job queues using:
     ```http
     POST /api/v1/admin/queues/pdf/prune
     ```
   * Bulk-retry failed jobs using:
     ```http
     POST /api/v1/admin/queues/pdf/retry
     ```
3. **Scale Background Workers**:
   * If the worker CPU load is high, scale the worker container replicas:
     ```bash
     docker-compose -f docker-compose.prod.yml up -d --scale worker=3
     ```

---

## 💬 Incident 3: WhatsApp Delivery Failures or Rate Limiting

### Symptoms
* Prometheus alerts `WhatsAppDeliveryFailuresHigh` triggers.
* Customers complain that OTP or notifications are not being received on WhatsApp.
* Sentry captures HTTP `429 Too Many Requests` or `130429` error codes from the Meta Graph API.

### Action Plan
1. **Check WhatsApp Queue Latency**:
   * Inspect the `whatsapp` queue active and delayed count.
2. **Verify Meta Credentials**:
   * Ensure `WHATSAPP_ACCESS_TOKEN` is not expired or revoked.
3. **Fallback Mechanism**:
   * If Meta rate limits are reached, the system will automatically hold jobs with backoffs.
   * If necessary, temporarily toggle the primary provider to SMS (Twilio) by changing the configuration variable `WHATSAPP_FALLBACK_TO_SMS` to `true` in the environment variables dashboard.

---

## 💾 Incident 4: Redis Out of Memory (OOM)

### Symptoms
* Redis logs show `OOM command not allowed when used memory > 'maxmemory'`.
* BullMQ stops processing and throws `Command failed` errors.

### Action Plan
1. **Eviction Policy Check**:
   * Ensure the Redis maxmemory eviction policy is set to `noeviction` for BullMQ queues (to avoid job loss) or `allkeys-lru` for pure cache instances.
2. **Clear Non-Essential Cache keys**:
   * Execute connection to Redis: `redis-cli -a <password>`
   * Clear rate limiting or transient caches: `KEYS "throttler:*" | xargs redis-cli -a <password> DEL`
3. **Prune Old Jobs**:
   * Invoke `POST /api/v1/admin/queues/<queue-name>/prune` to clear historical completed jobs.
