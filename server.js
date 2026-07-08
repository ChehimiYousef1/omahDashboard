const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const db = require('./db');
const mongoConnection = require('./mongoConnection');
const applicationStore = require('./applicationStore');
const { authenticateToken } = require('./middleware/auth');

dotenv.config();

// SMTP Transporter configuration for real email sending
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true', // true for port 465, false for 587
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false
  }
});

const app = express();

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || /^http:\/\/localhost:\d+$/.test(origin) || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret_key';

/* =========================
   AUTHENTICATION ENDPOINTS
========================= */

// Signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Please enter all fields' });
    }

    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await db.createUser({
      name,
      email,
      password: hashedPassword,
      role: role || 'User'
    });

    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        avatar: newUser.avatar,
        coverPage: newUser.coverPage
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ success: false, error: 'Server error during signup' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please enter email and password' });
    }

    const user = await db.getUserByEmail(email);
    const passwordMatch = user && (await bcrypt.compare(password, user.password));
    if (!passwordMatch) {
      return res.status(400).json({ success: false, error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        coverPage: user.coverPage
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, error: 'Server error during login' });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth_token');
  return res.json({ success: true, message: 'Logged out successfully' });
});

// Auth Me
app.get('/api/auth/me', authenticateToken, (req, res) => {
  return res.json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      avatar: req.user.avatar,
      coverPage: req.user.coverPage
    }
  });
});

/* =========================
   USER DIRECTORY ENDPOINTS
========================= */

// Get all users
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const users = await db.getUsers();
    // Exclude passwords from response
    const cleanUsers = users.map(u => {
      const { password, ...clean } = u;
      return clean;
    });
    return res.json({ success: true, users: cleanUsers });
  } catch (error) {
    console.error('Fetch users error:', error);
    return res.status(500).json({ success: false, error: 'Server error fetching users' });
  }
});

// Toggle User Notification Permissions
app.post('/api/users/:id/notifications/toggle', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    const { push, email, inApp } = req.body;
    
    const updatedUser = await db.updateNotificationPermissions(userId, { push, email, inApp });
    if (!updatedUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    return res.json({
      success: true,
      message: 'Notification permissions updated successfully',
      notificationPermissions: updatedUser.notificationPermissions
    });
  } catch (error) {
    console.error('Toggle notification permission error:', error);
    return res.status(500).json({ success: false, error: 'Server error updating permissions' });
  }
});

/* =========================
   POSTS ENDPOINTS
========================= */

