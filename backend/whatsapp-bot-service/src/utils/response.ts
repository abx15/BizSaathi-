import { FastifyReply } from 'fastify';

export const success = (reply: FastifyReply, data: any = {}, statusCode = 200) => {
  return reply.status(statusCode).send({
    success: true,
    data,
  });
};

export const error = (reply: FastifyReply, message: string, code = 'INTERNAL_ERROR', statusCode = 500) => {
  return reply.status(statusCode).send({
    success: false,
    error: {
      message,
      code,
    },
  });
};
