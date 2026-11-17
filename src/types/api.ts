export type UserRole =
  | 'SUPER_OWNER'
  | 'SCHOOL_ADMIN'
  | 'PRINCIPAL'
  | 'TEACHER'
  | 'COUNSELOR'
  | 'STUDENT'
  | 'PARENT'

export type ModuleKey = 'LMS' | 'CBT_GRADING'

export interface TenantBranding {
  tenantId: string
  schoolName: string
  slug: string
  appName: string
  logoUrl: string
  primaryColor: string
  secondaryColor: string
}

export interface UpdateBrandingDto {
  appName: string
  logoUrl: string
  primaryColor: string
  secondaryColor: string
}

export interface LoginDto {
  email: string
  password: string
  tenantSlug: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface UserProfile {
  id: string
  userId?: string
  email: string
  fullName: string
  role: UserRole
  tenantId: string
}

export interface AuthResponse {
  tokens: AuthTokens
  user: UserProfile
}

export interface ChangePasswordDto {
  oldPassword: string
  newPassword: string
}

export type HomeBlockKey =
  | 'HERO_BANNER'
  | 'GLOBAL_PROGRAMS'
  | 'TOP_SCHOLARSHIPS'
  | 'CAREER_STATS'
  | 'CONSULTATION_CTA'

export interface HomeLayoutConfig {
  tenantId: string
  schemaVersion: number
  homeBlocks: HomeBlockKey[]
  bannerActive: boolean
  featuresToggle: {
    showConsultation: boolean
    showScholarships: boolean
  }
}

export interface UpdateHomeLayoutDto {
  homeBlocks: HomeBlockKey[]
  bannerActive: boolean
  featuresToggle: {
    showConsultation: boolean
    showScholarships: boolean
  }
}

export type SduiBlockType =
  | 'HERO_BLOCK'
  | 'STATS_BLOCK'
  | 'ICON_GRID_BLOCK'
  | 'RICH_TEXT_BLOCK'

export interface HeroBlockContent {
  schema_version: 1
  badgeText?: string
  headline: string
  subheadline?: string
  ctaText: string
  ctaUrl: string
  imageUrl?: string
}

export interface StatsBlockContent {
  schema_version: 1
  title?: string
  items: Array<{
    value: string
    label: string
    description?: string
  }>
}

export interface IconGridBlockContent {
  schema_version: 1
  title?: string
  items: Array<{
    icon: string
    title: string
    description: string
    actionUrl?: string
  }>
}

export interface RichTextBlockContent {
  schema_version: 1
  body: string
  alignment?: 'left' | 'center' | 'right'
}

export type SduiBlockContent =
  | HeroBlockContent
  | StatsBlockContent
  | IconGridBlockContent
  | RichTextBlockContent

export interface ContentBlock {
  id: string
  programId: string
  blockType: SduiBlockType
  sortOrder: number
  content: SduiBlockContent
}

export interface CreateContentBlockDto {
  blockType: SduiBlockType
  sortOrder: number
  content: SduiBlockContent
}

export interface GlobalCountry {
  id: string
  name: string
  code: string
  region?: string
  flagEmoji?: string | null
  description?: string | null
  universityCount?: number
  scholarshipCount?: number
}

export interface GlobalUniversity {
  id: string
  name: string
  country?: string | { id: string; name: string; code: string }
  countryId?: string
  qsRanking?: number | null
  qsRank?: number | null
  city?: string | null
  websiteUrl?: string | null
  website?: string | null
  overview?: string | null
  popularMajors?: string[]
  isPartner?: boolean
}

export interface GlobalScholarship {
  id: string
  title?: string
  name?: string
  provider?: string
  country?: string | { id: string; name: string; code: string } | null
  coverage?: 'Full' | 'Partial'
  fundingType?: 'FULL' | 'PARTIAL'
  deadline?: string | null
  eligibility?: string | null
  description?: string | null
  applyUrl?: string | null
  applicationUrl?: string | null
}

export interface GlobalProgram {
  id: string
  title: string
  slug: string
  category?: string
  destination?: string
  duration?: string
  batch?: string
  summary?: string
  description?: string
  targetAudience?: string | null
  quota?: number
  startDate?: string | null
  endDate?: string | null
  bannerUrl?: string | null
  coverImageUrl?: string | null
  isGlobal?: boolean
  isTenantSpecific?: boolean
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
}

export interface ConsultationDto {
  name: string
  phone: string
  email?: string
  destinationCountry?: string
  intendedMajor?: string
  notes?: string
}

export interface ConsultationRecord extends ConsultationDto {
  id: string
  status: 'PENDING' | 'CONTACTED' | 'SCHEDULED' | 'COMPLETED'
  createdAt: string
  whatsappUrl?: string
  redirectUrl?: string
}

export interface ConsultationRegisterResponse {
  consultation?: ConsultationRecord
  whatsappUrl?: string
  redirectUrl?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

// LMS Types
export interface Course {
  id: string
  name: string
  code: string
  subject: string
  gradeLevel: string
  academicYear: string
  teacherId?: string
  teacherName?: string
  studentCount?: number
  description?: string
}

export interface CreateCourseDto {
  name: string
  code: string
  subject: string
  gradeLevel: string
  academicYear: string
  teacherId?: string
}

export type MaterialContentType = 'TEXT' | 'VIDEO_URL' | 'PDF_URL' | 'LINK' | 'VIDEO' | 'PDF'

export interface Material {
  id: string
  courseId: string
  title: string
  contentType: MaterialContentType
  contentBody?: string
  fileUrl?: string
  sortOrder: number
  createdAt?: string
}

export interface CreateMaterialDto {
  title: string
  contentType: MaterialContentType
  contentBody?: string
  fileUrl?: string
  sortOrder: number
}

export interface Assignment {
  id: string
  courseId: string
  title: string
  description: string
  dueDate: string
  maxScore: number
  submissionType: 'TEXT' | 'FILE' | 'LINK'
}

export interface CreateAssignmentDto {
  title: string
  description: string
  dueDate: string
  maxScore: number
  submissionType: 'TEXT' | 'FILE' | 'LINK'
}

export interface SubmitAssignmentDto {
  content?: string
  fileUrl?: string
}

export interface Submission {
  id: string
  assignmentId: string
  studentId: string
  studentName?: string
  studentEmail?: string
  content?: string
  fileUrl?: string
  submittedAt: string
  score?: number | null
  feedback?: string | null
  status: 'SUBMITTED' | 'GRADED' | 'LATE'
}

export interface GradeSubmissionDto {
  score: number
  feedback: string
}

// CBT & Grading Types
export interface QuestionBank {
  id: string
  title: string
  subject: string
  gradeLevel: string
  isGlobalTemplate?: boolean
  questionCount?: number
}

export interface CreateQuestionBankDto {
  title: string
  subject: string
  gradeLevel: string
}

export interface QuestionOption {
  key: string
  text: string
}

export interface Question {
  id: string
  bankId?: string
  questionType: 'MULTIPLE_CHOICE' | 'ESSAY'
  prompt: string
  options: QuestionOption[]
  answerKey?: string
  scoreWeight: number
}

export interface CreateQuestionDto {
  questionType: 'MULTIPLE_CHOICE' | 'ESSAY'
  prompt: string
  options: QuestionOption[]
  answerKey: string
  scoreWeight: number
}

export interface CbtExam {
  id: string
  courseId?: string
  title: string
  durationMinutes: number
  startTime: string
  endTime: string
  passingScore: number
  isRandomized: boolean
  questionIds?: string[]
  questions?: Question[]
  status?: 'UPCOMING' | 'ACTIVE' | 'CLOSED'
}

export interface CreateCbtExamDto {
  courseId?: string
  title: string
  durationMinutes: number
  startTime: string
  endTime: string
  passingScore: number
  isRandomized: boolean
  questionIds: string[]
}

export interface StartCbtAttemptResponse {
  attemptId: string
  examId: string
  startedAt: string
  expiresAt: string
  questions: Question[]
}

export interface SubmitCbtAttemptDto {
  answers: Record<string, string>
}

export interface SubmitCbtAttemptResponse {
  id?: string
  attemptId?: string
  score?: number
  rawScore?: number
  finalScore?: number
  maxScore?: number
  passed?: boolean
  submittedAt?: string
  finishedAt?: string
}

export interface GradeRecord {
  id: string
  studentId: string
  courseId: string
  componentType: 'ASSIGNMENT' | 'EXAM' | 'PROJECT'
  componentId: string
  score: number
  maxScore: number
  weight: number
  recordedAt: string
}

export interface StudentGradeItem {
  courseId: string
  courseName: string
  assignmentAvg: number
  cbtAvg: number
  finalScore: number
  letterGrade: string
}

export interface ReportCardRecord {
  id: string
  studentId: string
  studentName: string
  academicYear: string
  semester: number
  summaryGpa: number
  finalEvaluation: {
    sikap: string
    catatan: string
  }
  finalizedAt: string
}

export interface StudentGradeSummary {
  student: {
    id: string
    fullName: string
    email: string
    gradeLevel: string
  }
  courses: StudentGradeItem[]
  reportCard?: ReportCardRecord | null
}

export interface FinalizeReportCardDto {
  studentId: string
  academicYear: string
  semester: number
  summaryGpa: number
  finalEvaluation: {
    sikap: string
    catatan: string
  }
}

// Academic Classes & Attendance Types
export type AttendanceStatus = 'PRESENT' | 'LATE' | 'SICK' | 'PERMIT' | 'ABSENT'
export type AttendanceSessionType = 'DAILY' | 'SUBJECT'

export interface SchoolClass {
  id: string
  name: string
  gradeLevel: string
  academicYear: string
  homeroomTeacherId?: string | null
  homeroomTeacherName?: string | null
  studentCount?: number
}

export interface CreateSchoolClassDto {
  name: string
  gradeLevel: string
  academicYear: string
  homeroomTeacherId?: string
}

export interface ClassStudentItem {
  studentId: string
  fullName: string
  email: string
  userStatus?: string
  enrolledAt: string
}

export interface ClassStudentsResponse {
  class: SchoolClass
  students: ClassStudentItem[]
}

export interface EnrollClassStudentsDto {
  studentIds: string[]
}

export interface EnrollClassStudentsResponse {
  classId: string
  enrolledCount: number
  skippedCount: number
}

export interface StudentAttendanceRecordInput {
  studentId: string
  status: AttendanceStatus
  notes?: string
}

export interface RecordBulkAttendanceDto {
  date: string
  classId?: string
  courseId?: string
  sessionType: AttendanceSessionType
  records: StudentAttendanceRecordInput[]
}

export interface ClassAttendanceStudentRow {
  studentId: string
  fullName: string
  email: string
  attendanceId?: string | null
  status?: AttendanceStatus | null
  notes?: string | null
  checkInAt?: string | null
  recordedBy?: string | null
}

export interface ClassAttendanceResponse {
  class: SchoolClass
  date: string
  sessionType: AttendanceSessionType
  students: ClassAttendanceStudentRow[]
}

export interface AttendanceSummary {
  total: number
  present: number
  late: number
  sick: number
  permit: number
  absent: number
  attendanceRate: number
}

export interface AttendanceHistoryRecord {
  id: string
  studentId: string
  classId?: string | null
  courseId?: string | null
  attendanceDate: string
  sessionType: AttendanceSessionType
  status: AttendanceStatus
  notes?: string | null
  checkInAt?: string | null
}

export interface StudentAttendanceResponse {
  studentId: string
  summary: AttendanceSummary
  records: AttendanceHistoryRecord[]
}

export interface ChildAttendanceItem {
  studentId: string
  fullName: string | null
  email: string | null
  summary: AttendanceSummary
  records: AttendanceHistoryRecord[]
}

export interface ChildrenAttendanceResponse {
  children: ChildAttendanceItem[]
}

