import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Session } from '../models/Session';

export class AuthService {
  static generateToken(userId: string): string {
    const payload = { userId };
    const secret = process.env.JWT_SECRET!;
    const options: jwt.SignOptions = { expiresIn: '7d' };
    return jwt.sign(payload, secret, options);
  }

  static async createSession(userId: string): Promise<string> {
    const token = this.generateToken(userId);
    
    // Calcular fecha de expiración
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 días

    await Session.create({
      userId,
      token,
      expiresAt
    });

    return token;
  }

  static async validateSession(token: string): Promise<boolean> {
    try {
      const session = await Session.findOne({ token });
      return session !== null && !session.isExpired();
    } catch (error) {
      return false;
    }
  }

  static async revokeSession(token: string): Promise<void> {
    await Session.deleteOne({ token });
  }

  static async revokeAllUserSessions(userId: string): Promise<void> {
    await Session.deleteMany({ userId });
  }

  static verifyToken(token: string): any {
    return jwt.verify(token, process.env.JWT_SECRET!);
  }
}