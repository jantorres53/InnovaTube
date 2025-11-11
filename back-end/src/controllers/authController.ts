import { Request, Response } from 'express';
import { User } from '../models/User';
import { AuthService } from '../services/authService';
import fetch from 'node-fetch';
import { PasswordReset } from '../models/PasswordReset';
import { MailService } from '../services/mailService';

interface AuthenticatedRequest extends Request {
  user?: any;
}

// Tipado de la respuesta de verificación de reCAPTCHA (v2/v3)
interface RecaptchaVerifyResponse {
  success?: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

// Verificación de reCAPTCHA v2/v3
async function verifyRecaptchaToken(token: string | undefined): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  const env = (process.env.NODE_ENV || 'development');
  if (!token) return false;
  if (!secret) {
    // En desarrollo, permitir funcionar sin secret para no bloquear
    if (env === 'development') {
      console.warn('RECAPTCHA_SECRET_KEY no configurada. Se omite verificación en desarrollo.');
      return true;
    }
    console.error('RECAPTCHA_SECRET_KEY no configurada. Bloqueando por seguridad en producción.');
    return false;
  }
  try {
    const params = new URLSearchParams({
      secret,
      response: token,
    });
    const resp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await resp.json() as RecaptchaVerifyResponse;
    return !!data.success;
  } catch (err) {
    console.error('Error verificando reCAPTCHA:', err);
    return false;
  }
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
      const { login, email, password, recaptchaToken } = req.body as any;
      // Validar reCAPTCHA
      const recaptchaOk = await verifyRecaptchaToken(recaptchaToken);
      if (!recaptchaOk) {
        res.status(400).json({ success: false, message: 'reCAPTCHA inválido o faltante' });
        return;
      }

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

  static async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const { email, recaptchaToken } = req.body as any;
      // Validar reCAPTCHA
      const recaptchaOk = await verifyRecaptchaToken(recaptchaToken);
      if (!recaptchaOk) {
        res.status(400).json({ success: false, message: 'reCAPTCHA inválido o faltante' });
        return;
      }
      if (!email || typeof email !== 'string') {
        res.status(400).json({ success: false, message: 'Email requerido' });
        return;
      }
      const normalizedEmail = email.toLowerCase().trim();

      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        // No revelar si el email existe
        res.json({ success: true, message: 'Si el correo existe, se enviará un código' });
        return;
      }

      // Generar código 6 dígitos y expiración a 10 min
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await PasswordReset.create({ email: normalizedEmail, code, expiresAt, used: false });
      try {
        await MailService.sendResetCode(normalizedEmail, code);
      } catch (mailError) {
        console.error('Error enviando correo de recuperación:', mailError);
        // No revelar detalles, responder genérico
      }

      const payload: any = { success: true, message: 'Se ha enviado un código al correo si existe' };
      // En desarrollo, incluir el código para facilitar pruebas si el correo falla
      if ((process.env.NODE_ENV || 'development') === 'development') {
        payload.devCode = code;
      }
      res.json(payload);
    } catch (error) {
      console.error('Error solicitando recuperación:', error);
      res.status(500).json({ success: false, message: 'Error al solicitar recuperación' });
    }
  }

  static async verifyResetCode(req: Request, res: Response): Promise<void> {
    try {
      const { email, code } = req.body as any;
      if (!email || !code) {
        res.status(400).json({ success: false, message: 'Email y código son requeridos' });
        return;
      }
      const normalizedEmail = email.toLowerCase().trim();

      const record = await PasswordReset.findOne({ email: normalizedEmail, code, used: false });
      if (!record || record.expiresAt.getTime() < Date.now()) {
        res.status(400).json({ success: false, message: 'Código inválido o expirado' });
        return;
      }
      res.json({ success: true, message: 'Código válido' });
    } catch (error) {
      console.error('Error verificando código:', error);
      res.status(500).json({ success: false, message: 'Error al verificar código' });
    }
  }

  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email, code, newPassword } = req.body as any;
      if (!email || !code || !newPassword) {
        res.status(400).json({ success: false, message: 'Email, código y nueva contraseña son requeridos' });
        return;
      }
      if (typeof newPassword !== 'string' || newPassword.length < 8) {
        res.status(400).json({ success: false, message: 'La nueva contraseña debe tener al menos 8 caracteres' });
        return;
      }
      const normalizedEmail = email.toLowerCase().trim();

      const record = await PasswordReset.findOne({ email: normalizedEmail, code, used: false });
      if (!record || record.expiresAt.getTime() < Date.now()) {
        res.status(400).json({ success: false, message: 'Código inválido o expirado' });
        return;
      }

      const user = await User.findOne({ email: normalizedEmail }).select('+password');
      if (!user) {
        res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        return;
      }

      user.password = newPassword;
      await user.save();

      record.used = true;
      await record.save();

      // Revocar sesiones previas
      await AuthService.revokeAllUserSessions((user as any)._id.toString());

      res.json({ success: true, message: 'Contraseña restablecida correctamente' });
    } catch (error) {
      console.error('Error restableciendo contraseña:', error);
      res.status(500).json({ success: false, message: 'Error al restablecer contraseña' });
    }
  }
}