app.get('/api/posts', async (_req, res) => {
  try {
    const posts = await db.getPosts();
    return res.json({ success: true, posts });
  } catch (err) {
    console.error('GET /api/posts error:', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/* =========================
   EMAIL CAMPAIGN ENDPOINTS
========================= */

// Get emails history
app.get('/api/emails', authenticateToken, async (req, res) => {
  try {
    const emails = await db.getEmails();
    return res.json({ success: true, emails });
  } catch (error) {
    console.error('Fetch emails error:', error);
    return res.status(500).json({ success: false, error: 'Server error fetching emails' });
  }
});

// Send simulated emails (Direct or Bulk)
app.post('/api/emails/send', authenticateToken, async (req, res) => {
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

/* =========================
   CRM CALLING ENDPOINTS
========================= */

// Get call logs
app.get('/api/calls', authenticateToken, async (req, res) => {
  try {
    const calls = await db.getCalls();
    return res.json({ success: true, calls });
  } catch (error) {
    console.error('Fetch calls error:', error);
    return res.status(500).json({ success: false, error: 'Server error fetching call log' });
  }
});

// Initiate simulated call
app.post('/api/calls/initiate', authenticateToken, async (req, res) => {
  try {
    const { recipientId, duration, status, type } = req.body;
    if (!recipientId || !status || !type) {
      return res.status(400).json({ success: false, error: 'Missing calling parameters' });
    }

    const allUsers = await db.getUsers();
    const recipientUser = allUsers.find(u => u.id === recipientId);
    if (!recipientUser) {
      return res.status(404).json({ success: false, error: 'Recipient user not found' });
    }

    const phone = type === 'Emergency Call' 
      ? recipientUser.emergencyPhone 
      : recipientUser.phone;

    // Save Call Record
    const callRecord = await db.saveCall({
      senderId: req.user.id,
      senderName: req.user.name,
      recipientId,
      recipientName: recipientUser.name,
      recipientPhone: phone || 'No phone set',
      duration: duration || 0,
      status,
      type
    });

    console.log(`\n========================================`);
    console.log(`📞 CRM CALL DIALER INTEGRATION: [${type.toUpperCase()}]`);
    console.log(`Caller: ${req.user.name}`);
    console.log(`Recipient: ${recipientUser.name} (${phone})`);
    console.log(`Status: ${status} | Duration: ${duration}s`);
    console.log(`========================================\n`);

    return res.json({
      success: true,
      message: `Call successfully simulated and recorded.`,
      callRecord
    });
  } catch (error) {
    console.error('Initiate call error:', error);
    return res.status(500).json({ success: false, error: 'Server error initiating call' });
  }
});

/* =========================
   NOTIFICATION HUB ENDPOINTS
========================= */

// Get notification history
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await db.getNotifications();
    return res.json({ success: true, notifications });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    return res.status(500).json({ success: false, error: 'Server error fetching notifications' });
  }
});

// Send simulated notification
app.post('/api/notifications/send', authenticateToken, async (req, res) => {
  try {
    const { recipientType, recipientId, recipientGroup, title, message, channel } = req.body;
    
    if (!recipientType || !title || !message || !channel) {
      return res.status(400).json({ success: false, error: 'Missing required parameters' });
    }

    const allUsers = await db.getUsers();
    let recipients = [];
    let recipientNameSummary = '';

    if (recipientType === 'direct') {
      const targetUser = allUsers.find(u => u.id === recipientId);
      if (!targetUser) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      recipients = [targetUser];
      recipientNameSummary = targetUser.name;
    } else {
      if (recipientGroup === 'all') {
        recipients = allUsers;
        recipientNameSummary = 'All Users';
      } else if (recipientGroup === 'students') {
        recipients = allUsers.filter(u => u.isStudent);
        recipientNameSummary = 'Students';
      } else if (recipientGroup === 'professionals') {
        recipients = allUsers.filter(u => !u.isStudent && u.role === 'User');
        recipientNameSummary = 'Professionals';
      } else if (recipientGroup === 'verified') {
        recipients = allUsers.filter(u => u.isVerified);
        recipientNameSummary = 'Verified Users';
      } else if (recipientGroup === 'unverified') {
        recipients = allUsers.filter(u => !u.isVerified);
        recipientNameSummary = 'Unverified Users';
      } else {
        return res.status(400).json({ success: false, error: 'Invalid group' });
      }
    }

    // Filter recipients who have active permissions for the requested channel
    const allowedRecipients = recipients.filter(r => {
      if (!r.notificationPermissions) return true;
      return r.notificationPermissions[channel] !== false;
    });

    const optOutCount = recipients.length - allowedRecipients.length;

    if (allowedRecipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: `All selected recipients have disabled ${channel} notifications.`
      });
    }

    // Save outbox record
    const notificationRecord = await db.saveNotification({
      senderId: req.user.id,
      senderName: req.user.name,
      recipientType,
      recipientGroup: recipientType === 'bulk' ? recipientGroup : null,
      recipientSummary: recipientNameSummary,
      recipientCount: allowedRecipients.length,
      optOutCount,
      title,
      message,
      channel,
      status: 'Sent'
    });

    console.log(`\n========================================`);
    console.log(`🔔 ALERTS DISPATCHED: [${channel.toUpperCase()} CHANNEL]`);
    console.log(`Title: ${title}`);
    console.log(`Body: ${message}`);
    console.log(`Delivered to: ${allowedRecipients.length} users | Opt-outs skipped: ${optOutCount}`);
    console.log(`========================================\n`);

    return res.json({
      success: true,
      message: `Notification dispatched successfully. Sent to ${allowedRecipients.length} recipients. (${optOutCount} opt-outs skipped).`,
      notificationRecord
    });
  } catch (error) {
    console.error('Send notification error:', error);
    return res.status(500).json({ success: false, error: 'Server error dispatching notification' });
  }
});

// Resend notification
app.post('/api/notifications/resend', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.body;
    const notifications = await db.getNotifications();
    const existing = notifications.find(n => n.id === parseInt(notificationId, 10));
    
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Original notification record not found' });
    }

    const resentRecord = await db.saveNotification({
      senderId: req.user.id,
      senderName: req.user.name,
      recipientType: existing.recipientType,
      recipientGroup: existing.recipientGroup,
      recipientSummary: existing.recipientSummary + ' (Resent)',
      recipientCount: existing.recipientCount,
      optOutCount: existing.optOutCount || 0,
      title: existing.title,
      message: existing.message,
      channel: existing.channel,
      status: 'Sent'
    });

    console.log(`\n========================================`);
    console.log(`🔔 RESENDING ALERT: [${existing.channel.toUpperCase()} CHANNEL]`);
    console.log(`Title: ${existing.title} (Resending original campaign)`);
    console.log(`========================================\n`);

    return res.json({
      success: true,
      message: 'Notification resent successfully.',
      notificationRecord: resentRecord
    });
  } catch (error) {
    console.error('Resend notification error:', error);
    return res.status(500).json({ success: false, error: 'Server error resending notification' });
  }
});

