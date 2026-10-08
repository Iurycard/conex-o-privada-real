import { Resend } from "resend";

export type EmailEnvironment = {
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  APP_URL?: string;
};

export type DailyActivity = {
  actor: string;
  body: string;
  createdAt: string;
};

function getResend(env: EmailEnvironment) {
  if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");
  if (!env.EMAIL_FROM) throw new Error("EMAIL_FROM is not configured");
  return { client: new Resend(env.RESEND_API_KEY), from: env.EMAIL_FROM };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

async function sendEmail(
  env: EmailEnvironment,
  message: { to: string; subject: string; html: string; text: string },
) {
  const { client, from } = getResend(env);
  const { error } = await client.emails.send({ from, ...message });
  if (error) throw new Error(`Resend email delivery failed: ${error.message}`);
}

export async function sendLoginNotification(env: EmailEnvironment, to: string, userName: string) {
  const safeName = escapeHtml(userName);
  await sendEmail(env, {
    to,
    subject: "Novo login detectado",
    html: `<p>Olá ${safeName},</p><p>Detectamos um novo login na sua conta.</p>`,
    text: `Olá ${userName}, detectamos um novo login na sua conta.`,
  });
}

export async function sendPasswordReset(env: EmailEnvironment, to: string, resetLink: string) {
  const safeLink = escapeHtml(resetLink);
  await sendEmail(env, {
    to,
    subject: "Redefinição de senha",
    html: `<p>Recebemos uma solicitação para redefinir sua senha.</p><p><a href="${safeLink}">Criar nova senha</a></p><p>O link expira em uma hora. Se você não solicitou a redefinição, ignore este e-mail.</p>`,
    text: `Recebemos uma solicitação para redefinir sua senha. Acesse ${resetLink}. O link expira em uma hora. Se você não solicitou a redefinição, ignore este e-mail.`,
  });
}

export async function sendSupportTicketReply(
  env: EmailEnvironment,
  to: string,
  userName: string,
  ticketId: string,
  reply: string,
) {
  const safeName = escapeHtml(userName);
  const safeTicketId = escapeHtml(ticketId);
  const safeReply = escapeHtml(reply).replace(/\r?\n/g, "<br>");
  await sendEmail(env, {
    to,
    subject: `Resposta do suporte — solicitação ${ticketId}`,
    html: `<p>Olá, ${safeName}.</p><p>Recebemos sua solicitação <strong>${safeTicketId}</strong> e nossa equipe respondeu:</p><p>${safeReply}</p>`,
    text: `Olá, ${userName}.\n\nNossa equipe respondeu à solicitação ${ticketId}:\n\n${reply}`,
  });
}

export async function sendDailyActivityReport(
  env: EmailEnvironment,
  to: string,
  userName: string,
  activities: DailyActivity[],
) {
  const safeName = escapeHtml(userName || "por aqui");
  const rows = activities.map((activity) => {
    const actor = escapeHtml(activity.actor || "Alguém");
    const body = escapeHtml(activity.body);
    const date = escapeHtml(new Date(activity.createdAt).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    }));
    return `<li><strong>${actor}</strong> ${body} <small>(${date})</small></li>`;
  });
  const baseUrl = env.APP_URL;
  if (!baseUrl) throw new Error("APP_URL is not configured");
  const notificationsUrl = new URL("/notificacoes", baseUrl).toString();

  await sendEmail(env, {
    to,
    subject: "Resumo diário das atividades do seu perfil",
    html: `<h2>Olá, ${safeName}!</h2><p>Estas são as atividades recentes do seu perfil:</p><ul>${rows.join("")}</ul><p><a href="${escapeHtml(notificationsUrl)}">Ver todas as notificações</a></p>`,
    text: `Olá, ${userName || "por aqui"}! Atividades recentes:\n${activities.map((item) => `- ${item.actor || "Alguém"} ${item.body} (${new Date(item.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })})`).join("\n")}\nVer notificações: ${notificationsUrl}`,
  });
}
