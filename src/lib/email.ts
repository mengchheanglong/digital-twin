interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async ({ to, subject, html }: SendEmailOptions): Promise<{ success: boolean; error?: unknown }> => {
  console.log('----------------------------------------');
  console.log('📧 EMAILS ARE DISABLED (SIMPLIFIED MODE)');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log('HTML Content:');
  console.log(html);
  
  // Extract simple text content if possible for easier reading
  const textContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  console.log('Text Preview:', textContent);
  console.log('----------------------------------------');

  return { success: true };
};