/* =========================
   MESSAGE CENTER / CHAT ENDPOINTS
========================= */

// Get all conversations list
app.get('/api/messages/conversations', authenticateToken, async (req, res) => {
  try {
    const conversations = await db.getConversations();
    return res.json({ success: true, conversations });
  } catch (error) {
    console.error('Fetch conversations error:', error);
    return res.status(500).json({ success: false, error: 'Server error loading conversations' });
  }
});

// Get messages for a single conversation
app.get('/api/messages/conversations/:id', authenticateToken, async (req, res) => {
  try {
    const convs = await db.getConversations();
    const match = convs.find(c => c.id === req.params.id);
    if (!match) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }
    return res.json({ success: true, messages: match.messages });
  } catch (error) {
    console.error('Fetch messages error:', error);
    return res.status(500).json({ success: false, error: 'Server error loading messages' });
  }
});

// Flag conversation
app.post('/api/messages/conversations/:id/flag', authenticateToken, async (req, res) => {
  try {
    const { isFlagged } = req.body;
    const updated = await db.flagConversation(req.params.id, isFlagged);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }
    return res.json({ success: true, conversation: updated });
  } catch (error) {
    console.error('Flag conversation error:', error);
    return res.status(500).json({ success: false, error: 'Server error flagging chat' });
  }
});

