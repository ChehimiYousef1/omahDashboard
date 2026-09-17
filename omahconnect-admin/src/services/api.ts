import axios from 'axios';

// Create an Axios instance with base URL pointing to the Express backend
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar: string | null;
  coverPage: string | null;
  gender?: string;
  country?: string;
  city?: string;
  profession?: string;
  isStudent?: boolean;
  isVerified?: boolean;
  joinedDate?: string;
  trustScore?: number;
  status?: 'Active' | 'Pending' | 'Suspended';
  plan?: string;
  badge?: string;
  bio?: string;
  phone?: string;
  emergencyPhone?: string;
  company?: string;
  lastActive?: string;
  notificationPermissions?: {
    push: boolean;
    email: boolean;
    inApp: boolean;
  };
}

export interface PostAttachment {
  url?: string;
  src?: string;
  name?: string;
  type?: string;
  [key: string]: unknown;
}

export interface Post {
  id: number;
  userId: string;
  title: string;
  description: string;
  attachments: PostAttachment[];
  postType: string;
  visibility: string;
  created_at: string;
  author_name: string;
  author_role: string;
  author_avatar: string | null;
}

export interface EmailRecord {
  id: number;
  sentAt: string;
  status: string;
  senderId: string;
  senderName: string;
  recipientType: 'direct' | 'bulk';
  recipientGroup: string | null;
  recipientCount: number;
  recipientSummary: string;
  subject: string;
  body: string;
  campaignType: string;
}

export interface SendEmailPayload {
  recipientType: 'direct' | 'applicant' | 'bulk';
  recipientId?: string;
  recipientGroup?: 'all' | 'students' | 'professionals' | 'verified' | 'unverified';
  subject: string;
  body: string;
  campaignType: string;
}

/* =========================
   CRM CALLING MODELS
========================= */
export interface CallRecord {
  id: number;
  timestamp: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  recipientPhone: string;
  duration: number;
  status: 'Completed' | 'Missed' | 'No Answer';
  type: 'Standard Call' | 'Emergency Call' | 'Recruiter Support Call';
}

export interface InitiateCallPayload {
  recipientId: string;
  duration: number;
  status: 'Completed' | 'Missed' | 'No Answer';
  type: 'Standard Call' | 'Emergency Call' | 'Recruiter Support Call';
}

/* =========================
   NOTIFICATION MODELS
========================= */
export interface NotificationRecord {
  id: number;
  sentAt: string;
  status: 'Sent' | 'Failed';
  senderId: string;
  senderName: string;
  recipientType: 'direct' | 'bulk';
  recipientGroup: string | null;
  recipientSummary: string;
  recipientCount: number;
  optOutCount: number;
  title: string;
  message: string;
  channel: 'push' | 'email' | 'in-app';
}

export interface SendNotificationPayload {
  recipientType: 'direct' | 'bulk';
  recipientId?: string;
  recipientGroup?: 'all' | 'students' | 'professionals' | 'verified' | 'unverified';
  title: string;
  message: string;
  channel: 'push' | 'email' | 'in-app';
}

/* =========================
   MESSAGE CENTER MODELS
========================= */
export interface ChatMessage {
  id: number;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isSpam?: boolean;
  moderated?: boolean;
  warningSent?: boolean;
}

export interface Conversation {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  isFlagged: boolean;
  messages: ChatMessage[];
}

/* =========================
   AUTHENTICATION API
========================= */
export const fetchCurrentUser = async (): Promise<User> => {
  const response = await apiClient.get('/auth/me');
  return response.data.user;
};

/* =========================
   USER DIRECTORY API
========================= */
export const fetchUsers = async (): Promise<User[]> => {
  const response = await apiClient.get('/users');
  return response.data.users;
};

export const toggleNotificationPermissions = async (userId: string, permissions: { push?: boolean; email?: boolean; inApp?: boolean }): Promise<unknown> => {
  const response = await apiClient.post(`/users/${userId}/notifications/toggle`, permissions);
  return response.data;
};

/* =========================
   POSTS API
========================= */
export const fetchPosts = async (): Promise<Post[]> => {
  const response = await apiClient.get('/posts');
  return response.data.posts;
};

/* =========================
   EMAIL CAMPAIGNS API
========================= */
export const fetchEmails = async (): Promise<EmailRecord[]> => {
  const response = await apiClient.get('/emails');
  return response.data.emails;
};

export const sendEmail = async (payload: SendEmailPayload): Promise<{ success: boolean; message: string; emailRecord: EmailRecord }> => {
  const response = await apiClient.post('/emails/send', payload);
  return response.data;
};

/* =========================
   CRM CALLING API
========================= */
export const fetchCalls = async (): Promise<CallRecord[]> => {
  const response = await apiClient.get('/calls');
  return response.data.calls;
};

export const initiateCall = async (payload: InitiateCallPayload): Promise<{ success: boolean; message: string; callRecord: CallRecord }> => {
  const response = await apiClient.post('/calls/initiate', payload);
  return response.data;
};

/* =========================
   NOTIFICATION HUB API
========================= */
export const fetchNotifications = async (): Promise<NotificationRecord[]> => {
  const response = await apiClient.get('/notifications');
  return response.data.notifications;
};

export const sendNotification = async (payload: SendNotificationPayload): Promise<{ success: boolean; message: string; notificationRecord: NotificationRecord }> => {
  const response = await apiClient.post('/notifications/send', payload);
  return response.data;
};

export const resendNotification = async (notificationId: number): Promise<{ success: boolean; message: string; notificationRecord: NotificationRecord }> => {
  const response = await apiClient.post('/notifications/resend', { notificationId });
  return response.data;
};

/* =========================
   MESSAGE CENTER API
========================= */
export const fetchConversations = async (): Promise<Conversation[]> => {
  const response = await apiClient.get('/messages/conversations');
  return response.data.conversations;
};

export const fetchMessages = async (conversationId: string): Promise<ChatMessage[]> => {
  const response = await apiClient.get(`/messages/conversations/${conversationId}`);
  return response.data.messages;
};

export const sendMessage = async (userId: string, text: string, senderId?: string): Promise<{ success: boolean; chatRecord: ChatMessage; conversation: Conversation; spamWarningTriggered: boolean; autoWarning: ChatMessage | null }> => {
  const response = await apiClient.post('/messages/send', { userId, text, senderId });
  return response.data;
};

export const flagConversation = async (conversationId: string, isFlagged: boolean): Promise<{ success: boolean; conversation: Conversation }> => {
  const response = await apiClient.post(`/messages/conversations/${conversationId}/flag`, { isFlagged });
  return response.data;
};

/* =========================
   COMPANY MODULE MODELS
========================= */
export interface VerificationDoc {
  type: string;
  name: string;
  submittedAt: string;
  docId: string;
  size: string;
}

export interface Company {
  id: string;
  name: string;
  logo: string;
  website: string;
  industry: string;
  location: string;
  description: string;
  verificationStatus: 'verified' | 'unverified' | 'pending';
  accountStatus: 'active' | 'suspended';
  createdDate: string;
  lastActive: string;
  recruiterCount: number;
  totalJobs: number;
  size: string;
  verificationDocs?: VerificationDoc[];
  verificationNotes?: string;
  riskScore: number;
  riskReasons?: string[];
  analytics?: {
    applicants: number;
    views: number;
    hires: number;
    engagementRate: number;
  };
  isSuspicious?: boolean;
}

export interface Job {
  id: string;
  companyId: string;
  companyName: string;
  title: string;
  description: string;
  type: 'Full-time' | 'Part-time' | 'Internship' | 'Contract';
  category: string;
  location: string;
  status: 'active' | 'expired';
  postedDate: string;
  isFeatured: boolean;
  applicantCount: number;
}

export interface CompanyReport {
  id: string;
  targetType: 'company' | 'job';
  targetId: string;
  targetName: string;
  reportedBy: string;
  reason: string;
  description: string;
  status: 'pending' | 'resolved';
  createdDate: string;
}

export interface CompanyLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetType: string;
  targetId: string;
  targetName: string;
  timestamp: string;
}

export interface CompanySettings {
  requireVerificationDocs: boolean;
  autoFilterSpamJobs: boolean;
  allowedDomains: string[];
  minTrustScoreToPost: number;
  spamKeywords: string[];
  googleSheetSyncUrl?: string;
  applicantSheetUrl?: string;
}

/* =========================
   COMPANY MODULE API
========================= */
export const fetchCompanies = async (): Promise<Company[]> => {
  const response = await apiClient.get('/companies');
  return response.data.companies;
};

export const fetchCompanyRecruiters = async (): Promise<User[]> => {
  const response = await apiClient.get('/companies/recruiters');
  return response.data.recruiters;
};

export const fetchCompanyJobs = async (): Promise<Job[]> => {
  const response = await apiClient.get('/companies/jobs');
  return response.data.jobs;
};

export const fetchCompanyReports = async (): Promise<CompanyReport[]> => {
  const response = await apiClient.get('/companies/reports');
  return response.data.reports;
};

export const fetchCompanyLogs = async (): Promise<CompanyLog[]> => {
  const response = await apiClient.get('/companies/logs');
  return response.data.logs;
};

export const fetchCompanySettings = async (): Promise<CompanySettings> => {
  const response = await apiClient.get('/companies/settings');
  return response.data.settings;
};

export const saveCompanySettings = async (settings: CompanySettings): Promise<CompanySettings> => {
  const response = await apiClient.post('/companies/settings', settings);
  return response.data.settings;
};

export const verifyCompany = async (id: string, status: 'verified' | 'unverified' | 'pending', notes: string): Promise<Company> => {
  const response = await apiClient.post(`/companies/${id}/verify`, { status, notes });
  return response.data.company;
};

export const suspendCompany = async (id: string, status: boolean): Promise<Company> => {
  const response = await apiClient.post(`/companies/${id}/suspend`, { status });
  return response.data.company;
};

