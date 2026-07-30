const express = require('express');

module.exports = (deps) => {
  const router = express.Router();
  const { authenticateToken, db } = deps;

  router.get('/', authenticateToken, async (req, res) => {
    try {
      const companies = await db.getCompanies();
      return res.json({ success: true, companies });
    } catch (error) {
      console.error('Fetch companies error:', error);
      return res.status(500).json({ success: false, error: 'Server error fetching companies' });
    }
  });

  router.get('/recruiters', authenticateToken, async (req, res) => {
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

  router.get('/jobs', authenticateToken, async (req, res) => {
    try {
      const jobs = await db.getJobs();
      return res.json({ success: true, jobs });
    } catch (error) {
      console.error('Fetch jobs error:', error);
      return res.status(500).json({ success: false, error: 'Server error fetching jobs' });
    }
  });

  router.get('/reports', authenticateToken, async (req, res) => {
    try {
      const reports = await db.getCompanyReports();
      return res.json({ success: true, reports });
    } catch (error) {
      console.error('Fetch company reports error:', error);
      return res.status(500).json({ success: false, error: 'Server error fetching reports' });
    }
  });

  router.get('/logs', authenticateToken, async (req, res) => {
    try {
      const logs = await db.getCompanyLogs();
      return res.json({ success: true, logs });
    } catch (error) {
      console.error('Fetch company logs error:', error);
      return res.status(500).json({ success: false, error: 'Server error fetching logs' });
    }
  });

  router.get('/settings', authenticateToken, async (req, res) => {
    try {
      const settings = await db.getCompanySettings();
      return res.json({ success: true, settings });
    } catch (error) {
      console.error('Fetch settings error:', error);
      return res.status(500).json({ success: false, error: 'Server error fetching settings' });
    }
  });

  router.post('/settings', authenticateToken, async (req, res) => {
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

  router.post('/:id/verify', authenticateToken, async (req, res) => {
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

  router.post('/:id/suspend', authenticateToken, async (req, res) => {
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

  router.post('/communications/send', authenticateToken, async (req, res) => {
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

  router.post('/jobs/:id/toggle-feature', authenticateToken, async (req, res) => {
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

  router.post('/jobs/:id/status', authenticateToken, async (req, res) => {
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

  router.post('/reports/:id/resolve', authenticateToken, async (req, res) => {
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

  return router;
};
