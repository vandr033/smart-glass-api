import { renderBaseEmailLayout } from "../layouts/BaseEmailLayout.js";
import type { EmailTemplateDefinition } from "../types/email-types.js";
import { escapeHtml, greeting, joinTextBlocks } from "../utils.js";

export const invitationEmailTemplate: EmailTemplateDefinition<"invitation"> = {
  name: "invitation",
  render: ({ brand, variables }) => {
    const appName = variables.appName?.trim() || brand.appName;
    const roleLine = variables.roleName
      ? `<p style="margin: 0 0 16px;">Has sido invitado a participar como <strong>${escapeHtml(variables.roleName)}</strong>.</p>`
      : "";
    const invitedByLine = variables.invitedByName
      ? `<p style="margin: 0 0 16px;">Invitación enviada por ${escapeHtml(variables.invitedByName)}.</p>`
      : "";
    const expiryLine = variables.expiresAt
      ? `<p style="margin: 0 0 16px;">Esta invitación vence el ${escapeHtml(variables.expiresAt)}.</p>`
      : "";
    const contentHtml = `
      <p style="margin: 0 0 16px;">${escapeHtml(greeting(variables.userName))}</p>
      <p style="margin: 0 0 16px;">Has sido invitado a participar en ${escapeHtml(appName)}.</p>
      ${roleLine}
      ${invitedByLine}
      ${expiryLine}
      <p style="margin: 24px 0;">
        <a
          href="${escapeHtml(variables.invitationLink)}"
          style="background: ${brand.primaryColor}; border-radius: 10px; color: #ffffff; display: inline-block; font-weight: 700; padding: 14px 20px; text-decoration: none;"
        >
          Aceptar invitación
        </a>
      </p>
      <p style="margin: 0 0 16px;">Si el botón no funciona, abre este enlace:</p>
      <p style="margin: 0;"><a href="${escapeHtml(variables.invitationLink)}" style="color: ${brand.primaryColor};">${escapeHtml(variables.invitationLink)}</a></p>
    `;

    return {
      html: renderBaseEmailLayout({
        brand,
        contentHtml,
        previewText: `Has sido invitado a participar en ${appName}.`,
      }),
      subject: `Invitación para participar en ${appName}`,
      text: joinTextBlocks(
        greeting(variables.userName),
        `Has sido invitado a participar en ${appName}.`,
        variables.roleName ? `Rol: ${variables.roleName}` : undefined,
        variables.invitedByName ? `Invitación enviada por ${variables.invitedByName}.` : undefined,
        variables.expiresAt ? `Vence el ${variables.expiresAt}.` : undefined,
        variables.invitationLink,
      ),
    };
  },
  sampleVariables: {
    appName: "Vidriera Sebitas ERP",
    expiresAt: "30 de junio de 2026",
    invitationLink: "https://app.example.com/invitations/accept?token=demo",
    invitedByName: "Usuario administrador",
    roleName: "Administrador",
    userName: "Taylor",
  },
};