// Send Chat Message (Admin or Mock User) with AI/Spam moderation
app.post('/api/messages/send', authenticateToken, async (req, res) => {
  try {
    const { userId, text, senderId } = req.body;
    if (!userId || !text) {
      return res.status(400).json({ success: false, error: 'Missing message parameters' });
    }

    const finalSenderId = senderId || req.user.id;
    const finalSenderName = finalSenderId === req.user.id ? req.user.name : 'User';

    // AI Spam Moderation Check
    const spamKeywords = ['crypto', 'scam', 'free money', 'buy tokens', 'bitcoin', 'credit card', 'scams', 'cash prize'];
    const textLower = text.toLowerCase();
    const isSpamMatch = spamKeywords.some(keyword => textLower.includes(keyword));

    // Save actual message
    const chatRecord = await db.saveMessage(userId, {
      senderId: finalSenderId,
      senderName: finalSenderName,
      text,
      isSpam: isSpamMatch,
      moderated: isSpamMatch
    });

    let autoWarningRecord = null;

    if (isSpamMatch) {
      // Auto Warning System: Automatically flag conversation and post warning bubble
      const convs = await db.getConversations();
      const match = convs.find(c => c.userId === userId);
      if (match) {
        await db.flagConversation(match.id, true);
        
        // Save System Warning bubble
        const warnResult = await db.saveMessage(userId, {
          senderId: 'system',
          senderName: 'System Moderator',
          text: '⚠️ Auto Warning: Promotional links, financial schemes, or suspicious keyword triggers are prohibited on OMAHCONNECT. Admin has been notified.',
          warningSent: true
        });
        autoWarningRecord = warnResult.message;
      }
    }

    return res.json({
      success: true,
      message: 'Message sent successfully',
      chatRecord: chatRecord.message,
      conversation: chatRecord.conversation,
      spamWarningTriggered: isSpamMatch,
      autoWarning: autoWarningRecord
    });

  } catch (error) {
    console.error('Send message error:', error);
    return res.status(500).json({ success: false, error: 'Server error sending message' });
  }
});

/* =========================
   COMPANY MODULE ENDPOINTS
========================= */

// Get all companies
app.get('/api/companies', authenticateToken, async (req, res) => {
  try {
    const companies = await db.getCompanies();
    return res.json({ success: true, companies });
  } catch (error) {
    console.error('Fetch companies error:', error);
    return res.status(500).json({ success: false, error: 'Server error fetching companies' });
  }
});

// Get recruiters directory (synced with users in db.json)
app.get('/api/companies/recruiters', authenticateToken, async (req, res) => {
  try {
    const allUsers = await db.getUsers();
    const recruiters = allUsers
      .filter(u => u.role === 'Recruiter' || u.role === 'Employer')
      .map(u => {
        const { password, ...clean } = u;
        return clean;
      });
    return res.json({ success: true, recruiters });
  } catch (error) {
    console.error('Fetch recruiters error:', error);
    return res.status(500).json({ success: false, error: 'Server error fetching recruiters' });
  }
});

// Get all jobs
app.get('/api/companies/jobs', authenticateToken, async (req, res) => {
  try {
    const jobs = await db.getJobs();
    return res.json({ success: true, jobs });
  } catch (error) {
    console.error('Fetch jobs error:', error);
    return res.status(500).json({ success: false, error: 'Server error fetching jobs' });
  }
});

// Get all reports/flags
app.get('/api/companies/reports', authenticateToken, async (req, res) => {
  try {
    const reports = await db.getCompanyReports();
    return res.json({ success: true, reports });
  } catch (error) {
    console.error('Fetch company reports error:', error);
    return res.status(500).json({ success: false, error: 'Server error fetching reports' });
  }
});

// Get audit logs
app.get('/api/companies/logs', authenticateToken, async (req, res) => {
  try {
    const logs = await db.getCompanyLogs();
    return res.json({ success: true, logs });
  } catch (error) {
    console.error('Fetch company logs error:', error);
    return res.status(500).json({ success: false, error: 'Server error fetching logs' });
  }
});

// Get settings
app.get('/api/companies/settings', authenticateToken, async (req, res) => {
  try {
    const settings = await db.getCompanySettings();
    return res.json({ success: true, settings });
  } catch (error) {
    console.error('Fetch settings error:', error);
    return res.status(500).json({ success: false, error: 'Server error fetching settings' });
  }
});

// Save settings
app.post('/api/companies/settings', authenticateToken, async (req, res) => {
  try {
    const settings = req.body;
    await db.saveCompanySettings(settings);
    await db.saveCompanyLog({
      adminId: req.user.id,
      adminName: req.user.name,
      action: 'Updated global company policies & settings',
      targetType: 'settings',
      targetId: 'global',
      targetName: 'Company Policies'
    });
    return res.json({ success: true, settings });
  } catch (error) {
    console.error('Save settings error:', error);
    return res.status(500).json({ success: false, error: 'Server error saving settings' });
  }
});

