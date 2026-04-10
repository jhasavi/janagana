import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Resend } from 'resend';

interface CreateFeedbackDto {
  tenantId?: string;
  rating: number;
  feedback: string;
  featureRequest?: string;
}

@Injectable()
export class FeedbackService {
  private resend: Resend;

  constructor(private readonly db: DatabaseService) {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async createFeedback(data: CreateFeedbackDto) {
    const feedback = await this.db.feedback.create({
      data: {
        tenantId: data.tenantId,
        rating: data.rating,
        feedback: data.feedback,
        featureRequest: data.featureRequest,
      },
    });

    // Send email notification to admin
    await this.sendNotification(feedback);

    return feedback;
  }

  async sendNotification(feedback: any) {
    try {
      const ratingStars = '⭐'.repeat(feedback.rating);
      
      await this.resend.emails.send({
        from: 'OrgFlow Feedback <feedback@orgflow.app>',
        to: process.env.ADMIN_EMAIL || 'admin@orgflow.app',
        subject: `New Feedback: ${ratingStars}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">New Feedback Received</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <p style="font-size: 16px; line-height: 1.6;"><strong>Rating:</strong> ${ratingStars} (${feedback.rating}/5)</p>
              ${feedback.tenantId ? `<p style="font-size: 16px; line-height: 1.6;"><strong>Tenant ID:</strong> ${feedback.tenantId}</p>` : ''}
              ${feedback.feedback ? `
                <p style="font-size: 16px; line-height: 1.6;"><strong>Feedback:</strong></p>
                <p style="font-size: 14px; line-height: 1.6; background: white; padding: 15px; border-radius: 5px;">${feedback.feedback}</p>
              ` : ''}
              ${feedback.featureRequest ? `
                <p style="font-size: 16px; line-height: 1.6; margin-top: 15px;"><strong>Feature Request:</strong></p>
                <p style="font-size: 14px; line-height: 1.6; background: white; padding: 15px; border-radius: 5px;">${feedback.featureRequest}</p>
              ` : ''}
              <p style="font-size: 14px; color: #666; margin-top: 20px;">Submitted at: ${new Date(feedback.createdAt).toLocaleString()}</p>
            </div>
          </div>
        `,
      });
    } catch (error) {
      console.error('Failed to send feedback notification:', error);
    }
  }

  async getFeedback(tenantId?: string) {
    const where = tenantId ? { tenantId } : {};
    return this.db.feedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
