import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authService } from '../services/auth.service';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../db';

export async function setupAuthRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/auth/signup
   * Criar novo usuário
   */
  fastify.post<{ Body: { email: string; password: string; name?: string } }>(
    '/api/auth/signup',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { email, password, name } = request.body;

        const result = await authService.signup(email, password, name);

        return reply.code(201).send(result);
      } catch (error: any) {
        console.error('[AUTH SIGNUP ERROR]', error);

        return reply.code(400).send({
          error: error.message || 'Erro ao criar conta',
        });
      }
    }
  );

  /**
   * POST /api/auth/login
   * Autenticar usuário
   */
  fastify.post<{ Body: { email: string; password: string } }>(
    '/api/auth/login',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { email, password } = request.body;

        const result = await authService.login(email, password);

        return reply.send(result);
      } catch (error: any) {
        console.error('[AUTH LOGIN ERROR]', error);

        return reply.code(401).send({
          error: error.message || 'Erro ao fazer login',
        });
      }
    }
  );

  /**
   * GET /api/auth/me
   * Obter dados do usuário autenticado
   */
  fastify.get('/api/auth/me', { onRequest: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return reply.code(404).send({
          error: 'Usuário não encontrado',
        });
      }

      return reply.send(user);
    } catch (error) {
      console.error('[AUTH ME ERROR]', error);

      return reply.code(500).send({
        error: 'Erro ao obter dados do usuário',
      });
    }
  });

  /**
   * POST /api/auth/logout
   * Logout (apenas para confirmar, token é invalidado no frontend)
   */
  fastify.post('/api/auth/logout', { onRequest: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      ok: true,
      message: 'Logout realizado com sucesso',
    });
  });

  /**
   * POST /api/auth/refresh
   * Renovar token (se implementar refresh tokens depois)
   */
  fastify.post('/api/auth/refresh', { onRequest: [requireAuth] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).userId;
      const userEmail = (request as any).userEmail;

      const token = authService.generateToken(userId, userEmail);

      return reply.send({
        token,
      });
    } catch (error) {
      console.error('[AUTH REFRESH ERROR]', error);

      return reply.code(500).send({
        error: 'Erro ao renovar token',
      });
    }
  });
}