// Verify company
app.post('/api/companies/:id/verify', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const companies = await db.getCompanies();
    const company = companies.find(c => c.id === id);
    if (!company) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }
    company.verificationStatus = status;
    company.verificationNotes = notes || '';
    if (status === 'verified') {
      company.riskScore = Math.max(0, company.riskScore - 25);
      company.riskReasons = (company.riskReasons || []).filter(r => !r.includes('Verification documents pending'));
    }
    await db.saveCompanies(companies);
    await db.saveCompanyLog({
      adminId: req.user.id,
      adminName: req.user.name,
      action: `Company verification updated to [${status.toUpperCase()}]`,
      targetType: 'company',
      targetId: id,
      targetName: company.name
    });
    return res.json({ success: true, company });
  } catch (error) {
    console.error('Verify company error:', error);
    return res.status(500).json({ success: false, error: 'Server error verifying company' });
  }
});

// Suspend company (with cascades)
app.post('/api/companies/:id/suspend', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const company = await db.suspendCompanyCascade(id, status);
    if (!company) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }
    await db.saveCompanyLog({
      adminId: req.user.id,
      adminName: req.user.name,
      action: status ? 'Suspended Company Profile (Cascaded to jobs & recruiters)' : 'Reactivated Company Profile',
      targetType: 'company',
      targetId: id,
      targetName: company.name
    });
    return res.json({ success: true, company });
  } catch (error) {
    console.error('Suspend company error:', error);
    return res.status(500).json({ success: false, error: 'Server error suspending company' });
  }
});

// Send email campaign to recruiters
app.post('/api/companies/communications/send', authenticateToken, async (req, res) => {
  try {
    const { recipientGroup, subject, body } = req.body;
    if (!recipientGroup || !subject || !body) {
      return res.status(400).json({ success: false, error: 'Missing required parameters' });
    }

    const allUsers = await db.getUsers();
    let recruiters = allUsers.filter(u => u.role === 'Recruiter' || u.role === 'Employer');
    if (recipientGroup === 'verified') {
      const companies = await db.getCompanies();
      const verifiedCompanyNames = companies.filter(c => c.verificationStatus === 'verified').map(c => c.name.toLowerCase());
      recruiters = recruiters.filter(r => r.company && verifiedCompanyNames.includes(r.company.toLowerCase()));
    } else if (recipientGroup === 'pending') {
      const companies = await db.getCompanies();
      const pendingCompanyNames = companies.filter(c => c.verificationStatus === 'pending').map(c => c.name.toLowerCase());
      recruiters = recruiters.filter(r => r.company && pendingCompanyNames.includes(r.company.toLowerCase()));
    }

    const emailRecord = await db.saveEmail({
      senderId: req.user.id,
      senderName: req.user.name,
      recipientType: 'bulk',
      recipientGroup: 'recruiters_' + recipientGroup,
      recipientCount: recruiters.length,
      recipientSummary: `Recruiters of ${recipientGroup} companies`,
      subject,
      body,
      campaignType: 'Company Moderation Update'
    });

    await db.saveCompanyLog({
      adminId: req.user.id,
      adminName: req.user.name,
      action: `Sent recruiter email campaign: ${subject}`,
      targetType: 'communication',
      targetId: 'email_' + Date.now(),
      targetName: `Group: ${recipientGroup}`
    });

    console.log(`\n========================================`);
    console.log(`📧 RECRUITER CAMPAIGN SENT: ${subject}`);
    console.log(`Recipients matched: ${recruiters.length}`);
    console.log(`========================================\n`);

    return res.json({ success: true, emailRecord, recipientCount: recruiters.length });
  } catch (error) {
    console.error('Send recruiter email error:', error);
    return res.status(500).json({ success: false, error: 'Server error sending email campaign' });
  }
});

