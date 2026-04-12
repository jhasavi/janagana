import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Resend } from 'resend';

interface OnboardingEmailData {
  tenantId: string;
  adminEmail: string;
  orgName: string;
  day: number;
  template: string;
}

@Injectable()
export class OnboardingSequenceService {
  private resend: Resend;

  constructor(
    @InjectQueue('onboarding-emails') private onboardingQueue: Queue,
  ) {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async scheduleOnboardingEmails(tenantId: string, adminEmail: string, orgName: string) {
    const emailData = { tenantId, adminEmail, orgName };

    // Day 0: Welcome email (send immediately)
    await this.onboardingQueue.add('send-onboarding-email', {
      ...emailData,
      day: 0,
      template: 'welcome',
    });

    // Day 1: "Add your first member" tip
    await this.onboardingQueue.add('send-onboarding-email', {
      ...emailData,
      day: 1,
      template: 'add-first-member',
    }, {
      delay: 1 * 24 * 60 * 60 * 1000, // 1 day
    });

    // Day 3: "Create your first event" tip
    await this.onboardingQueue.add('send-onboarding-email', {
      ...emailData,
      day: 3,
      template: 'create-first-event',
    }, {
      delay: 3 * 24 * 60 * 60 * 1000, // 3 days
    });

    // Day 7: "Set up volunteer opportunities" tip
    await this.onboardingQueue.add('send-onboarding-email', {
      ...emailData,
      day: 7,
      template: 'volunteer-opportunities',
    }, {
      delay: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Day 10: "Your trial ends in 4 days" reminder
    await this.onboardingQueue.add('send-onboarding-email', {
      ...emailData,
      day: 10,
      template: 'trial-ending-soon',
    }, {
      delay: 10 * 24 * 60 * 60 * 1000, // 10 days
    });

    // Day 13: "Last day of trial" urgent reminder
    await this.onboardingQueue.add('send-onboarding-email', {
      ...emailData,
      day: 13,
      template: 'trial-last-day',
    }, {
      delay: 13 * 24 * 60 * 60 * 1000, // 13 days
    });
  }

  async cancelOnboardingEmails(tenantId: string) {
    const jobs = await this.onboardingQueue.getJobs(['delayed', 'waiting']);
    
    for (const job of jobs) {
      const data = job.data as OnboardingEmailData;
      if (data.tenantId === tenantId) {
        await job.remove();
      }
    }
  }

  async sendOnboardingEmail(data: OnboardingEmailData) {
    const { adminEmail, orgName, day, template } = data;

    let subject = '';
    let html = '';

    switch (template) {
      case 'welcome':
        subject = `Welcome to Jana Gana, ${orgName}!`;
        html = this.getWelcomeTemplate(orgName);
        break;
      case 'add-first-member':
        subject = 'Tip: Add your first member to Jana Gana';
        html = this.getAddMemberTemplate(orgName);
        break;
      case 'create-first-event':
        subject = 'Tip: Create your first event';
        html = this.getCreateEventTemplate(orgName);
        break;
      case 'volunteer-opportunities':
        subject = 'Tip: Set up volunteer opportunities';
        html = this.getVolunteerTemplate(orgName);
        break;
      case 'trial-ending-soon':
        subject = 'Your OrgFlow trial ends in 4 days';
        html = this.getTrialEndingSoonTemplate(orgName);
        break;
      case 'trial-last-day':
        subject = 'Last day of your OrgFlow trial';
        html = this.getTrialLastDayTemplate(orgName);
        break;
      default:
        return;
    }

    try {
      await this.resend.emails.send({
        from: 'OrgFlow <onboarding@orgflow.app>',
        to: adminEmail,
        subject,
        html,
      });
    } catch (error) {
      console.error('Failed to send onboarding email:', error);
    }
  }

  private getWelcomeTemplate(orgName: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to OrgFlow!</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <p style="font-size: 16px; line-height: 1.6;">Hi there,</p>
          <p style="font-size: 16px; line-height: 1.6;">Welcome to OrgFlow! We're excited to have <strong>${orgName}</strong> on board.</p>
          <p style="font-size: 16px; line-height: 1.6;">Your 14-day free trial is now active. You have full access to all features including:</p>
          <ul style="font-size: 16px; line-height: 1.6; padding-left: 20px;">
            <li>Member management</li>
            <li>Event creation and ticketing</li>
            <li>Volunteer tracking</li>
            <li>Club and group management</li>
            <li>Email campaigns</li>
            <li>Analytics and reporting</li>
          </ul>
          <p style="font-size: 16px; line-height: 1.6; margin-top: 20px;">To get started, log in to your dashboard and complete the quick setup wizard.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://orgflow.app/dashboard" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Go to Dashboard</a>
          </div>
          <p style="font-size: 14px; color: #666;">If you have any questions, reply to this email or reach out to support@orgflow.app</p>
        </div>
      </div>
    `;
  }

  private getAddMemberTemplate(orgName: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Quick Tip</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <p style="font-size: 16px; line-height: 1.6;">Hi there,</p>
          <p style="font-size: 16px; line-height: 1.6;">Now that you've set up your organization, let's add your first members!</p>
          <p style="font-size: 16px; line-height: 1.6;">You can:</p>
          <ul style="font-size: 16px; line-height: 1.6; padding-left: 20px;">
            <li>Add members individually</li>
            <li>Import from CSV (we have a template)</li>
            <li>Send sign-up links to members</li>
          </ul>
          <p style="font-size: 16px; line-height: 1.6; margin-top: 20px;">Start by going to the Members section of your dashboard.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://orgflow.app/dashboard/members" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Add Members</a>
          </div>
        </div>
      </div>
    `;
  }

  private getCreateEventTemplate(orgName: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Quick Tip</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <p style="font-size: 16px; line-height: 1.6;">Hi there,</p>
          <p style="font-size: 16px; line-height: 1.6;">Ready to create your first event?</p>
          <p style="font-size: 16px; line-height: 1.6;">With OrgFlow, you can easily:</p>
          <ul style="font-size: 16px; line-height: 1.6; padding-left: 20px;">
            <li>Create event pages with custom branding</li>
            <li>Sell tickets with Stripe integration</li>
            <li>Check in attendees at the door</li>
            <li>Send automated event reminders</li>
          </ul>
          <p style="font-size: 16px; line-height: 1.6; margin-top: 20px;">Try creating a simple event to see how it works!</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://orgflow.app/dashboard/events" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Create Event</a>
          </div>
        </div>
      </div>
    `;
  }

  private getVolunteerTemplate(orgName: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Quick Tip</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <p style="font-size: 16px; line-height: 1.6;">Hi there,</p>
          <p style="font-size: 16px; line-height: 1.6;">Volunteers are the heart of many organizations. Let's set up volunteer opportunities!</p>
          <p style="font-size: 16px; line-height: 1.6;">You can:</p>
          <ul style="font-size: 16px; line-height: 1.6; padding-left: 20px;">
            <li>Create volunteer opportunities</li>
            <li>Track volunteer hours</li>
            <li>Recognize top contributors</li>
            <li>Generate volunteer reports</li>
          </ul>
          <p style="font-size: 16px; line-height: 1.6; margin-top: 20px;">Head to the Volunteers section to get started.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://orgflow.app/dashboard/volunteers" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Manage Volunteers</a>
          </div>
        </div>
      </div>
    `;
  }

  private getTrialEndingSoonTemplate(orgName: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f59e0b; padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Trial Ending Soon</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <p style="font-size: 16px; line-height: 1.6;">Hi there,</p>
          <p style="font-size: 16px; line-height: 1.6;">Your OrgFlow trial for <strong>${orgName}</strong> ends in 4 days.</p>
          <p style="font-size: 16px; line-height: 1.6;">To continue using all features, choose a plan that fits your needs:</p>
          <ul style="font-size: 16px; line-height: 1.6; padding-left: 20px;">
            <li><strong>Starter ($29/mo)</strong> - Up to 100 members</li>
            <li><strong>Growth ($79/mo)</strong> - Up to 500 members (recommended)</li>
            <li><strong>Pro ($199/mo)</strong> - Unlimited members</li>
          </ul>
          <p style="font-size: 16px; line-height: 1.6; margin-top: 20px;">Save 17% with annual billing!</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://orgflow.app/dashboard/billing" style="background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Choose a Plan</a>
          </div>
          <p style="font-size: 14px; color: #666;">Your data will be preserved for 30 days after your trial ends.</p>
        </div>
      </div>
    `;
  }

  private getTrialLastDayTemplate(orgName: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #ef4444; padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Last Day of Trial</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <p style="font-size: 16px; line-height: 1.6;">Hi there,</p>
          <p style="font-size: 16px; line-height: 1.6;">Today is the last day of your OrgFlow trial for <strong>${orgName}</strong>.</p>
          <p style="font-size: 16px; line-height: 1.6;">Don't lose access to your data! Subscribe now to continue using OrgFlow.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://orgflow.app/dashboard/billing" style="background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Subscribe Now</a>
          </div>
          <p style="font-size: 14px; color: #666;">Your data will be preserved for 30 days. After that, your account will be deactivated.</p>
          <p style="font-size: 14px; color: #666; margin-top: 20px;">If you have any questions or need help, please contact us at support@orgflow.app</p>
        </div>
      </div>
    `;
  }
}
