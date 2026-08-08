import nodemailer from 'nodemailer';

const sendEmail = async ({ to, subject, html }) => {
  // Use generic ethereal or real smtp based on env
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    auth: {
      user: process.env.SMTP_USER, // User from env
      pass: process.env.SMTP_PASS, // Password from env
    },
  });

  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@kisanbazaar.com',
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

export default sendEmail;