export const sendRecruiterCampaign = async (payload: { recipientGroup: 'all' | 'verified' | 'pending'; subject: string; body: string }): Promise<{ success: boolean; recipientCount: number }> => {
  const response = await apiClient.post('/companies/communications/send', payload);
  return response.data;
};

export const toggleJobFeature = async (id: string): Promise<Job> => {
  const response = await apiClient.post(`/companies/jobs/${id}/toggle-feature`);
  return response.data.job;
};

export const updateJobStatus = async (id: string, status: 'active' | 'expired'): Promise<Job> => {
  const response = await apiClient.post(`/companies/jobs/${id}/status`, { status });
  return response.data.job;
};

export const resolveCompanyReport = async (id: string): Promise<CompanyReport> => {
  const response = await apiClient.post(`/companies/reports/${id}/resolve`);
  return response.data.report;
};

/* =========================
   APPLICATION MODULE MODELS & API
========================= */
export interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  userId: string;
  userName: string;
  userEmail: string;
  resumeUrl: string;
  status: 'applied' | 'reviewed' | 'interview' | 'hired' | 'rejected';
  appliedDate: string;
  coverLetter?: string;
  phone?: string;
  education?: string;
  skills?: string;
  portfolioUrl?: string;
  source?: string;
  extraFields?: Record<string, string>;
}

export const fetchApplications = async (): Promise<Application[]> => {
  const response = await apiClient.get('/applications');
  return response.data.applications || [];
};

export const updateApplicationStatus = async (id: string, status: 'applied' | 'reviewed' | 'interview' | 'hired' | 'rejected'): Promise<Application> => {
  const response = await apiClient.post(`/applications/${id}/status`, { status });
  return response.data.application;
};

export const deleteApplication = async (id: string): Promise<{ success: boolean }> => {
  const response = await apiClient.post(`/applications/${id}/delete`);
  return response.data;
};

export const syncApplicantsSheet = async (sheetUrl?: string): Promise<{ success: boolean; addedCount: number }> => {
  const response = await apiClient.post('/applications/sync-sheet', sheetUrl ? { sheetUrl } : {});
  return response.data;
};


/* =========================
   APPLICANT MASTER API
========================= */

export type ApplicantStatus =
  | "applied"
  | "reviewed"
  | "shortlisted"
  | "interview"
  | "offered"
  | "hired"
  | "rejected";

export interface ApplicantPipelineStage {
  value: ApplicantStatus;
  label: string;
  order: number;
  terminal: boolean;
}

export interface ApplicantPipelineDefinition {
  stages: ApplicantPipelineStage[];

  transitions:
    Record<
      ApplicantStatus,
      ApplicantStatus[]
    >;
}


export interface ApplicantAnalyticsBreakdown {
  key: string;
  label: string;
  count: number;
  percent?: number;
}


export interface ApplicantAnalyticsPipelineStage {
  status: ApplicantStatus;
  label: string;
  order: number;
  terminal?: boolean;
  count: number;
  percent: number;
}


export interface ApplicantAnalyticsVolumePoint {
  period: string;
  count: number;
  cumulative: number;
}


export interface ApplicantAnalyticsHistogramBin {
  key: string;
  label: string;
  min: number;
  max: number;
  count: number;
  percent: number;
}


export interface ApplicantAnalyticsMatrixRow {
  key: string;
  label: string;
  total: number;

  values:
    Record<
      string,
      number
    >;
}


export interface ApplicantAnalyticsStatusFlow {
  nodes:
    Array<{
      name: string;
      status: ApplicantStatus;
    }>;

  links:
    Array<{
      source: number;
      target: number;
      value: number;
      previousStatus: ApplicantStatus;
      nextStatus: ApplicantStatus;
    }>;

  recordedTransitions: number;
  firstRecordedAt: string | null;
  lastRecordedAt: string | null;
  historicalCoverage: string;
}


export interface ApplicantAnalyticsEvaluation {
  total: number;
  submitted: number;
  draft: number;

  averageRating:
    number | null;

  averageWeightedScore:
    number | null;

  minimumRating:
    number | null;

  maximumRating:
    number | null;

  minimumWeightedScore:
    number | null;

  maximumWeightedScore:
    number | null;

  positiveRecommendationRate:
    number;

  criteriaAverages:
    Array<{
      key: string;
      label: string;
      weight: number;

      average:
        number | null;
    }>;

  statuses:
    ApplicantAnalyticsBreakdown[];

  recommendations:
    ApplicantAnalyticsBreakdown[];

  ratingHistogram:
    ApplicantAnalyticsHistogramBin[];

  scoreHistogram:
    ApplicantAnalyticsHistogramBin[];

  trend:
    ApplicantAnalyticsVolumePoint[];
}


export interface ApplicantAnalyticsInterviewTrendPoint {
  period: string;
  total: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  no_show: number;
}


export interface ApplicantAnalyticsInterview {
  total: number;
  completed: number;
  noShow: number;

  completionRate:
    number;

  noShowRate:
    number;

  recommendedOutcomeRate:
    number;

  statuses:
    ApplicantAnalyticsBreakdown[];

  outcomes:
    ApplicantAnalyticsBreakdown[];

  types:
    ApplicantAnalyticsBreakdown[];

  formats:
    ApplicantAnalyticsBreakdown[];

  trend:
    ApplicantAnalyticsInterviewTrendPoint[];
}


export interface ApplicantAnalyticsSegmentation {
  positions: {
    tracks:
      ApplicantAnalyticsBreakdown[];

    types:
      ApplicantAnalyticsBreakdown[];
  };

  geography: {
    countries:
      ApplicantAnalyticsBreakdown[];

    cities:
      ApplicantAnalyticsBreakdown[];
  };

  education: {
    degreeLevels:
      ApplicantAnalyticsBreakdown[];

    universities:
      ApplicantAnalyticsBreakdown[];

    majors:
      ApplicantAnalyticsBreakdown[];

    studyStatuses:
      ApplicantAnalyticsBreakdown[];
  };

  experience: {
    technicalLevels:
      ApplicantAnalyticsBreakdown[];
  };

  skills: {
    primaryTechnical:
      ApplicantAnalyticsBreakdown[];

    programmingLanguages:
      ApplicantAnalyticsBreakdown[];

    frameworks:
      ApplicantAnalyticsBreakdown[];

    databases:
      ApplicantAnalyticsBreakdown[];

    cloudDevOps:
      ApplicantAnalyticsBreakdown[];

    dataAnalytics:
      ApplicantAnalyticsBreakdown[];

    dataEngineering:
      ApplicantAnalyticsBreakdown[];

    aiMl:
      ApplicantAnalyticsBreakdown[];

    softSkills:
      ApplicantAnalyticsBreakdown[];
  };
}


export interface ApplicantAnalyticsActivityItem {
  id: string;
  applicantId: string;
  type: string;
  category: string;
  title: string;
  description: string;
  occurredAt: string | null;

  actor: {
    name: string;
    role: string;
  };
}


export interface ApplicantAnalyticsUpcomingInterview {
  id: string;
  applicantId: string;
  applicantName: string;
  type: string;
  format: string;
  status: string;
  outcome: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;

  organizer: {
    name: string;
    role: string;
  };
}


export interface ApplicantAnalyticsRecentFeedback {
  id: string;
  applicantId: string;
  applicantName: string;

  evaluator: {
    name: string;
    role: string;
  };

  recommendation: string;

  averageRating:
    number | null;

  weightedScore:
    number | null;

  strengths: string;
  concerns: string;
  summary: string;
  submittedAt: string | null;
}


export interface ApplicantAnalyticsManagement {
  actionCenter: {
    newNeedingReview: number;
    draftEvaluations: number;
    upcomingInterviews: number;
    upcomingInterviewWindowDays: number;
    overdueScheduledInterviews: number;
    interviewNoShows: number;
    awaitingOfferDecision: number;
    unresolvedDuplicateCases: number;
    highConfidenceDuplicateCases: number;
    incompleteProfiles: number;
    applicantsMissingCv: number;
    applicantsWithoutSubmittedEvaluation: number;
    applicantsWithoutInterview: number;
  };

  upcomingInterviews:
    ApplicantAnalyticsUpcomingInterview[];

  dataQuality: {
    definition:
      Array<{
        key: string;
        label: string;
      }>;

    fields:
      Array<{
        key: string;
        label: string;
        missing: number;
        present: number;
        coveragePercent: number;
      }>;

    profileFieldCoveragePercent:
      number;

    completeProfiles:
      number;

    incompleteProfiles:
      number;

    cvCoverage: {
      applicantsWithCv: number;
      applicantsMissingCv: number;
      coveragePercent: number;
    };
  };

  duplicates: {
    total: number;
    unresolved: number;
    highConfidenceUnresolved: number;

    statuses:
      ApplicantAnalyticsBreakdown[];

    confidence:
      ApplicantAnalyticsBreakdown[];

    decisions:
      ApplicantAnalyticsBreakdown[];

    recentUnresolved:
      Array<{
        id: string;
        sourceApplicantId: string;
        candidateApplicantId: string;
        status: string;
        confidence: string;
        strongMatchCount: number;
        matchedSignals: string[];
        detectedAt: string | null;
      }>;
  };

  submissions: {
    total: number;
    applicantsWithSubmissions: number;
    applicantsWithMultipleSubmissions: number;
    averageSubmissionsPerApplicant: number;

    sources:
      ApplicantAnalyticsBreakdown[];

    historicalStatuses:
      ApplicantAnalyticsBreakdown[];

    trend:
      ApplicantAnalyticsVolumePoint[];
  };

  documents: {
    totalVersions: number;
    currentActive: number;
    archived: number;
    applicantsWithCv: number;
    applicantsMissingCv: number;
    cvCoveragePercent: number;

    types:
      ApplicantAnalyticsBreakdown[];

    sources:
      ApplicantAnalyticsBreakdown[];

    trend:
      ApplicantAnalyticsVolumePoint[];
  };

