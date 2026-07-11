import type {
  ChangeClientPortalUserStatusInput,
  ClientPortalAcceptInvitationInput,
  ClientPortalForgotPasswordInput,
  ClientPortalLoginInput,
  ClientPortalQuotationDecisionInput,
  ClientPortalResetPasswordInput,
  CreateClientPortalDocumentInput,
  CreateClientPortalMessageInput,
  CreateInternalClientPortalMessageInput,
  CreatePortalPostventaCaseInput,
  InviteClientPortalUserInput,
  ListPortalMessagesQuery,
  ListPortalUsersQuery,
  UpdateClientPortalUserInput,
} from "./client-portal.validators.js";

export type ClientPortalSession = {
  clientId: string;
  email: string;
  userId: string;
};

export type {
  ChangeClientPortalUserStatusInput,
  ClientPortalAcceptInvitationInput,
  ClientPortalForgotPasswordInput,
  ClientPortalLoginInput,
  ClientPortalQuotationDecisionInput,
  ClientPortalResetPasswordInput,
  CreateClientPortalDocumentInput,
  CreateClientPortalMessageInput,
  CreateInternalClientPortalMessageInput,
  CreatePortalPostventaCaseInput,
  InviteClientPortalUserInput,
  ListPortalMessagesQuery,
  ListPortalUsersQuery,
  UpdateClientPortalUserInput,
};
