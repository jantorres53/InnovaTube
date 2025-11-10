import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Session } from '../models/Session';

interface AuthenticatedRequest extends Request {
  user?: any;
}

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ 
        success: false, 
        message: 'No se proporcionó token de autenticación' 
      });
      return;
    }

    // Verificar si la sesión existe y no está expirada
    const session = await Session.findOne({ token });
    if (!session || session.isExpired()) {
      res.status(401).json({ 
        success: false, 
        message: 'Sesión inválida o expirada' 
      });
      return;
    }

    // Verificar el token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Buscar el usuario
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(401).json({ 
        success: false, 
        message: 'Usuario no encontrado' 
      });
      return;
    }

    // Adjuntar usuario a la petición
    req.user = user;
    next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Token inválido' 
    });
  }
};

export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (token) {
      const session = await Session.findOne({ token });
      if (session && !session.isExpired()) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        const user = await User.findById(decoded.userId);
        if (user) {
          req.user = user;
        }
      }
    }

    next();
  } catch (error) {
    // Si hay error, continuar sin usuario autenticado
    next();
  }
};