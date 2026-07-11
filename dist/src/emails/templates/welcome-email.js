import { renderBaseEmailLayout } from "../layouts/BaseEmailLayout.js";
import { escapeHtml, greeting, joinTextBlocks } from "../utils.js";
export const welcomeEmailTemplate = {
    name: "welcome",
    render: ({ brand, variables }) => {
        const appName = variables.appName?.trim() || brand.appName;
        const loginHtml = variables.loginLink
            ? `
        <p style="margin: 24px 0;">
          <a
            href="${escapeHtml(variables.loginLink)}"
            style="background: ${brand.primaryColor}; border-radius: 10px; color: #ffffff; display: inline-block; font-weight: 700; padding: 14px 20px; text-decoration: none;"
          >
            Abrir ${escapeHtml(appName)}
          </a>
        </p>
        <p style="margin: 0 0 16px;">Si el botón no funciona, abre este enlace:</p>
        <p style="margin: 0;"><a href="${escapeHtml(variables.loginLink)}" style="color: ${brand.primaryColor};">${escapeHtml(variables.loginLink)}</a></p>
      `
            : "";
        return {
            html: renderBaseEmailLayout({
                brand,
                contentHtml: `
          <p style="margin: 0 0 16px;">${escapeHtml(greeting(variables.userName))}</p>
          <p style="margin: 0 0 16px;">Te damos la bienvenida a ${escapeHtml(appName)}.</p>
          <p style="margin: 0 0 16px;">Tu cuenta está lista y puedes comenzar a usar la aplicación.</p>
          ${loginHtml}
        `,
                previewText: `Te damos la bienvenida a ${appName}.`,
            }),
            subject: `Te damos la bienvenida a ${appName}`,
            text: joinTextBlocks(greeting(variables.userName), `Te damos la bienvenida a ${appName}.`, "Tu cuenta está lista y puedes comenzar a usar la aplicación.", variables.loginLink),
        };
    },
    sampleVariables: {
        appName: "Vidriera Sebitas ERP",
        loginLink: "https://app.example.com/login",
        userName: "Taylor",
    },
};
//# sourceMappingURL=welcome-email.js.map