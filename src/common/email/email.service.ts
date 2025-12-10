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
      this.transporter = null as unknown as nodemailer.Transporter;
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
      this.transporter = null as unknown as nodemailer.Transporter;
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
      this.logger.error(
        `Failed to send password reset email to ${email}:`,
        error,
      );
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
   * Send deposit approval email
   */
  async sendDepositApprovalEmail(
    email: string,
    userName: string,
    depositAmount: number,
    depositMonth: string,
    memberId: number,
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
      to: email,
      subject: 'Deposit Request Approved',
      html: this.getDepositApprovalEmailTemplate(
        userName,
        depositAmount,
        depositMonth,
        memberId,
      ),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Deposit approval email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send deposit approval email to ${email}:`,
        error,
      );
      throw new Error('Failed to send deposit approval email');
    }
  }

  /**
   * Send deposit rejection email
   */
  async sendDepositRejectionEmail(
    email: string,
    userName: string,
    depositAmount: number,
    depositMonth: string,
    rejectionReason: string,
    supportEmail?: string,
  ): Promise<void> {
    if (!this.transporter) {
      this.logger.error('SMTP transporter is not initialized');
      throw new Error('Email service is not configured');
    }

    const fromEmail =
      this.configService.get<string>(ENVEnum.SMTP_FROM_EMAIL) ||
      this.configService.get<string>(ENVEnum.SMTP_USER) ||
      'noreply@example.com';
    const fromName =
      this.configService.get<string>(ENVEnum.SMTP_FROM_NAME) || 'Money Backend';

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: 'Deposit Request Rejected',
      html: this.getDepositRejectionEmailTemplate(
        userName,
        depositAmount,
        depositMonth,
        rejectionReason,
        supportEmail || fromEmail,
      ),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Deposit rejection email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send deposit rejection email to ${email}:`,
        error,
      );
      throw new Error('Failed to send deposit rejection email');
    }
  }

  /**
   * Password reset email template
   */
  private getPasswordResetEmailTemplate(
    userName: string,
    resetLink: string,
  ): string {
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

  /**
   * Deposit approval email template
   */
  private getDepositApprovalEmailTemplate(
    userName: string,
    depositAmount: number,
    depositMonth: string,
    memberId: number,
  ): string {
    const formattedAmount = new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
    }).format(depositAmount);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Deposit Approved</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <div style="background-color: #10b981; color: #ffffff; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px; margin-bottom: 15px;">
                ✓
              </div>
            </div>
            <h2 style="color: #10b981; margin-top: 0; text-align: center;">Deposit Request Approved</h2>
            <p>Hello ${userName},</p>
            <p>We are pleased to inform you that your deposit request has been <strong style="color: #10b981;">approved</strong>.</p>
            
            <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h3 style="margin-top: 0; color: #333;">Deposit Details:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666; width: 40%;">Member ID:</td>
                  <td style="padding: 8px 0; font-weight: bold; color: #333;">BDT-2024-${String(memberId).padStart(6, '0')}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Deposit Amount:</td>
                  <td style="padding: 8px 0; font-weight: bold; color: #10b981; font-size: 18px;">${formattedAmount}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Month:</td>
                  <td style="padding: 8px 0; font-weight: bold; color: #333;">${depositMonth}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Status:</td>
                  <td style="padding: 8px 0; font-weight: bold; color: #10b981;">Approved ✓</td>
                </tr>
              </table>
            </div>

            <p style="background-color: #d1fae5; padding: 15px; border-radius: 5px; border-left: 4px solid #10b981;">
              <strong>What's Next?</strong><br>
              Your deposit has been successfully processed and recorded in your account. You can view your deposit history and account details by logging into your member portal.
            </p>

            <p>Thank you for your timely payment. We appreciate your commitment to the group.</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #666;">This is an automated email. Please do not reply to this message.</p>
            <p style="font-size: 12px; color: #666;">If you have any questions, please contact our support team.</p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Deposit rejection email template
   */
  private getDepositRejectionEmailTemplate(
    userName: string,
    depositAmount: number,
    depositMonth: string,
    rejectionReason: string,
    supportEmail: string,
  ): string {
    const formattedAmount = new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
    }).format(depositAmount);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Deposit Rejected</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <div style="background-color: #ef4444; color: #ffffff; width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px; margin-bottom: 15px;">
                ✗
              </div>
            </div>
            <h2 style="color: #ef4444; margin-top: 0; text-align: center;">Deposit Request Rejected</h2>
            <p>Hello ${userName},</p>
            <p>We regret to inform you that your deposit request has been <strong style="color: #ef4444;">rejected</strong>.</p>
            
            <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
              <h3 style="margin-top: 0; color: #333;">Deposit Details:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666; width: 40%;">Deposit Amount:</td>
                  <td style="padding: 8px 0; font-weight: bold; color: #333;">${formattedAmount}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Month:</td>
                  <td style="padding: 8px 0; font-weight: bold; color: #333;">${depositMonth}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Status:</td>
                  <td style="padding: 8px 0; font-weight: bold; color: #ef4444;">Rejected ✗</td>
                </tr>
              </table>
            </div>

            <div style="background-color: #fee2e2; padding: 15px; border-radius: 5px; border-left: 4px solid #ef4444; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #991b1b;">Rejection Reason:</h3>
              <p style="color: #7f1d1d; margin-bottom: 0;">${rejectionReason}</p>
            </div>

            <div style="background-color: #dbeafe; padding: 15px; border-radius: 5px; border-left: 4px solid #3b82f6; margin: 20px 0;">
              <strong style="color: #1e40af;">Need Help?</strong><br>
              <p style="color: #1e3a8a; margin-bottom: 0;">
                If you have any questions or concerns about this rejection, please contact our support team at 
                <a href="mailto:${supportEmail}" style="color: #3b82f6; text-decoration: none; font-weight: bold;">${supportEmail}</a>.
                We're here to help you resolve any issues.
              </p>
            </div>

            <p>Please review the rejection reason and contact our support team if you need assistance. You may submit a new deposit request after addressing the issues mentioned.</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #666;">This is an automated email. Please do not reply to this message.</p>
            <p style="font-size: 12px; color: #666;">For support, please contact: <a href="mailto:${supportEmail}" style="color: #3b82f6;">${supportEmail}</a></p>
          </div>
        </body>
      </html>
    `;
  }
}
