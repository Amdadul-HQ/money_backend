import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { ENVEnum } from '../enum/env.enum';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const host = this.configService.get<string>(ENVEnum.SMTP_HOST);
    const port = this.configService.get<number>(ENVEnum.SMTP_PORT);
    const user = this.configService.get<string>(ENVEnum.SMTP_USER);
    const pass = this.configService.get<string>(ENVEnum.SMTP_PASS);

    if (!host || !port || !user || !pass) {
      this.logger.warn(
        'SMTP configuration is incomplete. Email service will not be available.',
      );
      // Create a dummy transporter that will fail gracefully
      this.transporter = null as any;
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(port),
        secure: port === 465, // true for 465, false for other ports
        auth: {
          user,
          pass,
        },
      });

      // Verify connection asynchronously (don't block startup)
      this.transporter.verify((error) => {
        if (error) {
          this.logger.error('SMTP connection error:', error);
        } else {
          this.logger.log('SMTP server is ready to send emails');
        }
      });
    } catch (error) {
      this.logger.error('Failed to initialize SMTP transporter:', error);
      this.transporter = null as any;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    userName: string,
  ): Promise<void> {
    if (!this.transporter) {
      this.logger.error('SMTP transporter is not initialized');
      throw new Error('Email service is not configured');
    }

    const frontendUrl = this.configService.get<string>(
      ENVEnum.FRONTEND_URL,
      'http://localhost:3000',
    );
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
    const fromEmail =
      this.configService.get<string>(ENVEnum.SMTP_FROM_EMAIL) ||
      this.configService.get<string>(ENVEnum.SMTP_USER);
    const fromName =
      this.configService.get<string>(ENVEnum.SMTP_FROM_NAME) || 'Money Backend';

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: 'Password Reset Request',
      html: this.getPasswordResetEmailTemplate(userName, resetLink),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}:`, error);
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Send generic email
   */
  async sendEmail(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<void> {
    if (!this.transporter) {
      this.logger.error('SMTP transporter is not initialized');
      throw new Error('Email service is not configured');
    }

    const fromEmail =
      this.configService.get<string>(ENVEnum.SMTP_FROM_EMAIL) ||
      this.configService.get<string>(ENVEnum.SMTP_USER);
    const fromName =
      this.configService.get<string>(ENVEnum.SMTP_FROM_NAME) || 'Money Backend';

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html,
      text,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Password reset email template
   */
  private getPasswordResetEmailTemplate(userName: string, resetLink: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
            <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
            <p>Hello ${userName},</p>
            <p>We received a request to reset your password. Click the button below to reset it:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #007bff; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #007bff;">${resetLink}</p>
            <p><strong>This link will expire in 15 minutes.</strong></p>
            <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #666;">This is an automated email. Please do not reply to this message.</p>
          </div>
        </body>
      </html>
    `;
  }
}

