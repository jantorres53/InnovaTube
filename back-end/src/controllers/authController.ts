import { Request, Response } from 'express';
import { User } from '../models/User';
import { AuthService } from '../services/authService';
import fetch from 'node-fetch';

interface AuthenticatedRequest extends Request {
  user?: any;
}

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { firstName, lastName, username, email, password, recaptchaToken } = req.body;

      // Validar reCAPTCHA
      if (!recaptchaToken) {
        res.status(400).json({
          success: false,
          message: 'Por favor completa el reCAPTCHA'
        });
        return;
      }

      // Verificar reCAPTCHA v2 con Google
      const recaptchaResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`
      });

      const recaptchaData = await recaptchaResponse.json() as any;

      if (!recaptchaData.success) {
        res.status(400).json({
          success: false,
          message: 'Error en la verificación del reCAPTCHA'
        });
        return;
      }

      // En v2 no hay acción ni score

      // Validar contraseña
      if (password.length < 6) {
        res.status(400).json({
          success: false,
          message: 'La contraseña debe tener al menos 6 caracteres'
        });
        return;
      }

      // Verificar si el usuario ya existe
      const existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });

      if (existingUser) {
        res.status(400).json({
          success: false,
          message: existingUser.email === email 
            ? 'El email ya está registrado' 
            : 'El nombre de usuario ya está en uso'
        });
        return;
      }

      // Crear nuevo usuario
      const user = new User({
        firstName,
        lastName,
        username,
        email,
        password
      });

      await user.save();

      const userId = (user as any)._id.toString();

      // Crear sesión
      const token = await AuthService.createSession(userId);

      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        data: {
          token,
          user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            email: user.email,
            role: user.role
          }
        }
      });
    } catch (error) {
      console.error('Error en registro:', error);
      res.status(500).json({
        success: false,
        message: 'Error al registrar el usuario'
      });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { login, email, password } = req.body as any;

      // Determinar identificador: puede ser email o username
      const identifier: string | undefined = login || email;
      if (!identifier || !password) {
        res.status(400).json({
          success: false,
          message: 'Email/usuario y contraseña son requeridos'
        });
        return;
      }

      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

      // Buscar usuario por email o username
      const user = await User.findOne(isEmail ? { email: identifier.toLowerCase() } : { username: identifier }).select('+password');
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
        return;
      }

      const userId = (user as any)._id.toString();

      // Verificar contraseña
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
        return;
      }

      // Revocar sesiones anteriores del usuario
      await AuthService.revokeAllUserSessions(userId);

      // Crear nueva sesión
      const token = await AuthService.createSession(userId);

      res.json({
        success: true,
        message: 'Inicio de sesión exitoso',
        data: {
          token,
          user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            email: user.email,
            role: user.role
          }
        }
      });
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({
        success: false,
        message: 'Error al iniciar sesión'
      });
    }
  }

  static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      
      if (token) {
        await AuthService.revokeSession(token);
      }

      res.json({
        success: true,
        message: 'Cierre de sesión exitoso'
      });
    } catch (error) {
      console.error('Error en logout:', error);
      res.status(500).json({
        success: false,
        message: 'Error al cerrar sesión'
      });
    }
  }

  static async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      res.json({
        success: true,
        data: {
          user: req.user
        }
      });
    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener el perfil'
      });
    }
  }
}