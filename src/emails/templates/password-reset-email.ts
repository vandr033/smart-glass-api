import { renderBaseEmailLayout } from "../layouts/BaseEmailLayout.js";
import type { EmailTemplateDefinition } from "../types/email-types.js";
import { escapeHtml, greeting, joinTextBlocks } from "../utils.js";

export const passwordResetEmailTemplate: EmailTemplateDefinition<"passwordReset"> = {
  name: "passwordReset",
  render: ({ brand, variables }) => {
    const appName = variables.appName?.trim() || brand.appName;
    const expiresInLine = variables.expiresIn
      ? `<p style="margin: 0 0 16px;">Este enlace de restablecimiento vence en ${escapeHtml(variables.expiresIn)}.</p>`
      : "";
    const contentHtml = `
      <p style="margin: 0 0 16px;">${escapeHtml(greeting(variables.userName))}</p>
      <p style="margin: 0 0 16px;">Recibimos una solicitud para restablecer la contraseña de ${escapeHtml(appName)}.</p>
      ${expiresInLine}
      <p style="margin: 24px 0;">
        <a
          href="${escapeHtml(variables.resetLink)}"
          style="background: ${brand.primaryColor}; border-radius: 10px; color: #ffffff; display: inline-block; font-weight: 700; padding: 14px 20px; text-decoration: none;"
        >
          Restablecer contraseña
        </a>
      </p>
      <p style="margin: 0 0 16px;">Si no solicitaste esto, puedes ignorar este correo.</p>
      <p style="margin: 0 0 16px;">Si el botón no funciona, abre este enlace:</p>
      <p style="margin: 0;"><a href="${escapeHtml(variables.resetLink)}" style="color: ${brand.primaryColor};">${escapeHtml(variables.resetLink)}</a></p>
    `;

    return {
      html: renderBaseEmailLayout({
        brand,
        contentHtml,
        previewText: `Restablece la contraseña de ${appName}.`,
      }),
      subject: `Restablecer contraseña de ${appName}`,
      text: joinTextBlocks(
        greeting(variables.userName),
        `Recibimos una solicitud para restablecer la contraseña de ${appName}.`,
        variables.expiresIn ? `Este enlace de restablecimiento vence en ${variables.expiresIn}.` : undefined,
        variables.resetLink,
        "Si no solicitaste esto, puedes ignorar este correo.",
      ),
    };
  },
  sampleVariables: {
    appName: "Vidriera Sebitas ERP",
    expiresIn: "60 minutos",
    resetLink: "https://app.example.com/reset-password?token=demo",
    userName: "Taylor",
  },
};
