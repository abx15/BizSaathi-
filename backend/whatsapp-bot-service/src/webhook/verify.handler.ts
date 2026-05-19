import { FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config';
import { logger } from '../utils/logger';

export const verifyWebhookHandler = async (
  req: FastifyRequest<{
    Querystring: {
      'hub.mode'?: string;
      'hub.challenge'?: string;
      'hub.verify_token'?: string;
    };
  }>,
  reply: FastifyReply,
) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  logger.info('Meta webhook verification requested', { mode, token });

  if (mode && token) {
    if (mode === 'subscribe' && token === config.WHATSAPP_VERIFY_TOKEN) {
      logger.info('Meta webhook verified successfully');
      return reply.status(200).send(challenge);
    } else {
      logger.warn('Meta webhook verification failed: Token mismatch', { token });
      return reply.status(403).send('Forbidden: Token mismatch');
    }
  }

  logger.warn('Meta webhook verification failed: Missing mode or token');
  return reply.status(400).send('Bad Request');
};