// Toggle Job Featured Star
app.post('/api/companies/jobs/:id/toggle-feature', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const jobs = await db.getJobs();
    const job = jobs.find(j => j.id === id);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    job.isFeatured = !job.isFeatured;
    await db.saveJobs(jobs);
    await db.saveCompanyLog({
      adminId: req.user.id,
      adminName: req.user.name,
      action: job.isFeatured ? 'Starred/Featured Job Post' : 'Unstarred Job Post',
      targetType: 'job',
      targetId: id,
      targetName: job.title
    });
    return res.json({ success: true, job });
  } catch (error) {
    console.error('Toggle feature job error:', error);
    return res.status(500).json({ success: false, error: 'Server error toggling job feature' });
  }
});

// Expire/Active job status
app.post('/api/companies/jobs/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const jobs = await db.getJobs();
    const job = jobs.find(j => j.id === id);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    job.status = status;
    await db.saveJobs(jobs);
    await db.saveCompanyLog({
      adminId: req.user.id,
      adminName: req.user.name,
      action: `Job post status updated to [${status.toUpperCase()}]`,
      targetType: 'job',
      targetId: id,
      targetName: job.title
    });
    return res.json({ success: true, job });
  } catch (error) {
    console.error('Update job status error:', error);
    return res.status(500).json({ success: false, error: 'Server error updating job status' });
  }
});

// Resolve Report ticket
app.post('/api/companies/reports/:id/resolve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const reports = await db.getCompanyReports();
    const report = reports.find(r => r.id === id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }
    report.status = 'resolved';
    await db.saveCompanyReports(reports);
    await db.saveCompanyLog({
      adminId: req.user.id,
      adminName: req.user.name,
      action: `Resolved report ticket [${id}]`,
      targetType: report.targetType,
      targetId: report.targetId,
      targetName: report.targetName
    });
    return res.json({ success: true, report });
  } catch (error) {
    console.error('Resolve report error:', error);
    return res.status(500).json({ success: false, error: 'Server error resolving report' });
  }
});

/* =========================
   APPLICATION MODULE ENDPOINTS
========================= */

// Get all applications
app.get('/api/applications', authenticateToken, async (req, res) => {
  try {
    const applications = await applicationStore.getAllApplications();
    return res.json({ success: true, applications });
  } catch (error) {
    console.error('Fetch applications error:', error);
    return res.status(500).json({ success: false, error: 'Server error fetching applications' });
  }
});

// Update application status
app.post('/api/applications/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const appRecord = await applicationStore.findApplicationById(id);
    if (!appRecord) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }
    const oldStatus = appRecord.status;
    const updated = await applicationStore.updateApplicationStatus(id, status);
    await db.saveCompanyLog({
      adminId: req.user.id,
      adminName: req.user.name,
      action: `Updated application status for [${appRecord.userName}] from [${oldStatus.toUpperCase()}] to [${status.toUpperCase()}]`,
      targetType: 'application',
      targetId: id,
      targetName: `${appRecord.userName} - ${appRecord.jobTitle}`
    });
    return res.json({ success: true, application: updated });
  } catch (error) {
    console.error('Update application status error:', error);
    return res.status(500).json({ success: false, error: 'Server error updating application status' });
  }
});

// Delete application
app.post('/api/applications/:id/delete', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const appRecord = await applicationStore.deleteApplication(id);
    if (!appRecord) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }
    await db.saveCompanyLog({
      adminId: req.user.id,
      adminName: req.user.name,
      action: `Deleted application for candidate [${appRecord.userName}] for role [${appRecord.jobTitle}]`,
      targetType: 'application',
      targetId: id,
      targetName: `${appRecord.userName} - ${appRecord.jobTitle}`
    });
    return res.json({ success: true });
  } catch (error) {
    console.error('Delete application error:', error);
    return res.status(500).json({ success: false, error: 'Server error deleting application' });
  }
});

// Default applicant responses sheet (publish to web as CSV for sync to work)
const DEFAULT_APPLICANT_SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/19T3MgIa_iDzybzLneCqXYIbATxOuL644xqKtYuZUvbY/export?format=csv&gid=961207793';

