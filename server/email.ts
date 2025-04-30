import { MailService } from '@sendgrid/mail';
import type { Prediction } from '@shared/schema';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@fantaschedina.com';

// Only initialize SendGrid if we have an API key
let mailService: MailService | null = null;

if (process.env.SENDGRID_API_KEY) {
  mailService = new MailService();
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('SendGrid mail service initialized');
} else {
  console.warn('No SENDGRID_API_KEY provided, email notifications will not be sent');
}

export async function sendPredictionNotification(prediction: Prediction): Promise<boolean> {
  if (!mailService) {
    console.warn('SendGrid not initialized, skipping email notification');
    return false;
  }

  try {
    const html = `
      <h2>New Prediction Received</h2>
      <p><strong>Name:</strong> ${prediction.name}</p>
      <p><strong>Prediction:</strong> ${prediction.prediction}</p>
      <p><strong>Time:</strong> ${new Date(prediction.createdAt).toLocaleString()}</p>
    `;

    await mailService.send({
      to: ADMIN_EMAIL,
      from: FROM_EMAIL,
      subject: 'New FantaSchedina Prediction',
      text: `New prediction by ${prediction.name}: ${prediction.prediction}`,
      html: html,
    });

    console.log(`Notification email sent to ${ADMIN_EMAIL}`);
    return true;
  } catch (error) {
    console.error('Failed to send email notification:', error);
    return false;
  }
}

export async function sendExcelImportReport(success: boolean, message: string): Promise<boolean> {
  if (!mailService) {
    console.warn('SendGrid not initialized, skipping email notification');
    return false;
  }

  try {
    const subject = success ? 'Match Import Successful' : 'Match Import Failed';
    const html = `
      <h2>${subject}</h2>
      <p>${message}</p>
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
    `;

    await mailService.send({
      to: ADMIN_EMAIL,
      from: FROM_EMAIL,
      subject: subject,
      text: message,
      html: html,
    });

    console.log(`Import report email sent to ${ADMIN_EMAIL}`);
    return true;
  } catch (error) {
    console.error('Failed to send email notification:', error);
    return false;
  }
}