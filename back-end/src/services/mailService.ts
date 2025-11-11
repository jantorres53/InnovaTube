import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Asegurar que las variables de entorno estén cargadas antes de crear el transporter
dotenv.config();

export class MailService {
  private static getTransporter() {
    const user = process.env.SMTP_USERNAME;
    const pass = process.env.SMTP_PASSWORD;

    if (!user || !pass) {
      throw new Error('Credenciales SMTP no configuradas');
    }

    // Crear transporter en el momento del envío para evitar uso de env no cargado
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // SSL
      auth: { user, pass },
    });
  }

  static async sendResetCode(email: string, code: string): Promise<void> {
    const transporter = this.getTransporter();
    const info = await transporter.sendMail({
      from: `InnovaTube <${process.env.SMTP_USERNAME}>`,
      to: email,
      subject: 'Código para restablecer tu contraseña',
      html: `
        <div style="font-family: Arial, sans-serif; color: #111;">
          <h2>Restablecer contraseña</h2>
          <p>Tu código de verificación es:</p>
          <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</div>
          <p>Este código expira en 10 minutos.</p>
          <p>Si no solicitaste este cambio, ignora este correo.</p>
        </div>
      `,
    });
    if (process.env.NODE_ENV === 'development') {
      console.log('Mail enviado:', info.messageId, 'para', email, 'código:', code);
    }
  }
}