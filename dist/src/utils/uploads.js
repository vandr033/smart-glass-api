import { mkdir } from "node:fs/promises";
import path from "node:path";
import { env } from "./env.js";
export const uploadsRootDir = path.resolve(process.cwd(), "uploads");
export const avatarUploadsDir = path.join(uploadsRootDir, "avatars");
export const logoUploadsDir = path.join(uploadsRootDir, "logos");
export const priceListUploadsDir = path.join(uploadsRootDir, "price-lists");
export const projectAttachmentUploadsDir = path.join(uploadsRootDir, "project-attachments");
export const installationEvidenceUploadsDir = path.join(uploadsRootDir, "installation-evidence");
export const measurementEvidenceUploadsDir = path.join(uploadsRootDir, "measurement-evidence");
export const ensureUploadDirectories = async () => {
    await mkdir(avatarUploadsDir, {
        recursive: true,
    });
    await mkdir(logoUploadsDir, {
        recursive: true,
    });
    await mkdir(priceListUploadsDir, {
        recursive: true,
    });
    await mkdir(projectAttachmentUploadsDir, {
        recursive: true,
    });
    await mkdir(installationEvidenceUploadsDir, {
        recursive: true,
    });
    await mkdir(measurementEvidenceUploadsDir, {
        recursive: true,
    });
};
export const buildAvatarUrl = (fileName) => {
    return `${env.BETTER_AUTH_URL}/uploads/avatars/${fileName}`;
};
export const buildLogoUrl = (fileName) => {
    return `${env.BETTER_AUTH_URL}/uploads/logos/${fileName}`;
};
export const buildPriceListFileUrl = (fileName) => {
    return `${env.BETTER_AUTH_URL}/uploads/price-lists/${fileName}`;
};
export const buildProjectAttachmentUrl = (fileName) => {
    return `${env.BETTER_AUTH_URL}/uploads/project-attachments/${fileName}`;
};
export const buildInstallationEvidenceUrl = (fileName) => {
    return `${env.BETTER_AUTH_URL}/uploads/installation-evidence/${fileName}`;
};
export const buildMeasurementEvidenceUrl = (fileName) => {
    return `${env.BETTER_AUTH_URL}/uploads/measurement-evidence/${fileName}`;
};
//# sourceMappingURL=uploads.js.map