import { Resend } from 'resend';
import type { Passenger } from "@shared/schema";

export { getResendClient };

function getFromEmail(): string {
  const customFrom = process.env.FROM_EMAIL;
  if (customFrom) {
    return `SecureFlow <${customFrom}>`;
  }
  return 'SecureFlow <onboarding@resend.dev>';
}

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY not configured');
  }
  return new Resend(apiKey);
}

function getClient(): { client: Resend; fromEmail: string } {
  const client = getResendClient();
  const fromEmail = getFromEmail();
  return { client, fromEmail };
}

function formatDate(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

const SITE_URL = process.env.CUSTOM_DOMAIN ? `https://${process.env.CUSTOM_DOMAIN}` : 'https://secureflowid.com';

function emailWrapper(title: string, subtitle: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;">
<tr><td align="center" style="padding:30px 15px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

<!-- HEADER WITH LOGO -->
<tr><td style="background:linear-gradient(135deg,#0f2b5e 0%,#1e40af 50%,#2563eb 100%);padding:32px 40px;text-align:center;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding-bottom:12px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="background:rgba(255,255,255,0.15);border-radius:12px;padding:10px 14px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="width:36px;height:36px;background:#ffffff;border-radius:8px;text-align:center;vertical-align:middle;">
<span style="font-size:20px;font-weight:900;color:#1e40af;line-height:36px;">SF</span>
</td>
<td style="padding-left:10px;">
<span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">SecureFlow</span>
</td>
</tr></table>
</td>
</tr></table>
</td></tr>
<tr><td align="center">
<p style="color:rgba(255,255,255,0.85);margin:0;font-size:13px;letter-spacing:1px;text-transform:uppercase;">${subtitle}</p>
</td></tr>
</table>
</td></tr>

<!-- TITLE BAR -->
<tr><td style="background:#ffffff;padding:24px 40px 0;">
<h1 style="margin:0;color:#0f172a;font-size:20px;font-weight:700;border-bottom:2px solid #e2e8f0;padding-bottom:16px;">${title}</h1>
</td></tr>

<!-- BODY -->
<tr><td style="background:#ffffff;padding:20px 40px 28px;">
${bodyContent}
</td></tr>

<!-- FOOTER -->
<tr><td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td>
<p style="margin:0 0 8px;color:#334155;font-size:13px;font-weight:600;">SecureFlow - Assurance Transport</p>
<table role="presentation" cellpadding="0" cellspacing="0">
<tr>
<td style="padding:3px 0;"><span style="color:#64748b;font-size:12px;">Tel :</span> <a href="tel:+22950363636" style="color:#1e40af;font-size:12px;text-decoration:none;font-weight:500;">+229 50 36 36 36</a></td>
</tr>
<tr>
<td style="padding:3px 0;"><span style="color:#64748b;font-size:12px;">WhatsApp :</span> <a href="https://wa.me/22950363636" style="color:#16a34a;font-size:12px;text-decoration:none;font-weight:500;">+229 50 36 36 36</a></td>
</tr>
<tr>
<td style="padding:3px 0;"><span style="color:#64748b;font-size:12px;">Email :</span> <a href="mailto:infosecureflowco@gmail.com" style="color:#1e40af;font-size:12px;text-decoration:none;font-weight:500;">infosecureflowco@gmail.com</a></td>
</tr>
<tr>
<td style="padding:3px 0;"><span style="color:#64748b;font-size:12px;">Site :</span> <a href="${SITE_URL}" style="color:#1e40af;font-size:12px;text-decoration:none;font-weight:500;">secureflowid.com</a></td>
</tr>
</table>
</td></tr>
</table>
</td></tr>

<!-- COPYRIGHT -->
<tr><td style="background:#0f2b5e;padding:16px 40px;text-align:center;">
<p style="margin:0;color:rgba(255,255,255,0.6);font-size:11px;">SecureFlow &copy; ${new Date().getFullYear()} - Tous droits reserves | Cotonou, Benin</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

export async function sendPassengerNotificationToInsurance(
  passenger: Passenger,
  insuranceEmail: string,
  insuranceName: string,
  agentName: string,
  verifyUrl: string
) {
  try {
    const { client, fromEmail } = getClient();
    const policyNumber = `SF-${String(passenger.id).padStart(6, "0")}`;

    const bodyContent = `
<p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 16px;">
  Un nouveau passager a ete enregistre par l'agent <strong style="color:#0f172a;">${agentName}</strong> pour votre compagnie <strong style="color:#0f172a;">${insuranceName}</strong>.
</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin:16px 0;">
<tr><td style="padding:16px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr style="border-bottom:1px solid #e2e8f0;">
<td style="padding:10px 0;color:#64748b;font-size:13px;">N\u00b0 Police</td>
<td style="padding:10px 0;font-weight:700;text-align:right;color:#1e40af;font-size:14px;">${policyNumber}</td>
</tr>
<tr style="border-bottom:1px solid #e2e8f0;">
<td style="padding:10px 0;color:#64748b;font-size:13px;">Nom complet</td>
<td style="padding:10px 0;font-weight:600;text-align:right;color:#0f172a;">${passenger.fullName}</td>
</tr>
<tr style="border-bottom:1px solid #e2e8f0;">
<td style="padding:10px 0;color:#64748b;font-size:13px;">Telephone</td>
<td style="padding:10px 0;font-weight:600;text-align:right;color:#0f172a;">${passenger.phone}</td>
</tr>
${passenger.email ? `<tr style="border-bottom:1px solid #e2e8f0;">
<td style="padding:10px 0;color:#64748b;font-size:13px;">Email</td>
<td style="padding:10px 0;font-weight:600;text-align:right;color:#0f172a;">${passenger.email}</td>
</tr>` : ""}
${passenger.documentType ? `<tr style="border-bottom:1px solid #e2e8f0;">
<td style="padding:10px 0;color:#64748b;font-size:13px;">Document</td>
<td style="padding:10px 0;font-weight:600;text-align:right;color:#0f172a;">${passenger.documentType} - ${passenger.documentNumber || "-"}</td>
</tr>` : ""}
${passenger.emergencyContactName ? `<tr style="border-bottom:1px solid #e2e8f0;">
<td style="padding:10px 0;color:#64748b;font-size:13px;">Contact urgence</td>
<td style="padding:10px 0;font-weight:600;text-align:right;color:#0f172a;">${passenger.emergencyContactName} (${passenger.emergencyContactPhone || "-"})</td>
</tr>` : ""}
<tr style="border-bottom:1px solid #e2e8f0;">
<td style="padding:10px 0;color:#64748b;font-size:13px;">Compagnie</td>
<td style="padding:10px 0;font-weight:600;text-align:right;color:#0f172a;">${passenger.company}</td>
</tr>
${passenger.departure ? `<tr style="border-bottom:1px solid #e2e8f0;">
<td style="padding:10px 0;color:#64748b;font-size:13px;">Depart</td>
<td style="padding:10px 0;font-weight:600;text-align:right;color:#0f172a;">${passenger.departure}</td>
</tr>` : ""}
<tr style="border-bottom:1px solid #e2e8f0;">
<td style="padding:10px 0;color:#64748b;font-size:13px;">Destination</td>
<td style="padding:10px 0;font-weight:600;text-align:right;color:#0f172a;">${passenger.destination}</td>
</tr>
${passenger.busNumber ? `<tr style="border-bottom:1px solid #e2e8f0;">
<td style="padding:10px 0;color:#64748b;font-size:13px;">N\u00b0 Bus</td>
<td style="padding:10px 0;font-weight:600;text-align:right;color:#0f172a;">${passenger.busNumber}</td>
</tr>` : ""}
<tr style="border-bottom:1px solid #e2e8f0;">
<td style="padding:10px 0;color:#64748b;font-size:13px;">Date de voyage</td>
<td style="padding:10px 0;font-weight:600;text-align:right;color:#0f172a;">${formatDate(passenger.travelDate)}</td>
</tr>
<tr style="border-bottom:1px solid #e2e8f0;">
<td style="padding:10px 0;color:#64748b;font-size:13px;">Heure</td>
<td style="padding:10px 0;font-weight:600;text-align:right;color:#0f172a;">${passenger.travelTime}</td>
</tr>
<tr style="border-bottom:1px solid #e2e8f0;">
<td style="padding:10px 0;color:#64748b;font-size:13px;">Prime</td>
<td style="padding:10px 0;font-weight:700;text-align:right;color:#1e40af;font-size:15px;">${passenger.price} FCFA</td>
</tr>
<tr>
<td style="padding:10px 0;color:#64748b;font-size:13px;">Commission</td>
<td style="padding:10px 0;font-weight:700;text-align:right;color:#16a34a;font-size:15px;">${passenger.commissionGenerated} FCFA</td>
</tr>
</table>
</td></tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
<tr><td align="center">
<a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#1e40af,#2563eb);color:#ffffff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.3px;box-shadow:0 2px 8px rgba(30,64,175,0.3);">
Verifier la police en ligne
</a>
</td></tr>
</table>

<p style="color:#94a3b8;font-size:12px;text-align:center;margin:16px 0 0;">Ce message est envoye automatiquement par SecureFlow.</p>`;

    const result = await client.emails.send({
      from: fromEmail,
      replyTo: 'infosecureflowco@gmail.com',
      to: insuranceEmail,
      subject: `Nouveau passager assure - ${passenger.fullName} | Police ${policyNumber}`,
      headers: {
        'X-Entity-Ref-ID': `passenger-${passenger.id}-${Date.now()}`,
        'List-Unsubscribe': `<mailto:infosecureflowco@gmail.com?subject=unsubscribe>`,
      },
      html: emailWrapper(
        `Nouveau passager assure`,
        `Notification de souscription`,
        bodyContent
      ),
    });
    console.log(`[Email] Notification envoyee a ${insuranceEmail} pour police ${policyNumber}`, JSON.stringify(result));
  } catch (error) {
    console.error("[Email] Erreur envoi notification assurance:", error);
  }
}

export async function sendWelcomeEmailToInsurance(
  insuranceName: string,
  insuranceEmail: string,
  adminUsername: string,
  adminPassword: string,
  dashboardUrl: string
) {
  try {
    const { client, fromEmail } = getClient();

    const bodyContent = `
<p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 16px;">
  Votre compagnie d'assurance <strong style="color:#0f172a;">${insuranceName}</strong> a ete ajoutee avec succes a la plateforme <strong style="color:#1e40af;">SecureFlow</strong>.
  Vous pouvez desormais vous connecter pour gerer vos agents et suivre vos passagers assures.
</p>

<!-- IDENTIFIANTS -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin:16px 0;">
<tr><td style="background:#0f2b5e;padding:12px 20px;border-radius:8px 8px 0 0;">
<p style="margin:0;color:#ffffff;font-size:13px;font-weight:600;letter-spacing:0.5px;">VOS IDENTIFIANTS DE CONNEXION</p>
</td></tr>
<tr><td style="padding:16px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr style="border-bottom:1px solid #e2e8f0;">
<td style="padding:12px 0;color:#64748b;font-size:13px;">Nom d'utilisateur</td>
<td style="padding:12px 0;font-weight:700;text-align:right;color:#0f172a;font-size:15px;">${adminUsername}</td>
</tr>
<tr style="border-bottom:1px solid #e2e8f0;">
<td style="padding:12px 0;color:#64748b;font-size:13px;">Mot de passe</td>
<td style="padding:12px 0;font-weight:700;text-align:right;color:#0f172a;font-size:15px;font-family:'Courier New',monospace;letter-spacing:1px;">${adminPassword}</td>
</tr>
<tr>
<td style="padding:12px 0;color:#64748b;font-size:13px;">Email du compte</td>
<td style="padding:12px 0;font-weight:600;text-align:right;color:#0f172a;">${insuranceEmail}</td>
</tr>
</table>
</td></tr>
</table>

<!-- AVERTISSEMENT SECURITE -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
<tr><td style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:14px 20px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:top;padding-right:10px;font-size:18px;">&#9888;</td>
<td>
<p style="margin:0;color:#92400e;font-size:13px;font-weight:600;">IMPORTANT : Securite du compte</p>
<p style="margin:4px 0 0;color:#a16207;font-size:13px;line-height:1.5;">Changez votre mot de passe immediatement apres votre premiere connexion pour securiser votre compte. Ne partagez jamais vos identifiants par email ou message non securise.</p>
</td>
</tr></table>
</td></tr>
</table>

<!-- BOUTON -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
<tr><td align="center">
<a href="${dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#1e40af,#2563eb);color:#ffffff;padding:16px 48px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.3px;box-shadow:0 3px 12px rgba(30,64,175,0.3);">
Acceder a mon tableau de bord
</a>
</td></tr>
</table>

<!-- PROCHAINES ETAPES -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;margin:16px 0;">
<tr><td style="padding:20px;">
<p style="margin:0 0 12px;color:#0c4a6e;font-size:14px;font-weight:700;">Prochaines etapes :</p>
<table role="presentation" cellpadding="0" cellspacing="0">
<tr><td style="padding:6px 0;vertical-align:top;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="width:28px;height:28px;background:#1e40af;border-radius:50%;text-align:center;vertical-align:middle;color:#fff;font-weight:700;font-size:13px;line-height:28px;">1</td>
<td style="padding-left:12px;color:#334155;font-size:13px;line-height:1.5;">Connectez-vous avec vos identifiants ci-dessus</td>
</tr></table>
</td></tr>
<tr><td style="padding:6px 0;vertical-align:top;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="width:28px;height:28px;background:#1e40af;border-radius:50%;text-align:center;vertical-align:middle;color:#fff;font-weight:700;font-size:13px;line-height:28px;">2</td>
<td style="padding-left:12px;color:#334155;font-size:13px;line-height:1.5;">Allez dans <strong>"Agents"</strong> pour creer vos agents terrain</td>
</tr></table>
</td></tr>
<tr><td style="padding:6px 0;vertical-align:top;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="width:28px;height:28px;background:#1e40af;border-radius:50%;text-align:center;vertical-align:middle;color:#fff;font-weight:700;font-size:13px;line-height:28px;">3</td>
<td style="padding-left:12px;color:#334155;font-size:13px;line-height:1.5;">Partagez les identifiants de vos agents pour enregistrer les passagers</td>
</tr></table>
</td></tr>
<tr><td style="padding:6px 0;vertical-align:top;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="width:28px;height:28px;background:#1e40af;border-radius:50%;text-align:center;vertical-align:middle;color:#fff;font-weight:700;font-size:13px;line-height:28px;">4</td>
<td style="padding-left:12px;color:#334155;font-size:13px;line-height:1.5;">Suivez les enregistrements en temps reel depuis votre tableau de bord</td>
</tr></table>
</td></tr>
</table>
</td></tr>
</table>`;

    const result = await client.emails.send({
      from: fromEmail,
      replyTo: 'infosecureflowco@gmail.com',
      to: insuranceEmail,
      subject: `Bienvenue sur SecureFlow - Vos identifiants d'acces`,
      headers: {
        'X-Entity-Ref-ID': `welcome-${insuranceName.replace(/\s/g, '-')}-${Date.now()}`,
        'List-Unsubscribe': `<mailto:infosecureflowco@gmail.com?subject=unsubscribe>`,
      },
      html: emailWrapper(
        `Bienvenue ${insuranceName} !`,
        `Plateforme d'assurance transport`,
        bodyContent
      ),
    });
    console.log(`[Email] Email de bienvenue envoye a ${insuranceEmail} pour ${insuranceName}`, JSON.stringify(result));
  } catch (error) {
    console.error("[Email] Erreur envoi email bienvenue:", error);
  }
}

export async function sendVerificationCodeEmail(
  toEmail: string,
  code: string,
  userName: string
) {
  try {
    const { client, fromEmail } = getClient();

    const bodyContent = `
<p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 16px;">
  Bonjour <strong style="color:#0f172a;">${userName}</strong>, vous avez demande un changement de mot de passe sur votre compte SecureFlow.
  Utilisez le code ci-dessous pour confirmer votre identite :
</p>

<!-- CODE -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#0f2b5e,#1e40af);border-radius:12px;box-shadow:0 4px 16px rgba(15,43,94,0.2);">
<tr><td style="padding:28px 48px;text-align:center;">
<p style="margin:0 0 6px;color:rgba(255,255,255,0.7);font-size:12px;text-transform:uppercase;letter-spacing:2px;">Code de verification</p>
<p style="margin:0;font-size:40px;font-weight:800;font-family:'Courier New',monospace;letter-spacing:12px;color:#ffffff;">
${code}
</p>
</td></tr>
</table>
</td></tr>
</table>

<!-- AVERTISSEMENT -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
<tr><td style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:14px 20px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:top;padding-right:10px;font-size:18px;">&#9888;</td>
<td>
<p style="margin:0;color:#92400e;font-size:13px;line-height:1.5;"><strong>Ce code expire dans 10 minutes.</strong> Si vous n'avez pas demande ce changement, ignorez ce message et assurez-vous que votre compte est securise.</p>
</td>
</tr></table>
</td></tr>
</table>

<p style="color:#94a3b8;font-size:12px;text-align:center;margin:16px 0 0;">Ce message est envoye automatiquement par SecureFlow. Ne repondez pas a cet email.</p>`;

    const result = await client.emails.send({
      from: fromEmail,
      replyTo: 'infosecureflowco@gmail.com',
      to: toEmail,
      subject: `SecureFlow - Code de verification`,
      headers: {
        'X-Entity-Ref-ID': `otp-${userName}-${Date.now()}`,
      },
      html: emailWrapper(
        `Verification de securite`,
        `Changement de mot de passe`,
        bodyContent
      ),
    });
    console.log(`[Email] Code de verification envoye a ${toEmail}`, JSON.stringify(result));
    return true;
  } catch (error) {
    console.error("[Email] Erreur envoi code de verification:", error);
    return false;
  }
}

export async function sendPasswordResetCodeEmail(
  toEmail: string,
  code: string,
  userName: string
) {
  try {
    const { client, fromEmail } = getClient();
    const bodyContent = `
<p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 16px;">
  Bonjour <strong style="color:#0f172a;">${userName}</strong>, vous avez demande la reinitialisation de votre mot de passe SecureFlow.
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#0f2b5e,#1e40af);border-radius:12px;">
<tr><td style="padding:28px 48px;text-align:center;">
<p style="margin:0 0 6px;color:rgba(255,255,255,0.7);font-size:12px;text-transform:uppercase;letter-spacing:2px;">Code de reinitialisation</p>
<p style="margin:0;font-size:40px;font-weight:800;font-family:'Courier New',monospace;letter-spacing:12px;color:#ffffff;">${code}</p>
</td></tr></table>
</td></tr></table>
<p style="color:#92400e;background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:14px 20px;font-size:13px;line-height:1.5;">
  <strong>Ce code expire dans 10 minutes.</strong> Si vous n'etes pas a l'origine de cette demande, ignorez cet e-mail.
</p>`;
    await client.emails.send({
      from: fromEmail,
      replyTo: "infosecureflowco@gmail.com",
      to: toEmail,
      subject: "SecureFlow - Reinitialisation du mot de passe",
      headers: { "X-Entity-Ref-ID": `password-reset-${userName}-${Date.now()}` },
      html: emailWrapper("Reinitialisation de securite", "Mot de passe oublie", bodyContent),
    });
    console.log(`[Email] Code de reinitialisation envoye a ${toEmail}`);
    return true;
  } catch (error) {
    console.error("[Email] Erreur envoi code de reinitialisation:", error);
    return false;
  }
}