  feedback: {
    recent:
      ApplicantAnalyticsRecentFeedback[];
  };

  communications: {
    total: number;
    emailSent: number;
    whatsappSent: number;

    trend:
      Array<{
        period: string;
        email: number;
        whatsapp: number;
        total: number;
      }>;

    recent:
      Array<{
        id: string;
        applicantId: string;
        type: string;
        title: string;
        occurredAt: string | null;

        actor: {
          name: string;
          role: string;
        };

        subject: string;
        provider: string;
      }>;
  };

  recentActivity:
    ApplicantAnalyticsActivityItem[];
}


export interface ApplicantNotesTasksAnalytics {
  totalItems: number;

  totalNotes: number;
  scheduledNotes: number;

  totalTasks: number;
  openTasks: number;
  completedTasks: number;

  completionRate: number;

  overdueTasks: number;
  dueTodayTasks: number;
  upcomingTasks: number;
  upcomingWindowDays: number;
  temporalViews: {
    hourly:
      Array<{
        key: string;
        start: string;
        granularity: "hourly";
        tasksCreated: number;
        tasksCompleted: number;
        notesCreated: number;
        remindersScheduled: number;
      }>;

    daily:
      Array<{
        key: string;
        start: string;
        granularity: "daily";
        tasksCreated: number;
        tasksCompleted: number;
        notesCreated: number;
        remindersScheduled: number;
      }>;

    weekly:
      Array<{
        key: string;
        start: string;
        granularity: "weekly";
        tasksCreated: number;
        tasksCompleted: number;
        notesCreated: number;
        remindersScheduled: number;
      }>;

    monthly:
      Array<{
        key: string;
        start: string;
        granularity: "monthly";
        tasksCreated: number;
        tasksCompleted: number;
        notesCreated: number;
        remindersScheduled: number;
      }>;
  };

  unscheduledOpenTasks: number;

  scheduledReminders: number;
  importantItems: number;

  calendarSyncedItems: number;
  calendarNotLinkedScheduled: number;
  calendarNeedsUpdate: number;
  calendarSyncErrors: number;

  ownerSource: "author";

  ownerWorkload:
    Array<{
      key: string;
      label: string;

      openTasks: number;
      overdueTasks: number;
      dueTodayTasks: number;
      upcomingTasks: number;
    }>;

  taskStatusDistribution:
    ApplicantAnalyticsBreakdown[];

  dueDistribution:
    ApplicantAnalyticsBreakdown[];

  calendarDistribution:
    ApplicantAnalyticsBreakdown[];
}


export interface ApplicantRecruitmentAnalytics {
  analyticsVersion: number;

  summary: {
    totalApplicants: number;
    activeApplicants: number;
    archivedApplicants: number;

    newApplicants: number;
    underReview: number;
    shortlisted: number;
    interviewStage: number;
    offered: number;
    hired: number;
    rejected: number;

    interviews: number;
    submittedEvaluations: number;

    averageEvaluationRating:
      number | null;

    averageWeightedScore:
      number | null;

    interviewCompletionRate:
      number;

    interviewNoShowRate:
      number;

    positiveRecommendationRate:
      number;

    recordedStatusTransitions:
      number;
  };

  pipeline:
    ApplicantAnalyticsPipelineStage[];

  volumeOverTime:
    ApplicantAnalyticsVolumePoint[];

  sources:
    ApplicantAnalyticsBreakdown[];

  evaluations:
    ApplicantAnalyticsEvaluation;

  interviews:
    ApplicantAnalyticsInterview;

  notesTasks:
    ApplicantNotesTasksAnalytics;

  pipelineAnalytics: {
    stages:
      ApplicantAnalyticsPipelineStage[];

    funnel:
      Array<
        ApplicantAnalyticsPipelineStage & {
          relativeWidth: number;
        }
      >;

    positionByStage:
      ApplicantAnalyticsMatrixRow[];

    sourceByStage:
      ApplicantAnalyticsMatrixRow[];

    recordedFlow:
      ApplicantAnalyticsStatusFlow;
  };

  trends: {
    applications:
      ApplicantAnalyticsVolumePoint[];

    evaluations:
      ApplicantAnalyticsVolumePoint[];

    interviews:
      ApplicantAnalyticsInterviewTrendPoint[];

    activity:
      ApplicantAnalyticsVolumePoint[];
  };

  segmentation:
    ApplicantAnalyticsSegmentation;

  activity: {
    total: number;

    categories:
      ApplicantAnalyticsBreakdown[];

    trend:
      ApplicantAnalyticsVolumePoint[];

    statusFlow:
      ApplicantAnalyticsStatusFlow;
  };

  management:
    ApplicantAnalyticsManagement;

  filters: {
    q: string;
    from: string | null;
    to: string | null;
    status: string;
    positionTrack: string;
    positionType: string;
    country: string;
    city: string;
    source: string;
    skill: string;
    tag: string;

    archived:
      ApplicantLifecycleFilter;
  };

  metadata: {
    historicalStatusCoverage: string;

    firstRecordedStatusTransitionAt:
      string | null;

    lastRecordedStatusTransitionAt:
      string | null;

    timeInStageAvailable:
      boolean;

    historicalConversionAvailable:
      boolean;
  };
}


export type ApplicantLifecycleFilter =
  | "false"
  | "true"
  | "all";

export type ApplicantSortField =
  | "lastActivityAt"
  | "firstAppliedAt"
  | "lastAppliedAt"
  | "fullName"
  | "status"
  | "createdAt"
  | "updatedAt";

export type ApplicantSortOrder =
  | "asc"
  | "desc";

export interface ApplicantSearchQuery {
  q?: string;
  status?: ApplicantStatus;
  positionTrack?: string;
  positionType?: string;
  country?: string;
  city?: string;
  source?: string;
  assignedRecruiterId?: string;
  skill?: string;
  tag?: string;
  hasLinkedIn?: boolean;
  hasGitHub?: boolean;
  appliedFrom?: string;
  appliedTo?: string;
  archived?: ApplicantLifecycleFilter;
  sortBy?: ApplicantSortField;
  sortOrder?: ApplicantSortOrder;
  page?: number;
  limit?: number;
}

export interface ApplicantPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApplicantSearchResponse {
  applicants: ApplicantMaster[];
  pagination: ApplicantPagination;
  filters: Record<string, unknown>;
}

export interface ApplicantSearchOptions {
  statuses: ApplicantStatus[];
  tracks: string[];
  positionTypes: string[];
  countries: string[];
  cities: string[];
  sources: string[];
  tags: string[];
  sortFields: ApplicantSortField[];
}

export interface ApplicantMaster {
  _id: string;
  applicantCode?: string;

  identity: {
    fullName: string;
    email: string;
    normalizedEmail?: string;
    phoneNumber: string;
    normalizedPhone?: string;
    whatsappNumber: string;
    country: string;
    city: string;
  };

  education: {
    universityName: string;
    institutionCountry: string;
    degreeLevel: string;
    major: string;
    specialization: string;
    studyStatus: string;
    graduationDate: string | null;
    gpa: string;
    gradingScale: string;
    relevantCoursework: string;
    academicProjects: string;
    hasCertifications: boolean;
    certificateNames: string;
    languages: string[];
    englishProficiency: string;
    additionalEducation: string;
  };

  preferences: {
    positionTrack: string;
    positionType: string;
    availableStartDate: string | null;
    duration: string;
    weeklyAvailability: string;
    workingDays: string[];
    workingTime: string;
    currentlyEmployed: string;
    currentCommitment: string;
    canCommit: string;
    objectives: string[];
    universityRequired: string;
    universityRequiredDuration: string;
  };

  skills: {
    primaryTechnical: string[];
    otherTechnical: string;
    technicalExperienceLevel: string;
    professionalExperience: string;
    previousExperience: string;
    previousExperienceDetails: string;
    programmingLanguages: string[];
    frameworks: string[];
    databases: string[];
    cloudDevOps: string[];
    developmentTools: string[];
    softSkills: string[];
    dataEngineerSkills: string[];
    aiMlEngineerSkills: string[];
    dataAnalystSkills: string[];
    skillsToImprove: string;
    additionalSkills: string;
  };

  profiles: {
    linkedin: string;
    linkedinCanonical?: string;
    github: string;
    portfolio: string;
    socialMedia: string;
  };

  recruitment: {
    status: ApplicantStatus;
    source: string;
    assignedRecruiterId: string;
    firstAppliedAt: string | null;
    lastAppliedAt: string | null;
    lastActivityAt: string | null;
    tags: string[];
  };

  lifecycle: {
    archived: boolean;
    archivedAt: string | null;
    archivedBy: string;
    archiveReason: string;
  };

  profileVersion: number;
  latestApprovedSubmissionId: string | null;

  createdAt?: string;
  updatedAt?: string;
}

export type ApplicantDuplicateCaseStatus =
  | "open"
  | "under_review"
  | "resolved";

export type ApplicantDuplicateDecision =
  | "pending"
  | "same_person"
  | "keep_separate"
  | "not_duplicate"
  | "link_submissions"
  | "merge";

export interface ApplicantDuplicateEvidence {
  fullName: string;
  normalizedEmail: string;
  normalizedPhone: string;
  linkedinCanonical: string;
}

export interface ApplicantDuplicateCase {
  _id: string;
  pairKey: string;

  sourceApplicantId: string;
  candidateApplicantId: string;

  status:
    ApplicantDuplicateCaseStatus;

  confidence:
    "possible" |
    "high";

  strongMatchCount: number;

  matchedSignals:
    Array<
      "email" |
      "phone" |
      "linkedin"
    >;

  nameMatches: boolean;

  sourceEvidence:
    ApplicantDuplicateEvidence;

  candidateEvidence:
    ApplicantDuplicateEvidence;

  detectedAt?: string;
  detectedBy?: string;

  resolution?: {
    decision:
      ApplicantDuplicateDecision;

    resolvedAt?: string | null;
    resolvedBy?: string;
    notes?: string;
  };

