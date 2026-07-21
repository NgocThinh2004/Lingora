import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    this.from = this.configService.get<string>('MAIL_FROM') || 'Lingora <no-reply@example.com>';
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: Number(this.configService.get<string>('SMTP_PORT') || 587),
      secure: this.configService.get<string>('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASSWORD'),
      },
    });
  }

  async sendPasswordResetOtp(to: string, otp: string, expiresInMinutes: number): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: 'Lingora password reset code',
      text: [
        `Your Lingora password reset code is: ${otp}`,
        `This code expires in ${expiresInMinutes} minutes.`,
        'If you did not request this, you can ignore this email.',
      ].join('\n'),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
          <h2 style="margin-bottom:8px">Reset your Lingora password</h2>
          <p>Use this verification code to reset your password:</p>
          <p style="font-size:30px;font-weight:700;letter-spacing:8px;margin:20px 0">${otp}</p>
          <p>This code expires in <strong>${expiresInMinutes} minutes</strong>.</p>
          <p style="color:#6b7280">If you did not request this, you can safely ignore this email.</p>
        </div>
      `,
    });
  }
}
