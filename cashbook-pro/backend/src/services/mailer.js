// Email functionality temporarily disabled
// TODO: Re-enable email functionality when needed

export async function sendWelcomeEmail(toEmail, name, shopName, username) {
  console.log(`📧 Welcome email would be sent to ${toEmail} for ${shopName}`);
  // Email functionality temporarily disabled
  return { success: true, message: 'Email functionality temporarily disabled' };
}

export async function sendPasswordResetEmail(toEmail, resetToken, name) {
  console.log(`📧 Password reset email would be sent to ${toEmail}`);
  // Email functionality temporarily disabled
  return { success: true, message: 'Email functionality temporarily disabled' };
}
