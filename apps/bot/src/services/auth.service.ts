import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { config } from '../config';

const JWT_SECRET = config.auth.jwtSecret;
const JWT_EXPIRY = '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  token: string;
}

export class AuthService {
  /**
   * Fazer hash de senha
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  /**
   * Comparar senha com hash
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Gerar JWT token
   */
  generateToken(userId: string, email: string): string {
    return jwt.sign(
      {
        userId,
        email,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );
  }

  /**
   * Verificar JWT token
   */
  verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
      throw new Error('Token inválido ou expirado');
    }
  }

  /**
   * Signup - Criar novo usuário
   */
  async signup(email: string, password: string, name?: string): Promise<AuthResponse> {
    // Validar email
    if (!email || !email.includes('@')) {
      throw new Error('Email inválido');
    }

    // Validar senha (mínimo 6 caracteres)
    if (!password || password.length < 6) {
      throw new Error('Senha deve ter no mínimo 6 caracteres');
    }

    // Verificar se usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('Email já cadastrado');
    }

    // Hash da senha
    const passwordHash = await this.hashPassword(password);

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        passwordHash,
        isActive: true,
      },
    });

    // Gerar token
    const token = this.generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    };
  }

  /**
   * Login - Autenticar usuário
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    if (!email || !password) {
      throw new Error('Email e senha são obrigatórios');
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error('Email ou senha incorretos');
    }

    // Verificar se usuário está ativo
    if (!user.isActive) {
      throw new Error('Usuário desativado');
    }

    // Verificar senha
    if (!user.passwordHash) {
      throw new Error('Email ou senha incorretos');
    }

    const isPasswordValid = await this.comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new Error('Email ou senha incorretos');
    }

    // Atualizar último login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Gerar token
    const token = this.generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    };
  }

  /**
   * Obter usuário a partir do token
   */
  async getUserFromToken(token: string) {
    const payload = this.verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.isActive) {
      throw new Error('Usuário não encontrado');
    }

    return user;
  }
}

export const authService = new AuthService();
