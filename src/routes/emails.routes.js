const express = require('express');

module.exports = (deps) => {
  const router = express.Router();
  const { applicationStore, authenticateToken, db, transporter } = deps;

  router.get('/', authenticateToken, async (req, res) => {
    try {
      const emails = await db.getEmails();
      return res.json({ success: true, emails });
    } catch (error) {
      console.error('Fetch emails error:', error);
      return res.status(500).json({ success: false, error: 'Server error fetching emails' });
    }
  });

  router.post('/send', authenticateToken, async (req, res) => {
    try {
      const { recipientType, recipientId, recipientGroup, subject, body, campaignType } = req.body;
      
      if (!recipientType || !subject || !body || !campaignType) {
        return res.status(400).json({ success: false, error: 'Missing required parameters' });
      }
  
      const allUsers = await db.getUsers();
      let recipients = [];
      let recipientNameSummary = '';
  
      if (recipientType === 'direct' || recipientType === 'applicant') {
        let targetUser = null;
        if (recipientType === 'direct') {
          targetUser = allUsers.find(u => u.id === recipientId);
        } else if (recipientType === 'applicant') {
          const applications = await applicationStore.getAllApplications();
          const targetApp = applications.find(a => a.id === recipientId);
          if (targetApp) {
            targetUser = {
              id: targetApp.id,
              name: targetApp.userName,
              email: targetApp.userEmail,
              role: 'Applicant'
            };
          }
        }
  
        if (!targetUser) {
          return res.status(404).json({ success: false, error: `Recipient ${recipientType} not found` });
        }
        recipients = [targetUser];
        recipientNameSummary = `${targetUser.name} (${targetUser.email})`;
      } else {
        // Bulk emails based on group filter
        if (recipientGroup === 'all') {
          recipients = allUsers;
          recipientNameSummary = 'All Users';
        } else if (recipientGroup === 'students') {
          recipients = allUsers.filter(u => u.isStudent);
          recipientNameSummary = 'All Students';
        } else if (recipientGroup === 'professionals') {
          recipients = allUsers.filter(u => !u.isStudent && u.role === 'User');
          recipientNameSummary = 'All Professionals';
        } else if (recipientGroup === 'verified') {
          recipients = allUsers.filter(u => u.isVerified);
          recipientNameSummary = 'Verified Users';
        } else if (recipientGroup === 'unverified') {
          recipients = allUsers.filter(u => !u.isVerified);
          recipientNameSummary = 'Unverified Users';
        } else {
          return res.status(400).json({ success: false, error: 'Invalid recipient group' });
        }
      }
  
      if (recipients.length === 0) {
        return res.status(400).json({ success: false, error: 'No recipients matched the criteria' });
      }
  
      // Save to the emails outbox log
      const emailRecord = await db.saveEmail({
        senderId: req.user.id,
        senderName: req.user.name,
        recipientType,
        recipientGroup: recipientType === 'bulk' ? recipientGroup : null,
        recipientCount: recipients.length,
        recipientSummary: recipientNameSummary,
        subject,
        body,
        campaignType
      });
  
      // Send email via Nodemailer if credentials are set
      const useRealSMTP = process.env.SMTP_USER && process.env.SMTP_PASS;
      if (useRealSMTP) {
        try {
          console.log(`✉️ Sending real emails using SMTP: ${process.env.SMTP_HOST || 'smtp.office365.com'}...`);
          for (const recipient of recipients) {
            await transporter.sendMail({
              from: `"${req.user.name}" <${process.env.SMTP_USER}>`,
              to: recipient.email,
              subject: subject,
              text: body
            });
          }
          console.log(`✅ SMTP Mail sent successfully to ${recipients.length} recipients.`);
        } catch (smtpError) {
          console.error('❌ SMTP Mail delivery failed:', smtpError.message);
          return res.status(500).json({
            success: false,
            error: `Real email sending failed: ${smtpError.message}. If using Gmail, make sure you are using a 16-character App Password (not your regular password) and that 2-Step Verification is enabled.`
          });
        }
      } else {
        // Simulate sending in the console log
        console.log(`\n========================================`);
        console.log(`📧 SIMULATING EMAIL CAMPAIGN: [${campaignType.toUpperCase()}]`);
        console.log(`From: ${req.user.name} <${req.user.email}>`);
        console.log(`To (${recipients.length} recipients): ${recipientNameSummary}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body:\n${body}`);
        console.log(`========================================\n`);
      }
  
      return res.json({
        success: true,
        message: useRealSMTP
          ? `Successfully sent ${recipients.length} real email(s).`
          : `Successfully simulated campaign. Sent ${recipients.length} emails.`,
        emailRecord
      });
  
    } catch (error) {
      console.error('Send email error:', error);
      return res.status(500).json({ success: false, error: 'Server error during email send' });
    }
  });

  return router;
};