function normalizeSheetCsvUrl(url) {
  if (!url) return DEFAULT_APPLICANT_SHEET_CSV_URL;
  const trimmed = url.trim();
  const sheetIdMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!sheetIdMatch) return trimmed;
  const gidMatch = trimmed.match(/[#&?]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : '0';
  return `https://docs.google.com/spreadsheets/d/${sheetIdMatch[1]}/export?format=csv&gid=${gid}`;
}

function getMappedColumnIndices(headers) {
  const find = (...patterns) =>
    headers.findIndex((h) => patterns.some((p) => h.includes(p)));

  return {
    timestamp: find('timestamp'),
    email: find('email', 'e-mail', 'mail address'),
    name: headers.findIndex((h) => h.includes('name') && !h.includes('company') && !h.includes('user name')),
    phone: find('phone', 'contact number', 'mobile'),
    education: find('education', 'school', 'university', 'college'),
    skills: find('skill'),
    portfolio: find('portfolio', 'linkedin', 'website', 'github'),
    resume: find('resume', 'cv', 'upload'),
    coverLetter: find('cover', 'letter', 'purpose', 'statement', 'why'),
    position: find('position', 'job', 'role', 'interest', 'internship'),
  };
}

// CSV parser helper for Google Sheets
function parseCSV(text) {
  const lines = [];
  let row = [""];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i+1];
    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push('');
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') { i++; }
      lines.push(row);
      row = [''];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || row[0] !== '') {
    lines.push(row);
  }
  return lines;
}

// Sync applicants from Google Sheets CSV
async function syncApplicantsFromSheet(sheetUrl) {
  const csvUrl = normalizeSheetCsvUrl(sheetUrl);
  const response = await fetch(csvUrl);
  if (!response.ok) {
    throw new Error(
      'Failed to fetch the Google Sheet CSV. Open the sheet → File → Share → Publish to web → select this tab → Comma-separated values (.csv).'
    );
  }

  const csvText = await response.text();
  const rows = parseCSV(csvText);

  if (rows.length < 2) {
    throw new Error('The CSV has no data rows.');
  }

  const rawHeaders = rows[0].map((h) => h.trim());
  const headers = rawHeaders.map((h) => h.toLowerCase().trim());
  const cols = getMappedColumnIndices(headers);

  if (cols.email === -1 || cols.name === -1) {
    throw new Error('Could not find columns for Email or Name. Check your Sheet headers.');
  }

  const mappedIndices = new Set(
    Object.values(cols).filter((idx) => idx !== -1)
  );

  let addedCount = 0;
  const jobs = await db.getJobs();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || !row[cols.email]) continue;

    const email = row[cols.email].trim();
    const name = row[cols.name].trim();
    const rawTimestamp = cols.timestamp !== -1 && row[cols.timestamp] ? row[cols.timestamp].trim() : '';

    let appliedDate = new Date().toISOString().split('T')[0];
    if (rawTimestamp) {
      const parsedDate = new Date(rawTimestamp);
      if (!isNaN(parsedDate.getTime())) {
        appliedDate = parsedDate.toISOString().split('T')[0];
      }
    }

    const phone = cols.phone !== -1 && row[cols.phone] ? row[cols.phone].trim() : '';
    const education = cols.education !== -1 && row[cols.education] ? row[cols.education].trim() : '';
    const skills = cols.skills !== -1 && row[cols.skills] ? row[cols.skills].trim() : '';
    const portfolioUrl = cols.portfolio !== -1 && row[cols.portfolio] ? row[cols.portfolio].trim() : '';
    const resumeUrl = cols.resume !== -1 && row[cols.resume] ? row[cols.resume].trim() : '';
    const coverLetter = cols.coverLetter !== -1 && row[cols.coverLetter] ? row[cols.coverLetter].trim() : '';
    const rawPosition = cols.position !== -1 && row[cols.position] ? row[cols.position].trim() : 'Applicant';

    const extraFields = {};
    for (let j = 0; j < rawHeaders.length; j++) {
      const value = row[j] ? row[j].trim() : '';
      if (!value || mappedIndices.has(j)) continue;
      extraFields[rawHeaders[j]] = value;
    }

    let jobId = 'j-sheet';
    let jobTitle = rawPosition;
    let companyName = 'OMAHCONNECT';

    const matchedJob = jobs.find(
      (j) =>
        j.title.toLowerCase().includes(rawPosition.toLowerCase()) ||
        rawPosition.toLowerCase().includes(j.title.toLowerCase())
    );
    if (matchedJob) {
      jobId = matchedJob.id;
      jobTitle = matchedJob.title;
      companyName = matchedJob.companyName;
    }

    const created = await applicationStore.createFromSheetRow({
      email,
      name,
      phone,
      education,
      skills,
      portfolioUrl,
      resumeUrl,
      coverLetter,
      jobId,
      jobTitle,
      companyName,
      appliedDate,
      extraFields,
    });

    if (created) addedCount++;
  }

  const settings = await db.getCompanySettings();
  settings.applicantSheetUrl = csvUrl;
  await db.saveCompanySettings(settings);

  return addedCount;
}

