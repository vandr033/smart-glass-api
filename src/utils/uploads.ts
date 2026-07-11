import { mkdir } from "node:fs/promises";
import path from "node:path";

import { env } from "./env.js";

export const uploadsRootDir = path.resolve(process.cwd(), "uploads");
export const avatarUploadsDir = path.join(uploadsRootDir, "avatars");
export const logoUploadsDir = path.join(uploadsRootDir, "logos");
export const priceListUploadsDir = path.join(uploadsRootDir, "price-lists");
export const projectAttachmentUploadsDir = path.join(
  uploadsRootDir,
  "project-attachments",
);
export const installationEvidenceUploadsDir = path.join(
  uploadsRootDir,
  "installation-evidence",
);
export const measurementEvidenceUploadsDir = path.join(
  uploadsRootDir,
  "measurement-evidence",
);
export const postventaEvidenceUploadsDir = path.join(
  uploadsRootDir,
  "postventa-evidence",
);
export const clientPortalUploadsDir = path.join(
  uploadsRootDir,
  "client-portal",
);

export const ensureUploadDirectories = async (): Promise<void> => {
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
  await mkdir(postventaEvidenceUploadsDir, {
    recursive: true,
  });
  await mkdir(clientPortalUploadsDir, {
    recursive: true,
  });
};

export const buildAvatarUrl = (fileName: string): string => {
  return `${env.BETTER_AUTH_URL}/uploads/avatars/${fileName}`;
};

export const buildLogoUrl = (fileName: string): string => {
  return `${env.BETTER_AUTH_URL}/uploads/logos/${fileName}`;
};

export const buildPriceListFileUrl = (fileName: string): string => {
  return `${env.BETTER_AUTH_URL}/uploads/price-lists/${fileName}`;
};

export const buildProjectAttachmentUrl = (fileName: string): string => {
  return `${env.BETTER_AUTH_URL}/uploads/project-attachments/${fileName}`;
};

export const buildInstallationEvidenceUrl = (fileName: string): string => {
  return `${env.BETTER_AUTH_URL}/uploads/installation-evidence/${fileName}`;
};

export const buildMeasurementEvidenceUrl = (fileName: string): string => {
  return `${env.BETTER_AUTH_URL}/uploads/measurement-evidence/${fileName}`;
};

export const buildPostventaEvidenceUrl = (fileName: string): string => {
  return `${env.BETTER_AUTH_URL}/uploads/postventa-evidence/${fileName}`;
};

export const buildClientPortalFileUrl = (fileName: string): string => {
  return `${env.BETTER_AUTH_URL}/uploads/client-portal/${fileName}`;
};