  sourceApplicant?:
    ApplicantMaster |
    null;

  candidateApplicant?:
    ApplicantMaster |
    null;
}

export interface ApplicantDuplicateCaseListResponse {
  duplicateCases:
    ApplicantDuplicateCase[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };

  filters: {
    status: string;
    applicantId: string;
  };
}


export interface ApplicantSubmissionDocuments {
  cvResume?: string;
  identityDocument?: string;
  enrollmentDocument?: string;
  degreeCertificate?: string;
  trainingCertificates?: string[];
  recommendationLetters?: string[];
  portfolioWorkSamples?: string[];
  additionalSupportingDocuments?: string[];
}

export interface ApplicantFormSubmission {
  _id: string;
  submissionKey?: string;
  applicantId?: string | null;
  submittedAt?: string;

  personal?: {
    fullName?: string;
    email?: string;
    phoneNumber?: string;
    country?: string;
    city?: string;
    whatsappAvailable?: boolean;
    whatsappNumber?: string;
  };

  education?: Record<string, unknown>;
  preferences?: Record<string, unknown>;
  skills?: Record<string, unknown>;
  profiles?: Record<string, unknown>;

  documents?: ApplicantSubmissionDocuments;

  recruitment?: Record<string, unknown>;

  rawResponse?: Record<string, unknown>;

  createdAt?: string;
}

export type ApplicantEditableValue =
  | string
  | string[]
  | boolean
  | null;

export type ApplicantProfileChanges =
  Record<string, ApplicantEditableValue>;

export const searchApplicantMasters = async (
  query: ApplicantSearchQuery = {}
): Promise<ApplicantSearchResponse> => {
  const response =
    await apiClient.get(
      "/applicants",
      {
        params: query,
      }
    );

  return {
    applicants:
      response.data.applicants || [],

    pagination:
      response.data.pagination || {
        page: query.page || 1,
        limit: query.limit || 50,
        total: 0,
        pages: 0,
      },

    filters:
      response.data.filters || {},
  };
};

export const fetchApplicantSearchOptions =
  async (): Promise<ApplicantSearchOptions> => {
    const response =
      await apiClient.get(
        "/applicants/search-options"
      );

    return response.data.options;
  };

export const fetchApplicantMasters = async (
  archived: ApplicantLifecycleFilter = "false",
  limit = 200
): Promise<ApplicantMaster[]> => {
  const response =
    await apiClient.get(
      "/applicants",
      {
        params: {
          archived,
          limit,
        },
      }
    );

  return response.data.applicants || [];
};

export const fetchApplicantMaster = async (
  id: string
): Promise<ApplicantMaster> => {
  const response =
    await apiClient.get(
      `/applicants/${id}`
    );

  return response.data.applicant;
};

