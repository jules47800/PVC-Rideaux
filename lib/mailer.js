/**
 * Envoi des e-mails des formulaires par SMTP (nodemailer).
 *
 * Fonctionne avec n'importe quelle boîte mail : celle de l'hébergeur du nom de
 * domaine (OVH, Hostinger, Gandi…), Google Workspace, Microsoft 365, ou un
 * service d'envoi (Brevo, Resend, Mailjet…). Variables d'environnement :
 *
 *   SMTP_HOST, SMTP_PORT (465 = SSL, 587 = STARTTLS), SMTP_USER, SMTP_PASS
 *   MAIL_TO    adresse qui reçoit les demandes
 *   MAIL_FROM  expéditeur, sur le même domaine que la boîte SMTP (ex. no-reply@isorideaux.fr)
 *
 * En local sans SMTP_HOST, l'e-mail est affiché dans le terminal au lieu d'être envoyé.
 */
import nodemailer from 'nodemailer';

let transporter;

export const mailerConfigured = () =>
  Boolean(process.env.SMTP_HOST && process.env.MAIL_TO && process.env.MAIL_FROM);

/**
 * @param {{ subject: string, text: string, replyTo?: string, fromName: string }} message
 */
export async function sendMail({ subject, text, replyTo, fromName }) {
  if (!mailerConfigured()) {
    if (process.env.VERCEL)
      throw new Error('Envoi d’e-mail non configuré (SMTP_HOST, MAIL_TO, MAIL_FROM).');
    console.info(
      `\n[e-mail simulé — SMTP non configuré]\nObjet : ${subject}\nRépondre à : ${replyTo}\n\n${text}\n`,
    );
    return;
  }

  const port = Number(process.env.SMTP_PORT ?? 465);
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });

  await transporter.sendMail({
    from: { name: fromName, address: process.env.MAIL_FROM },
    to: process.env.MAIL_TO,
    replyTo,
    subject,
    text,
  });
}
