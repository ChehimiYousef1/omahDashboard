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
  | "interview"
  | "hired"
  | "rejected";

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
