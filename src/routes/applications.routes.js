const express = require('express');

module.exports = (deps) => {
  const router = express.Router();
  const { DEFAULT_APPLICANT_SHEET_CSV_URL, applicationStore, authenticateToken, db, normalizeSheetCsvUrl, syncApplicantsFromSheet } = deps;

  router.get('/', authenticateToken, async (req, res) => {
    try {
      const applications = await applicationStore.getAllApplications();
      return res.json({ success: true, applications });
    } catch (error) {
      console.error('Fetch applications error:', error);
      return res.status(500).json({ success: false, error: 'Server error fetching applications' });
    }
  });

  router.post('/:id/status', authenticateToken, async (req, res) => {
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

  router.post('/:id/delete', authenticateToken, async (req, res) => {
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

  router.post('/sync-sheet', authenticateToken, async (req, res) => {
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

  router.get('/sheet-config', authenticateToken, async (req, res) => {
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

  return router;
};
