import { renderBaseEmailLayout } from "../layouts/BaseEmailLayout.js";
import { escapeHtml, greeting, joinTextBlocks } from "../utils.js";
export const emailVerificationEmailTemplate = {
    name: "emailVerification",
    render: ({ brand, variables }) => {
        const appName = variables.appName?.trim() || brand.appName;
        const contentHtml = `
        <p style="margin: 0 0 16px;">${escapeHtml(greeting(variables.userName))}</p>
        <p style="margin: 0 0 16px;">Verifica tu correo electrónico para terminar de configurar tu cuenta de ${escapeHtml(appName)}.</p>
        <p style="margin: 24px 0;">
          <a
            href="${escapeHtml(variables.verificationLink)}"
            style="background: ${brand.primaryColor}; border-radius: 10px; color: #ffffff; display: inline-block; font-weight: 700; padding: 14px 20px; text-decoration: none;"
          >
            Verificar correo electrónico
          </a>
        </p>
        <p style="margin: 0 0 16px;">Si el botón no funciona, abre este enlace:</p>
        <p style="margin: 0;"><a href="${escapeHtml(variables.verificationLink)}" style="color: ${brand.primaryColor};">${escapeHtml(variables.verificationLink)}</a></p>
      `;
        return {
            html: renderBaseEmailLayout({
                brand,
                contentHtml,
                previewText: `Verifica tu correo electrónico de ${appName}.`,
            }),
            subject: `Verificar tu cuenta de ${appName}`,
            text: joinTextBlocks(greeting(variables.userName), `Verifica tu correo electrónico para terminar de configurar tu cuenta de ${appName}.`, variables.verificationLink),
        };
    },
    sampleVariables: {
        appName: "Vidriera Sebitas ERP",
        userName: "Taylor",
        verificationLink: "https://app.example.com/verify-email?token=demo",
    },
};
//# sourceMappingURL=email-verification-email.js.map