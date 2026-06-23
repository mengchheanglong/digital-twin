interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (_options: SendEmailOptions): Promise<{ success: boolean; error?: unknown }> => {
  console.log('Email simulated (simplified mode). Sensitive fields are not logged.');

  return { success: true };
};
