export interface ICertificate {
  id: string; // e.g. RS-2026-SE-02984
  studentId: string | number;
  studentName: string;
  courseId: string | number;
  courseTitle: string;
  category?: string;
  score: number; // percentage (>= 80)
  issueDate: string; // e.g. "06 Sep 2026"
  completionDate: string; // e.g. "29 May 2025"
  instructorName?: string;
  signatoryName?: string;
  createdAt: string;
}

const STORAGE_KEY = 'lms:student_certificates';

function generateCertificateId(courseId: string | number): string {
  const year = new Date().getFullYear();
  const randomDigits = Math.floor(10000 + Math.random() * 90000);
  const cleanCourse = String(courseId).replace(/[^0-9]/g, '').slice(0, 2) || '01';
  return `RS-${year}-SE-${cleanCourse}${randomDigits}`.slice(0, 16);
}

function formatDate(date: Date): string {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export const certificateService = {
  getAllCertificates(): ICertificate[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  getStudentCertificates(studentId?: string | number): ICertificate[] {
    const list = this.getAllCertificates();
    if (!studentId) return list;
    return list.filter((c) => String(c.studentId) === String(studentId));
  },

  getCertificateByCourse(studentId: string | number, courseId: string | number): ICertificate | null {
    const list = this.getStudentCertificates(studentId);
    return list.find((c) => String(c.courseId) === String(courseId)) || null;
  },

  issueCertificate(payload: {
    studentId: string | number;
    studentName: string;
    courseId: string | number;
    courseTitle: string;
    category?: string;
    score: number;
    instructorName?: string;
    signatoryName?: string;
  }): ICertificate {
    const existing = this.getCertificateByCourse(payload.studentId, payload.courseId);
    if (existing) {
      // If student achieved higher score on retake, update the score
      if (payload.score > existing.score) {
        existing.score = payload.score;
        this.saveCertificate(existing);
      }
      return existing;
    }

    const now = new Date();
    const formattedDate = formatDate(now);

    const newCertificate: ICertificate = {
      id: generateCertificateId(payload.courseId),
      studentId: payload.studentId,
      studentName: payload.studentName || 'Student',
      courseId: payload.courseId,
      courseTitle: payload.courseTitle || 'Course',
      category: payload.category || 'Skill Development',
      score: payload.score,
      issueDate: formattedDate,
      completionDate: formattedDate,
      instructorName: payload.instructorName || 'INSTRUCTOR / COURSE MENTOR',
      signatoryName: payload.signatoryName || 'RURALSPARK AUTHORIZED SIGNATORY',
      createdAt: now.toISOString(),
    };

    this.saveCertificate(newCertificate);
    return newCertificate;
  },

  saveCertificate(certificate: ICertificate): void {
    if (typeof window === 'undefined') return;
    const all = this.getAllCertificates();
    const index = all.findIndex((c) => c.id === certificate.id || (String(c.studentId) === String(certificate.studentId) && String(c.courseId) === String(certificate.courseId)));
    if (index >= 0) {
      all[index] = certificate;
    } else {
      all.unshift(certificate);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }
};