app.post('/api/applications/sync-sheet', authenticateToken, async (req, res) => {
  try {
    const sheetUrl = req.body.sheetUrl || process.env.APPLICANT_SHEET_CSV_URL || DEFAULT_APPLICANT_SHEET_CSV_URL;
    const addedCount = await syncApplicantsFromSheet(sheetUrl);

    await db.saveCompanyLog({
      adminId: req.user.id,
      adminName: req.user.name,
      action: `Synchronized applicant sheet. Imported [${addedCount}] new applicant(s).`,
      targetType: 'applications_sync',
      targetId: 'sync_' + Date.now(),
      targetName: 'Google Sheets Applicants'
    });

    return res.json({ success: true, addedCount });
  } catch (error) {
    console.error('Applicant sheet sync error:', error);
    return res.status(500).json({ success: false, error: 'Server error during sheet synchronization: ' + error.message });
  }
});

app.get('/api/applications/sheet-config', authenticateToken, async (req, res) => {
  try {
    const settings = await db.getCompanySettings();
    const sheetUrl =
      settings.applicantSheetUrl ||
      process.env.APPLICANT_SHEET_CSV_URL ||
      DEFAULT_APPLICANT_SHEET_CSV_URL;
    return res.json({ success: true, sheetUrl: normalizeSheetCsvUrl(sheetUrl) });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to load sheet config' });
  }
});

// Get database stats summary
app.get('/api/dev/db-summary', authenticateToken, async (req, res) => {
  try {
    const summary = await db.getDbSummary();
    return res.json({ success: true, summary });
  } catch (error) {
    console.error('Fetch DB summary error:', error);
    return res.status(500).json({ success: false, error: 'Server error fetching DB summary' });
  }
});

const path = require('path');

// Serve static assets from the frontend build directory
app.use(express.static(path.join(__dirname, 'omahconnect-admin/dist')));

// Wildcard handler to serve frontend SPA for any other route
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'omahconnect-admin/dist', 'index.html'));
});

async function startServer() {
  await applicationStore.init(mongoConnection);

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📦 Applications storage: ${applicationStore.isUsingMongo() ? 'MongoDB' : 'JSON file (data/applications.json)'}`);

    // Sync applicants in the background so it doesn't block server startup
    const sheetUrl = process.env.APPLICANT_SHEET_CSV_URL || DEFAULT_APPLICANT_SHEET_CSV_URL;
    syncApplicantsFromSheet(sheetUrl)
      .then((added) => {
        console.log(`📋 Applicant sheet sync: imported ${added} new applicant(s)`);
      })
      .catch((error) => {
        console.warn('⚠️  Applicant sheet auto-sync skipped:', error.message);
      });
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

module.exports = app;