export const fetchApplicantDuplicateCases =
  async (
    params: {
      status?:
        ApplicantDuplicateCaseStatus |
        "all";

      applicantId?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<ApplicantDuplicateCaseListResponse> => {
    const response =
      await apiClient.get(
        "/applicants/duplicates",
        {
          params,
        }
      );

    return {
      duplicateCases:
        response.data
          .duplicateCases || [],

      pagination:
        response.data
          .pagination || {
            page: 1,
            limit: 50,
            total: 0,
            pages: 0,
          },

      filters:
        response.data
          .filters || {
            status:
              params.status ||
              "open",

            applicantId:
              params
                .applicantId ||
              "",
          },
    };
  };


export const fetchApplicantDuplicateCase =
  async (
    duplicateCaseId: string
  ): Promise<ApplicantDuplicateCase> => {
    const response =
      await apiClient.get(
        `/applicants/duplicates/${duplicateCaseId}`
      );

    return response.data
      .duplicateCase;
  };


export const resolveApplicantDuplicateCase =
  async (
    duplicateCaseId: string,
    payload: {
      decision:
        | "same_person"
        | "not_duplicate"
        | "keep_separate";

      notes?: string;
    }
  ): Promise<ApplicantDuplicateCase> => {
    const response =
      await apiClient.patch(
        `/applicants/duplicates/${duplicateCaseId}/resolve`,
        payload
      );

    return response.data
      .duplicateCase;
  };


export type ApplicantAnalyticsDrilldownType =
  | "missing_cv"
  | "incomplete_profile"
  | "draft_evaluation"
  | "no_show"
  | "overdue_interview"
  | "no_submitted_evaluation"
  | "no_interview"
  | "high_confidence_duplicate"
  | "open_task"
  | "overdue_task"
  | "due_today_task"
  | "upcoming_task"
  | "completed_task"
  | "scheduled_reminder"
  | "important_internal_item"
  | "calendar_synced_internal_item"
  | "calendar_not_linked_scheduled"
  | "calendar_needs_update"
  | "calendar_sync_error";


export interface ApplicantAnalyticsDrilldownApplicant {
  id: string;
  applicantCode: string;
  fullName: string;
  email: string;
  country: string;
  city: string;
  positionTrack: string;
  positionType: string;
  status: string;
  firstAppliedAt: string | null;
}


export interface ApplicantAnalyticsDrilldownApplicantItem {
  kind: "applicant";

  applicant:
    ApplicantAnalyticsDrilldownApplicant;

  reason: string;
  recordCount: number;
  latestAt: string | null;
  missingFields: string[];
}


export interface ApplicantAnalyticsDrilldownDuplicateItem {
  kind: "duplicate";

  id: string;
  status: string;
  confidence: string;
  strongMatchCount: number;
  matchedSignals: string[];
  detectedAt: string | null;

  sourceApplicant:
    ApplicantAnalyticsDrilldownApplicant |
    null;

  candidateApplicant:
    ApplicantAnalyticsDrilldownApplicant |
    null;
}


export type ApplicantAnalyticsDrilldownItem =
  | ApplicantAnalyticsDrilldownApplicantItem
  | ApplicantAnalyticsDrilldownDuplicateItem;


export interface ApplicantAnalyticsDrilldownResponse {
  type:
    ApplicantAnalyticsDrilldownType;

  label: string;
  description: string;
  recordCount: number;
  applicantCount: number;

  items:
    ApplicantAnalyticsDrilldownItem[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };

  filters:
    Record<string, unknown>;
}


export const fetchApplicantAnalyticsDrilldown =
  async (
    type:
      ApplicantAnalyticsDrilldownType,

    query:
      ApplicantSearchQuery = {},

    page = 1,

    limit = 50
  ): Promise<
    ApplicantAnalyticsDrilldownResponse
  > => {
    const response =
      await apiClient.get(
        "/applicants/analytics/drilldown",
        {
          params: {
            type,

            q:
              query.q,

            from:
              query.appliedFrom,

            to:
              query.appliedTo,

            status:
              query.status,

            positionTrack:
              query.positionTrack,

            positionType:
              query.positionType,

            country:
              query.country,

            city:
              query.city,

            source:
              query.source,

            skill:
              query.skill,

            tag:
              query.tag,

            archived:
              query.archived ||
              "false",

            page,
            limit,
          },
        }
      );

    return response
      .data
      .drilldown;
  };



export type ApplicantDocumentLibraryOrigin =
  | "all"
  | "managed"
  | "form_submission";

export type ApplicantDocumentLibraryState =
  | "current"
  | "historical"
  | "archived"
  | "all";

export interface ApplicantDocumentLibraryApplicant {
  id: string;
  applicantCode: string;
  fullName: string;
  email: string;
  country: string;
  city: string;
  positionTrack: string;
  positionType: string;
  status: string;
}

export interface ApplicantDocumentLibraryManagedInfo {
  documentId: string;
  documentGroupId: string;
  documentType: string;
  source: string;
  version: number;
  isCurrent: boolean;
  archived: boolean;
  archiveReason: string;
}

export interface ApplicantDocumentLibraryFormInfo {
  submissionId: string;
  field: string;
  externalUrl: string | null;
  readOnly: boolean;
}

export interface ApplicantDocumentLibraryItem {
  id: string;

  origin:
    | "managed"
    | "form_submission";

  state:
    | "current"
    | "historical"
    | "archived"
    | "submitted";

  category: string;
  categoryLabel: string;

  title: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;

  date: string | null;

  applicant:
    ApplicantDocumentLibraryApplicant;

  managed:
    ApplicantDocumentLibraryManagedInfo |
    null;

  form:
    ApplicantDocumentLibraryFormInfo |
    null;

  available: boolean;
}

export interface ApplicantDocumentLibraryBreakdown {
  key: string;
  label: string;
  count: number;
}

export interface ApplicantDocumentLibraryResponse {
  summary: {
    totalApplicants: number;
    applicantsWithAnyDocument: number;
    applicantsWithoutAnyDocument: number;
    applicantsWithCv: number;
    applicantsMissingCv: number;

    totalManagedVersions: number;
    managedCurrent: number;
    managedHistorical: number;
    managedArchived: number;

    formSubmitted: number;
    currentInventoryFiles: number;
  };

  items:
    ApplicantDocumentLibraryItem[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };

  breakdowns: {
    categories:
      ApplicantDocumentLibraryBreakdown[];

    origins:
      ApplicantDocumentLibraryBreakdown[];

    managedSources:
      ApplicantDocumentLibraryBreakdown[];
  };

  filterOptions: {
    categories: string[];
    origins:
      ApplicantDocumentLibraryOrigin[];
    states:
      ApplicantDocumentLibraryState[];
  };

  filters:
    Record<string, unknown>;
}

export interface ApplicantDocumentLibraryQuery {
  origin?:
    ApplicantDocumentLibraryOrigin;

  category?: string;

  state?:
    ApplicantDocumentLibraryState;

  fileQ?: string;

  page?: number;
  limit?: number;
}

export const fetchApplicantDocumentLibrary =
  async (
    applicantQuery:
      ApplicantSearchQuery = {},

    libraryQuery:
      ApplicantDocumentLibraryQuery = {}
  ): Promise<
    ApplicantDocumentLibraryResponse
  > => {
    const response =
      await apiClient.get(
        "/applicants/documents/library",
        {
          params: {
            q:
              applicantQuery.q,

            from:
              applicantQuery.appliedFrom,

            to:
              applicantQuery.appliedTo,

            status:
              applicantQuery.status,

            positionTrack:
              applicantQuery.positionTrack,

            positionType:
              applicantQuery.positionType,

            country:
              applicantQuery.country,

            city:
              applicantQuery.city,

            source:
              applicantQuery.source,

            skill:
              applicantQuery.skill,

            tag:
              applicantQuery.tag,

            archived:
              applicantQuery.archived ||
              "false",

            origin:
              libraryQuery.origin ||
              "all",

            category:
              libraryQuery.category ||
              "all",

            state:
              libraryQuery.state ||
              "current",

            fileQ:
              libraryQuery.fileQ,

            page:
              libraryQuery.page ||
              1,

            limit:
              libraryQuery.limit ||
              25,
          },
        }
      );

    return response
      .data
      .library;
  };


export const fetchApplicantAnalytics =
  async (
    query:
      ApplicantSearchQuery = {}
  ): Promise<
    ApplicantRecruitmentAnalytics
  > => {
    const response =
      await apiClient.get(
        "/applicants/analytics",
        {
          params: {
            q:
              query.q,

            from:
              query.appliedFrom,

            to:
              query.appliedTo,

            status:
              query.status,

            positionTrack:
              query.positionTrack,

            positionType:
              query.positionType,

            country:
              query.country,

            city:
              query.city,

            source:
              query.source,

            skill:
              query.skill,

            tag:
              query.tag,

            archived:
              query.archived ||
              "false",
          },
        }
      );

    return response
      .data
      .analytics;
  };


export const fetchApplicantPipeline =
  async (): Promise<
    ApplicantPipelineDefinition
  > => {
    const response =
      await apiClient.get(
        "/applicants/pipeline"
      );

    return response.data.pipeline;
  };


export const updateApplicantProfile = async (
  id: string,
  changes: ApplicantProfileChanges
) => {
  const response =
    await apiClient.patch(
      `/applicants/${id}/profile`,
      {
        changes,
      }
    );

  return response.data.result;
};

export const updateApplicantStatus = async (
  id: string,
  status: ApplicantStatus
) => {
  const response =
    await apiClient.patch(
      `/applicants/${id}/status`,
      {
        status,
      }
    );

  return response.data.result;
};

export const archiveApplicant = async (
  id: string,
  reason = ""
) => {
  const response =
    await apiClient.post(
      `/applicants/${id}/archive`,
      {
        reason,
      }
    );

  return response.data.result;
};

export const restoreApplicant = async (
  id: string
) => {
  const response =
    await apiClient.post(
      `/applicants/${id}/restore`
    );

  return response.data.result;
};


export interface ApplicantSubmissionChangedField {
  label: string;
  submissionPath: string;
  applicantPath: string;
  submittedValue: unknown;
  currentValue: unknown;
}

export type ApplicantSubmissionHistoryStatus =
  | "initial"
  | "changed"
  | "matches_current";

export interface ApplicantSubmissionComparison {
  status: ApplicantSubmissionHistoryStatus;
  changeCount: number;
  matchedFieldCount: number;
  comparedFieldCount: number;
  changedFields: ApplicantSubmissionChangedField[];
  isLatestApprovedSource: boolean;
}

export interface ApplicantSubmissionHistoryItem {
  submission: ApplicantFormSubmission;
  comparison: ApplicantSubmissionComparison;
}

export interface ApplicantSubmissionHistorySummary {
  total: number;
  changed: number;
  matchesCurrent: number;
  initial: number;
}

export interface ApplicantSubmissionHistoryResponse {
  submissions: ApplicantFormSubmission[];
  history: ApplicantSubmissionHistoryItem[];
  summary: ApplicantSubmissionHistorySummary;
}

export const fetchApplicantSubmissionHistory = async (
  id: string
): Promise<ApplicantSubmissionHistoryResponse> => {
  const response =
    await apiClient.get(
      `/applicants/${id}/submissions`
    );

  return {
    submissions:
      response.data.submissions || [],

    history:
      response.data.history || [],

    summary:
      response.data.summary || {
        total: 0,
        changed: 0,
        matchesCurrent: 0,
        initial: 0,
      },
  };
};


export const fetchApplicantSubmissions = async (
  id: string
): Promise<ApplicantFormSubmission[]> => {
  const response =
    await apiClient.get(
      `/applicants/${id}/submissions`
    );

  return response.data.submissions || [];
};

export const approveApplicantProfile = async (
  id: string,
  submissionId: string,
  fields: string[]
) => {
  const response =
    await apiClient.patch(
      `/applicants/${id}/approve-profile`,
      {
        submissionId,
        fields,
      }
    );

  return response.data.result;
};

export const linkApplicantSubmission = async (
  id: string,
  submissionId: string
) => {
  const response =
    await apiClient.post(
      `/applicants/${id}/submissions/${submissionId}/link`
    );

  return response.data.result;
};

export const checkApplicantRelationshipIntegrity = async (
  id: string
) => {
  const response =
    await apiClient.get(
      `/applicants/${id}/relationship-integrity`
    );

  return response.data.result;
};

/* =========================
   APPLICANT EVALUATION API
========================= */

export type ApplicantEvaluationRecommendation =
  | "strong_yes"
  | "yes"
  | "hold"
  | "no"
  | "strong_no";

export type ApplicantEvaluationStatus =
  | "draft"
  | "submitted";

export interface ApplicantEvaluationCriteria {
  technicalFit: number;
  relevantExperience: number;
  communication: number;
  motivationCommitment: number;
  learningPotential: number;
}

export interface ApplicantEvaluationEvaluator {
  userId: string;
  name: string;
  role: string;
}

export interface ApplicantEvaluation {
  _id: string;
  applicantId: string;
  submissionId: string;

  evaluator:
    ApplicantEvaluationEvaluator;

  criteria:
    ApplicantEvaluationCriteria;

  averageRating: number;
  weightedScore: number;

  recommendation:
    ApplicantEvaluationRecommendation;

  strengths: string;
  concerns: string;
  summary: string;

  status:
    ApplicantEvaluationStatus;

  submittedAt:
    string | null;

  createdAt?: string;
  updatedAt?: string;
}

export interface ApplicantEvaluationCreatePayload {
  submissionId: string;

  criteria:
    ApplicantEvaluationCriteria;

  recommendation:
    ApplicantEvaluationRecommendation;

  strengths?: string;
  concerns?: string;
  summary?: string;

  status?:
    ApplicantEvaluationStatus;
}

export interface ApplicantEvaluationUpdatePayload {
  criteria:
    ApplicantEvaluationCriteria;

  recommendation:
    ApplicantEvaluationRecommendation;

  strengths?: string;
  concerns?: string;
  summary?: string;
}


export const fetchApplicantEvaluations =
  async (
    applicantId: string
  ): Promise<ApplicantEvaluation[]> => {
    const response =
      await apiClient.get(
        `/applicants/${applicantId}/evaluations`
      );

    return response.data
      .evaluations || [];
  };


export const createApplicantEvaluation =
  async (
    applicantId: string,
    payload:
      ApplicantEvaluationCreatePayload
  ): Promise<ApplicantEvaluation> => {
    const response =
      await apiClient.post(
        `/applicants/${applicantId}/evaluations`,
        payload
      );

    return response.data
      .evaluation;
  };


export const updateApplicantEvaluation =
  async (
    applicantId: string,
    evaluationId: string,
    payload:
      ApplicantEvaluationUpdatePayload
  ) => {
    const response =
      await apiClient.patch(
        `/applicants/${applicantId}/evaluations/${evaluationId}`,
        payload
      );

    return response.data.result;
  };


export const submitApplicantEvaluation =
  async (
    applicantId: string,
    evaluationId: string
  ) => {
    const response =
      await apiClient.post(
        `/applicants/${applicantId}/evaluations/${evaluationId}/submit`
      );

    return response.data.result;
  };


export const reopenApplicantEvaluation =
  async (
    applicantId: string,
    evaluationId: string
  ) => {
    const response =
      await apiClient.post(
        `/applicants/${applicantId}/evaluations/${evaluationId}/reopen`
      );

    return response.data.result;
  };


export const archiveApplicantEvaluation =
  async (
    applicantId: string,
    evaluationId: string,
    reason = ""
  ) => {
    const response =
      await apiClient.delete(
        `/applicants/${applicantId}/evaluations/${evaluationId}`,
        {
          data: {
            reason,
          },
        }
      );

    return response.data.result;
  };



/* =========================
   APPLICANT CALENDAR API
========================= */

export type ApplicantCalendarSourceType =
  | "interview"
  | "task"
  | "scheduled_note"
  | "reminder";

export type ApplicantCalendarSyncStatus =
  | "not_synced"
  | "synced"
  | "error";

export interface ApplicantCalendarActor {
  userId?: string;
  name?: string;
  email?: string;
  role?: string;
}

export interface ApplicantCalendarEvent {
  id: string;
  sourceId: string;

  sourceType:
    ApplicantCalendarSourceType;

  relatedSourceType?:
    "note" | "task";

  title: string;

  applicantId: string;
  applicantName: string;

  start: string;
  end?: string | null;

  status: string;

  owner?:
    ApplicantCalendarActor;

  important?: boolean;

  timezone?: string;
  format?: string;
  location?: string;

  calendarSyncStatus:
    ApplicantCalendarSyncStatus;

  eventUrl?: string;

  description?: string;
  reminderNote?: string;
}

export interface ApplicantCalendarResponse {
  range: {
    from: string;
    to: string;
  };

  events:
    ApplicantCalendarEvent[];

  total: number;
}

export interface ApplicantCalendarQuery {
  from: string;
  to: string;

  sourceTypes?: string;
  statuses?: string;
  syncStatuses?: string;
  owner?: string;
}

export const fetchApplicantCalendarEvents =
  async (
    query:
      ApplicantCalendarQuery
  ): Promise<
    ApplicantCalendarResponse
  > => {
    const response =
      await apiClient.get(
        "/applicants/calendar/events",
        {
          params: {
            from:
              query.from,

            to:
              query.to,

            sourceTypes:
              query.sourceTypes ||
              undefined,

            statuses:
              query.statuses ||
              undefined,

            syncStatuses:
              query.syncStatuses ||
              undefined,

            owner:
              query.owner ||
              undefined,
          },
        }
      );

    return {
      range:
        response.data.range,

      events:
        response.data.events ||
        [],

      total:
        Number(
          response.data.total ||
          0
        ),
    };
  };


/* =========================
   APPLICANT INTERVIEW API
========================= */

export type ApplicantInterviewType =
  | "screening"
  | "hr"
  | "technical"
  | "behavioral"
  | "managerial"
  | "final"
  | "other";

export type ApplicantInterviewStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "no_show";

export type ApplicantInterviewFormat =
  | "online"
  | "onsite"
  | "phone";

export type ApplicantInterviewMeetingProvider =
  | "google_meet"
  | "zoom"
  | "microsoft_teams";


export type ApplicantInterviewMeetingStatus =
  | "not_required"
  | "pending"
  | "created"
  | "error"
  | "cancelled";


export interface ApplicantInterviewMeeting {
  provider:
    | "none"
    | ApplicantInterviewMeetingProvider;

  status:
    ApplicantInterviewMeetingStatus;

  providerMeetingId?: string;
  providerEventId?: string;

  joinUrl?: string;

  lastSyncedAt?:
    string | null;

  syncError?: string;
}


export type ApplicantInterviewOutcome =
  | "pending"
  | "recommended"
  | "not_recommended"
  | "on_hold";

export type ApplicantInterviewParticipantType =
  | "applicant"
  | "interviewer"
  | "organizer"
  | "guest";


export interface ApplicantInterviewParticipant {
  userId?: string;
  name: string;
  email?: string;

  participantType?:
    ApplicantInterviewParticipantType;

  role?: string;
}

export interface ApplicantInterviewActor {
  userId: string;
  name: string;
  email?: string;
  role: string;
}

export interface ApplicantInterview {
  _id: string;

  applicantId: string;
  submissionId?: string | null;

  type: ApplicantInterviewType;
  status: ApplicantInterviewStatus;

  scheduledStart: string;
  scheduledEnd: string;

  timezone: string;

  format:
    ApplicantInterviewFormat;

  meeting:
    ApplicantInterviewMeeting;

  /*
   * Legacy/read-only compatibility.
   * New meeting URLs are generated by
   * provider integrations.
   */
  meetingLink: string;

  location: string;

  participants:
    ApplicantInterviewParticipant[];

  organizer:
    ApplicantInterviewActor;

  outcome:
    ApplicantInterviewOutcome;

  feedback: string;
  notes: string;

  completedAt:
    string | null;

  cancelledAt:
    string | null;

  cancellationReason:
    string;

  archived: boolean;
  archivedAt:
    string | null;
  archivedBy: string;
  archiveReason: string;

  createdBy:
    ApplicantInterviewActor;

  createdAt?: string;
  updatedAt?: string;
}

export interface ApplicantInterviewCreatePayload {
  submissionId?: string | null;

  type:
    ApplicantInterviewType;

  scheduledStart: string;
  scheduledEnd: string;

  timezone?: string;

  format?:
    ApplicantInterviewFormat;

  meetingProvider?:
    ApplicantInterviewMeetingProvider;

  location?: string;

  participants:
    ApplicantInterviewParticipant[];

  notes?: string;
}

export interface ApplicantInterviewUpdatePayload {
  type?:
    ApplicantInterviewType;

  scheduledStart?: string;
  scheduledEnd?: string;

  timezone?: string;

  format?:
    ApplicantInterviewFormat;

  meetingProvider?:
    ApplicantInterviewMeetingProvider;

  location?: string;

  participants?:
    ApplicantInterviewParticipant[];

  notes?: string;
}

export type ApplicantInterviewAvailabilityStatus =
  | "busy"
  | "available"
  | "omah_available";


export interface ApplicantInterviewAvailabilityConflict {
  interviewId: string;
  applicantId: string;
  type: string;

  scheduledStart: string;
  scheduledEnd: string;

  matchedPeople: Array<{
    userId?: string;
    name?: string;
    email?: string;
    role?: string;
  }>;
}


export interface ApplicantInterviewAvailability {
  status:
    ApplicantInterviewAvailabilityStatus;

  available: boolean;
  fullyChecked: boolean;

  scheduledStart: string;
  scheduledEnd: string;
  timezone: string;

  calendarsRequested: string[];

  local: {
    available: boolean;

    conflicts:
      ApplicantInterviewAvailabilityConflict[];
  };

  google: {
    enabled: boolean;
    configured: boolean;
    checked: boolean;

    reason?: string;

    busy: Array<{
      calendarId: string;
      start: string;
      end: string;
    }>;

    errors: Array<
      Record<string, unknown>
    >;

    calendars:
      Record<string, unknown>;
  };
}


export interface ApplicantInterviewAvailabilityPayload {
  scheduledStart: string;
  scheduledEnd: string;

  timezone?: string;

  participants?:
    ApplicantInterviewParticipant[];

  calendarIds?: string[];

  excludeInterviewId?:
    string | null;
}


export interface ApplicantInterviewCompletePayload {
  outcome?:
    ApplicantInterviewOutcome;

  feedback?: string;
  notes?: string;
}


export type ApplicantInterviewMeetingProviderRuntimeStatus =
  | "setup_required"
  | "read_only"
  | "ready"
  | "not_implemented";


export interface ApplicantInterviewMeetingProviderStatus {
  provider:
    ApplicantInterviewMeetingProvider;

  label: string;

  implemented: boolean;
  enabled: boolean;
  configured: boolean;
  writeEnabled: boolean;

  readyForScheduling: boolean;

  status:
    ApplicantInterviewMeetingProviderRuntimeStatus;

  missing: string[];
}


export const fetchApplicantInterviewMeetingProviders =
  async (): Promise<
    ApplicantInterviewMeetingProviderStatus[]
  > => {
    const response =
      await apiClient.get(
        "/applicants/interviews/providers"
      );

    return (
      response.data.providers ||
      []
    );
  };


export const checkApplicantInterviewAvailability =
  async (
    applicantId: string,
    payload:
      ApplicantInterviewAvailabilityPayload
  ): Promise<ApplicantInterviewAvailability> => {
    const response =
      await apiClient.post(
        `/applicants/${applicantId}/interviews/availability`,
        payload
      );

    return response.data.availability;
  };


export const fetchApplicantInterviews =
  async (
    applicantId: string,
    includeArchived = false
  ): Promise<ApplicantInterview[]> => {
    const response =
      await apiClient.get(
        `/applicants/${applicantId}/interviews`,
        {
          params: {
            includeArchived,
          },
        }
      );

    return (
      response.data.interviews ||
      []
    );
  };


export const createApplicantInterview =
  async (
    applicantId: string,
    payload:
      ApplicantInterviewCreatePayload
  ): Promise<ApplicantInterview> => {
    const response =
      await apiClient.post(
        `/applicants/${applicantId}/interviews`,
        payload
      );

    return response.data.interview;
  };


export const updateApplicantInterview =
  async (
    applicantId: string,
    interviewId: string,
    payload:
      ApplicantInterviewUpdatePayload
  ): Promise<ApplicantInterview> => {
    const response =
      await apiClient.patch(
        `/applicants/${applicantId}/interviews/${interviewId}`,
        payload
      );

    return response.data.interview;
  };


export const completeApplicantInterview =
  async (
    applicantId: string,
    interviewId: string,
    payload:
      ApplicantInterviewCompletePayload
  ): Promise<ApplicantInterview> => {
    const response =
      await apiClient.post(
        `/applicants/${applicantId}/interviews/${interviewId}/complete`,
        payload
      );

    return response.data.interview;
  };


export const cancelApplicantInterview =
  async (
    applicantId: string,
    interviewId: string,
    reason = ""
  ): Promise<ApplicantInterview> => {
    const response =
      await apiClient.post(
        `/applicants/${applicantId}/interviews/${interviewId}/cancel`,
        {
          reason,
        }
      );

    return response.data.interview;
  };


export const markApplicantInterviewNoShow =
  async (
    applicantId: string,
    interviewId: string,
    notes = ""
  ): Promise<ApplicantInterview> => {
    const response =
      await apiClient.post(
        `/applicants/${applicantId}/interviews/${interviewId}/no-show`,
        {
          notes,
        }
      );

    return response.data.interview;
  };


export const archiveApplicantInterview =
  async (
    applicantId: string,
    interviewId: string,
    reason = ""
  ): Promise<ApplicantInterview> => {
    const response =
      await apiClient.delete(
        `/applicants/${applicantId}/interviews/${interviewId}`,
        {
          data: {
            reason,
          },
        }
      );

    return response.data.interview;
  };




/*
|--------------------------------------------------------------------------
| Permanently Delete Applicant
|--------------------------------------------------------------------------
|
| Requires an archived Applicant and exact DELETE confirmation.
|
*/
export const permanentlyDeleteApplicant = async (
  id: string
) => {
  const response =
    await apiClient.delete(
      `/applicants/${id}/permanent`,
      {
        data: {
          confirmation:
            "DELETE",
        },
      }
    );

  return response.data.result;
};


export const permanentlyDeleteApplicantInterview =
  async (
    applicantId: string,
    interviewId: string
  ): Promise<{
    deleted: boolean;
    interviewId: string;
  }> => {
    const response =
      await apiClient.delete(
        `/applicants/${applicantId}/interviews/${interviewId}/permanent`
      );

    return response.data.result;
  };


/* =========================
   APPLICANT ACTIVITY
========================= */

export interface ApplicantActivityActor {
  userId: string;
  name: string;
  email: string;
  role: string;
}

export interface ApplicantActivitySource {
  type: string;
  id: string;
}

export interface ApplicantActivityEvent {
  id: string;
  type: string;
  category: string;
  title: string;
  description: string;
  occurredAt: string;

  actor: ApplicantActivityActor;
  source: ApplicantActivitySource;

  metadata: Record<
    string,
    unknown
  >;
}

export interface ApplicantActivityResponse {
  events:
    ApplicantActivityEvent[];

  total: number;
  limit: number;

  filters: {
    category: string;
    type: string;
  };
}

export interface ApplicantActivityQuery {
  category?: string;
  type?: string;
  limit?: number;
}

export const fetchApplicantActivity =
  async (
    applicantId: string,
    query:
      ApplicantActivityQuery = {}
  ): Promise<ApplicantActivityResponse> => {
    const response =
      await apiClient.get(
        `/applicants/${applicantId}/activity`,
        {
          params: query,
        }
      );

    return {
      events:
        response.data.events ||
        [],

      total:
        response.data.total ||
        0,

      limit:
        response.data.limit ||
        100,

      filters:
        response.data.filters ||
        {
          category: "",
          type: "",
        },
    };
  };


/* =========================
   APPLICANT COMMUNICATIONS
========================= */

export interface ApplicantCommunicationProviders {
  email: {
    provider: string;
    ready: boolean;
  };

  whatsapp: {
    provider: string;
    enabled: boolean;
    configured: boolean;
    ready: boolean;
  };
}

export const fetchApplicantCommunicationProviders =
  async (): Promise<ApplicantCommunicationProviders> => {
    const response =
      await apiClient.get(
        "/applicants/communications/providers"
      );

    return response.data.providers;
  };


export interface ApplicantEmailPayload {
  subject: string;
  body: string;
}

export interface ApplicantEmailResult {
  sent: boolean;
  applicantId: string;

  recipient: {
    name: string;
    email: string;
  };
}

export const sendApplicantEmail =
  async (
    applicantId: string,
    payload:
      ApplicantEmailPayload
  ): Promise<ApplicantEmailResult> => {
    const response =
      await apiClient.post(
        `/applicants/${applicantId}/communications/email`,
        payload
      );

    return response.data.result;
  };


export interface ApplicantWhatsAppPayload {
  message: string;
}

export interface ApplicantWhatsAppResult {
  sent: boolean;
  provider: string;
  applicantId: string;

  recipient: {
    name: string;
    whatsappNumber: string;
  };

  messageId: string;
}

export const sendApplicantWhatsApp =
  async (
    applicantId: string,
    payload:
      ApplicantWhatsAppPayload
  ): Promise<ApplicantWhatsAppResult> => {
    const response =
      await apiClient.post(
        `/applicants/${applicantId}/communications/whatsapp`,
        payload
      );

    return response.data.result;
  };


/* =========================
   DEVELOPER TOOLS API
========================= */
export interface DbSummary {
  users: number;
  posts: number;
  companies: number;
  jobs: number;
  applications: number;
  reports: number;
  conversations: number;
  calls: number;
  emails: number;
  notifications: number;
}

export const fetchDbSummary = async (): Promise<DbSummary> => {
  const response = await apiClient.get('/dev/db-summary');
  return response.data.summary;
};

/* =========================
   APPLICANT DOCUMENT MANAGEMENT API
========================= */

export type ApplicantDocumentType =
  | "cv"
  | "cover_letter"
  | "certificate"
  | "transcript"
  | "portfolio"
  | "identity_document"
  | "other";

export type ApplicantDocumentStorageProvider =
  | "external"
  | "local"
  | "s3";

export interface ApplicantDocument {
  _id: string;
  applicantId: string;
  documentGroupId: string;
  documentType: ApplicantDocumentType;
  title: string;
  version: number;
  isCurrent: boolean;

  file: {
    originalFileName: string;
    storedFileName?: string;
    mimeType: string;
    sizeBytes: number;
    checksumSha256?: string;
  };

  storage: {
    provider: ApplicantDocumentStorageProvider;
    key?: string;
    externalUrl?: string;
  };

  source:
    | "admin_upload"
    | "form_submission"
    | "legacy_import";

  sourceSubmissionId?: string | null;

  uploadedBy: string;
  uploadedAt: string;

  lifecycle: {
    archived: boolean;
    archivedAt: string | null;
    archivedBy: string;
    archiveReason: string;
  };

  createdAt?: string;
  updatedAt?: string;
}

export interface ApplicantDocumentUploadInput {
  documentType: ApplicantDocumentType;
  title?: string;
  file: File;
}

export const fetchApplicantDocuments = async (
  applicantId: string,
  includeArchived = false
): Promise<ApplicantDocument[]> => {
  const response = await apiClient.get(
    `/applicants/${applicantId}/documents`,
    {
      params: {
        includeArchived,
      },
    }
  );

  return response.data.documents || [];
};

export const uploadApplicantDocument = async (
  applicantId: string,
  input: ApplicantDocumentUploadInput
): Promise<ApplicantDocument> => {
  const formData = new FormData();

  formData.append(
    "documentType",
    input.documentType
  );

  if (input.title) {
    formData.append(
      "title",
      input.title
    );
  }

  formData.append(
    "file",
    input.file
  );

  const response = await apiClient.post(
    `/applicants/${applicantId}/documents`,
    formData
  );

  return response.data.document;
};

export const uploadApplicantDocumentVersion = async (
  applicantId: string,
  documentId: string,
  file: File,
  title?: string
): Promise<ApplicantDocument> => {
  const formData = new FormData();

  if (title) {
    formData.append(
      "title",
      title
    );
  }

  formData.append(
    "file",
    file
  );

  const response = await apiClient.post(
    `/applicants/${applicantId}/documents/${documentId}/versions`,
    formData
  );

  return response.data.document;
};

export const fetchApplicantDocumentVersions = async (
  applicantId: string,
  documentId: string
): Promise<ApplicantDocument[]> => {
  const response = await apiClient.get(
    `/applicants/${applicantId}/documents/${documentId}/versions`
  );

  return response.data.versions || [];
};

export const setApplicantDocumentCurrent = async (
  applicantId: string,
  documentId: string
): Promise<ApplicantDocument> => {
  const response = await apiClient.post(
    `/applicants/${applicantId}/documents/${documentId}/current`
  );

  return response.data.document;
};

export const archiveApplicantDocumentRecord = async (
  applicantId: string,
  documentId: string,
  reason = ""
): Promise<{
  archived: boolean;
}> => {
  const response = await apiClient.post(
    `/applicants/${applicantId}/documents/${documentId}/archive`,
    {
      reason,
    }
  );

  return response.data.result;
};

export const restoreApplicantDocumentRecord = async (
  applicantId: string,
  documentId: string
): Promise<{
  restored: boolean;
  isCurrent: boolean;
}> => {
  const response = await apiClient.post(
    `/applicants/${applicantId}/documents/${documentId}/restore`
  );

  return response.data.result;
};

export const applicantDocumentDownloadUrl = (
  applicantId: string,
  documentId: string
): string => {
  /*
   * This URL is used by window.open()/normal browser
   * navigation, not by Axios.
   *
   * Therefore it must include the configured backend
   * origin. A relative /api URL would be resolved
   * against the frontend Vite/dashboard origin.
   */
  const apiBaseUrl =
    (
      import.meta.env.VITE_API_URL ||
      "http://localhost:5000/api"
    ).replace(/\/+$/, "");

  return `${apiBaseUrl}/applicants/${encodeURIComponent(
    applicantId
  )}/documents/${encodeURIComponent(
    documentId
  )}/download`;
};

export const fetchApplicantDocumentBlob = async (
  applicantId: string,
  documentId: string
): Promise<Blob> => {
  const response = await apiClient.get(
    `/applicants/${encodeURIComponent(
      applicantId
    )}/documents/${encodeURIComponent(
      documentId
    )}/download`,
    {
      responseType: "blob",
    }
  );

  return response.data as Blob;
};

export const downloadApplicantDocumentFile = async (
  applicantId: string,
  documentId: string,
  fileName: string
): Promise<void> => {
  /*
   * Always navigate through the protected backend
   * document endpoint instead of fetching a Blob
   * through Axios.
   *
   * Why:
   * - local  -> backend returns the file
   * - s3     -> backend redirects to signed URL
   * - external -> backend redirects to original URL
   *
   * Browser navigation can safely follow cross-origin
   * redirects without the CORS failure caused by an
   * XMLHttpRequest / Axios Blob request.
   */
  const link =
    window.document.createElement("a");

  link.href =
    applicantDocumentDownloadUrl(
      applicantId,
      documentId
    );

  link.download =
    fileName || "document";

  link.target =
    "_blank";

  link.rel =
    "noopener noreferrer";

  window.document.body.appendChild(
    link
  );

  link.click();
  link.remove();
};



/* =========================
   APPLICANT INTERNAL NOTES,
   TASKS & TAGS
========================= */

export type ApplicantInternalNoteKind =
  | "note"
  | "task";

export type ApplicantInternalTaskStatus =
  | "todo"
  | "completed";


export interface ApplicantInternalNoteActor {
  userId: string;
  name: string;
  email: string;
  role: string;
}


export interface ApplicantInternalNoteSchedule {
  startAt?: string | null;
  endAt?: string | null;
  reminderAt?: string | null;
  reminderNote?: string;
}


export interface ApplicantInternalNoteCalendar {
  provider?: "" | "google_calendar";

  eventId?: string;
  eventUrl?: string;

  syncStatus?:
    | "not_synced"
    | "synced"
    | "error";

  syncedAt?: string | null;
  syncError?: string;
}


export interface ApplicantInternalNote {
  _id: string;
  applicantId: string;

  /*
   * Optional for backwards compatibility
   * with pre-workflow records.
   */
  kind?:
    ApplicantInternalNoteKind;

  content: string;

  taskStatus?:
    ApplicantInternalTaskStatus;

  important?: boolean;

  likedBy?: string[];
  starredBy?: string[];

  schedule?:
    ApplicantInternalNoteSchedule;

  calendar?:
    ApplicantInternalNoteCalendar;

  author:
    ApplicantInternalNoteActor;

  updatedBy?:
    ApplicantInternalNoteActor;

  completedAt?: string | null;

  completedBy?:
    ApplicantInternalNoteActor;

  archived: boolean;
  archivedAt?: string | null;

  archivedBy?:
    ApplicantInternalNoteActor;

  createdAt?: string;
  updatedAt?: string;
}


export interface ApplicantInternalNoteReply {
  _id: string;

  applicantId: string;
  noteId: string;

  content: string;

  author:
    ApplicantInternalNoteActor;

  updatedBy?:
    ApplicantInternalNoteActor;

  archived: boolean;
  archivedAt?: string | null;

  archivedBy?:
    ApplicantInternalNoteActor;

  createdAt?: string;
  updatedAt?: string;
}


export interface ApplicantInternalNoteCreateOptions {
  kind?:
    ApplicantInternalNoteKind;

  important?: boolean;

  schedule?:
    ApplicantInternalNoteSchedule;
}


export const fetchApplicantInternalNotes =
  async (
    applicantId:
      string,

    options: {
      includeArchived?: boolean;
    } = {}
  ): Promise<
    ApplicantInternalNote[]
  > => {
    const response =
      await apiClient.get(
        `/applicants/${applicantId}/notes`,
        {
          params: {
            includeArchived:
              options.includeArchived ===
              true
                ? "true"
                : undefined,
          },
        }
      );

    return response.data.notes;
  };


export const createApplicantInternalNote =
  async (
    applicantId:
      string,

    content:
      string,

    options:
      ApplicantInternalNoteCreateOptions =
      {}
  ): Promise<
    ApplicantInternalNote
  > => {
    const response =
      await apiClient.post(
        `/applicants/${applicantId}/notes`,
        {
          content,

          kind:
            options.kind,

          important:
            options.important,

          schedule:
            options.schedule,
        }
      );

    return response.data.note;
  };


export const updateApplicantInternalNote =
  async (
    applicantId:
      string,

    noteId:
      string,

    content:
      string
  ): Promise<
    ApplicantInternalNote
  > => {
    const response =
      await apiClient.patch(
        `/applicants/${applicantId}/notes/${noteId}`,
        {
          content,
        }
      );

    return response.data.note;
  };


/*
 * Legacy compatibility operation.
 *
 * The existing Notes UI currently uses
 * DELETE /notes/:noteId as a soft archive.
 *
 * The richer UI will migrate to the explicit
 * archive/restore functions below.
 */
export const deleteApplicantInternalNote =
  async (
    applicantId:
      string,

    noteId:
      string
  ) => {
    const response =
      await apiClient.delete(
        `/applicants/${applicantId}/notes/${noteId}`
      );

    return response.data.result;
  };


export const archiveApplicantInternalNote =
  async (
    applicantId:
      string,

    noteId:
      string
  ): Promise<
    ApplicantInternalNote
  > => {
    const response =
      await apiClient.post(
        `/applicants/${applicantId}/notes/${noteId}/archive`
      );

    return response.data.note;
  };


export const restoreApplicantInternalNote =
  async (
    applicantId:
      string,

    noteId:
      string
  ): Promise<
    ApplicantInternalNote
  > => {
    const response =
      await apiClient.post(
        `/applicants/${applicantId}/notes/${noteId}/restore`
      );

    return response.data.note;
  };


export const permanentlyDeleteApplicantInternalNote =
  async (
    applicantId:
      string,

    noteId:
      string,

    confirmation:
      "DELETE"
  ) => {
    const response =
      await apiClient.delete(
        `/applicants/${applicantId}/notes/${noteId}/permanent`,
        {
          data: {
            confirmation,
          },
        }
      );

    return response.data.result;
  };


export const setApplicantInternalNoteImportance =
  async (
    applicantId:
      string,

    noteId:
      string,

    important:
      boolean
  ): Promise<
    ApplicantInternalNote
  > => {
    const response =
      await apiClient.patch(
        `/applicants/${applicantId}/notes/${noteId}/importance`,
        {
          important,
        }
      );

    return response.data.note;
  };


export const setApplicantInternalNoteLike =
  async (
    applicantId:
      string,

    noteId:
      string,

    liked:
      boolean
  ): Promise<
    ApplicantInternalNote
  > => {
    const response =
      await apiClient.patch(
        `/applicants/${applicantId}/notes/${noteId}/like`,
        {
          liked,
        }
      );

    return response.data.note;
  };


export const setApplicantInternalNoteStar =
  async (
    applicantId:
      string,

    noteId:
      string,

    starred:
      boolean
  ): Promise<
    ApplicantInternalNote
  > => {
    const response =
      await apiClient.patch(
        `/applicants/${applicantId}/notes/${noteId}/star`,
        {
          starred,
        }
      );

    return response.data.note;
  };


export const setApplicantInternalTaskStatus =
  async (
    applicantId:
      string,

    noteId:
      string,

    taskStatus:
      ApplicantInternalTaskStatus
  ): Promise<
    ApplicantInternalNote
  > => {
    const response =
      await apiClient.patch(
        `/applicants/${applicantId}/notes/${noteId}/task-status`,
        {
          taskStatus,
        }
      );

    return response.data.note;
  };


export const updateApplicantInternalNoteSchedule =
  async (
    applicantId:
      string,

    noteId:
      string,

    schedule:
      ApplicantInternalNoteSchedule
  ): Promise<
    ApplicantInternalNote
  > => {
    const response =
      await apiClient.patch(
        `/applicants/${applicantId}/notes/${noteId}/schedule`,
        {
          schedule,
        }
      );

    return response.data.note;
  };



export const addApplicantInternalNoteToCalendar =
  async (
    applicantId:
      string,

    noteId:
      string,

    timezone:
      string
  ): Promise<
    ApplicantInternalNote
  > => {
    const response =
      await apiClient.post(
        `/applicants/${applicantId}/notes/${noteId}/calendar`,
        {
          timezone,
        }
      );

    return response.data.note;
  };


export const updateApplicantInternalNoteCalendar =
  async (
    applicantId:
      string,

    noteId:
      string,

    timezone:
      string
  ): Promise<
    ApplicantInternalNote
  > => {
    const response =
      await apiClient.patch(
        `/applicants/${applicantId}/notes/${noteId}/calendar`,
        {
          timezone,
        }
      );

    return response.data.note;
  };


export const removeApplicantInternalNoteFromCalendar =
  async (
    applicantId:
      string,

    noteId:
      string
  ): Promise<
    ApplicantInternalNote
  > => {
    const response =
      await apiClient.delete(
        `/applicants/${applicantId}/notes/${noteId}/calendar`
      );

    return response.data.note;
  };


export const fetchApplicantInternalNoteReplies =
  async (
    applicantId:
      string,

    noteId:
      string,

    options: {
      includeArchived?: boolean;
    } = {}
  ): Promise<
    ApplicantInternalNoteReply[]
  > => {
    const response =
      await apiClient.get(
        `/applicants/${applicantId}/notes/${noteId}/replies`,
        {
          params: {
            includeArchived:
              options.includeArchived ===
              true
                ? "true"
                : undefined,
          },
        }
      );

    return response.data.replies;
  };


export const createApplicantInternalNoteReply =
  async (
    applicantId:
      string,

    noteId:
      string,

    content:
      string
  ): Promise<
    ApplicantInternalNoteReply
  > => {
    const response =
      await apiClient.post(
        `/applicants/${applicantId}/notes/${noteId}/replies`,
        {
          content,
        }
      );

    return response.data.reply;
  };


export const updateApplicantInternalNoteReply =
  async (
    applicantId:
      string,

    noteId:
      string,

    replyId:
      string,

    content:
      string
  ): Promise<
    ApplicantInternalNoteReply
  > => {
    const response =
      await apiClient.patch(
        `/applicants/${applicantId}/notes/${noteId}/replies/${replyId}`,
        {
          content,
        }
      );

    return response.data.reply;
  };


export const archiveApplicantInternalNoteReply =
  async (
    applicantId:
      string,

    noteId:
      string,

    replyId:
      string
  ): Promise<
    ApplicantInternalNoteReply
  > => {
    const response =
      await apiClient.post(
        `/applicants/${applicantId}/notes/${noteId}/replies/${replyId}/archive`
      );

    return response.data.reply;
  };


export const restoreApplicantInternalNoteReply =
  async (
    applicantId:
      string,

    noteId:
      string,

    replyId:
      string
  ): Promise<
    ApplicantInternalNoteReply
  > => {
    const response =
      await apiClient.post(
        `/applicants/${applicantId}/notes/${noteId}/replies/${replyId}/restore`
      );

    return response.data.reply;
  };


export const permanentlyDeleteApplicantInternalNoteReply =
  async (
    applicantId:
      string,

    noteId:
      string,

    replyId:
      string,

    confirmation:
      "DELETE"
  ) => {
    const response =
      await apiClient.delete(
        `/applicants/${applicantId}/notes/${noteId}/replies/${replyId}/permanent`,
        {
          data: {
            confirmation,
          },
        }
      );

    return response.data.result;
  };


export const updateApplicantTags =
  async (
    applicantId:
      string,

    tags:
      string[]
  ): Promise<{
    status: string;
    applicantId: string;
    previousTags: string[];
    tags: string[];
    changedAt: string;
  }> => {
    const response =
      await apiClient.put(
        `/applicants/${applicantId}/tags`,
        {
          tags,
        }
      );

    return response.data.result;
  };
