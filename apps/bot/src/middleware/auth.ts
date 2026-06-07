import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authService } from '../services/auth.service';

/**
 * Interface para estender contexto do Fastify com usuário autenticado
 */
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: any;
    }
  }
}

/**
 * Decorador Fastify para autenticação JWT
 */
export async function setupAuthMiddleware(fastify: FastifyInstance) {
  fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      // Extrair token do header Authorization
      const authHeader = request.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.code(401).send({
          error: 'Token não encontrado ou formato inválido',
        });
      }

      const token = authHeader.slice(7); // Remove "Bearer "

      // Verificar token
      const payload = authService.verifyToken(token);

      // Adicionar informações do usuário ao request
      (request as any).userId = payload.userId;
      (request as any).userEmail = payload.email;
    } catch (error) {
      return reply.code(401).send({
        error: 'Token inválido ou expirado',
      });
    }
  });
}

/**
 * Hook para proteger rota específica
 */
export const requireAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({
        error: 'Token não encontrado',
      });
    }

    const token = authHeader.slice(7);
    const payload = authService.verifyToken(token);

    (request as any).userId = payload.userId;
    (request as any).userEmail = payload.email;
  } catch (error) {
    return reply.code(401).send({
      error: 'Token inválido ou expirado',
    });
  }
};
