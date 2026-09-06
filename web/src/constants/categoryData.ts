// src/constants/categoryData.ts

/**
 * Centralized Category → Sub-Category configuration.
 * Exact sub-categories for Computer Basics:
 *   1. MS Office
 *   2. Internet & Email
 *   3. Typing Skills
 *   4. Windows OS
 *   5. Troubleshooting
 */
export const CATEGORY_MAP: Record<string, string[]> = {
  'Computer Basics': [
    'MS Office',
    'Internet & Email',
    'Typing Skills',
    'Windows OS',
    'Troubleshooting',
  ],
  'Digital Skills': [
    'Mobile Banking',
    'UPI Payments',
    'Online Safety',
    'Social Media',
    'E-Commerce',
  ],
  'Financial Literacy': [
    'Budgeting',
    'Savings & Goals',
    'Insurance Basics',
    'Investment Intro',
    'Tax Basics',
  ],
  'Soft Skills': [
    'Communication',
    'Leadership',
    'Teamwork',
    'Time Management',
    'Problem Solving',
  ],
  'Career Roadmap': [
    'Resume Building',
    'Interview Skills',
    'Job Search',
    'Networking',
    'LinkedIn Profile',
  ],
  'Government Exams': [
    'SSC / CGL',
    'Banking (IBPS)',
    'UPSC Prelims',
    'Railways (RRB)',
    'State PSC',
  ],
  'Spoken English': [
    'Basic Conversation',
    'Grammar Essentials',
    'Pronunciation',
    'Business English',
    'Interview English',
  ],
  'Coding': [
    'Python Basics',
    'Web Development',
    'Data Science Intro',
    'JavaScript',
    'SQL & Databases',
  ],
};

export const COMPUTER_BASICS_CATEGORY = 'Computer Basics';

export const COMPUTER_BASICS_SUB_CATEGORIES = CATEGORY_MAP['Computer Basics'];

export const ALL_CATEGORIES = Object.keys(CATEGORY_MAP);

export const CATEGORY_SELECT_OPTIONS = ALL_CATEGORIES.map((c) => ({
  value: c,
  label: c,
}));

/**
 * Normalizes category or subcategory strings for reliable case-insensitive,
 * slug-insensitive, whitespace-insensitive comparisons.
 *
 * Examples:
 *   "Computer Basics" -> "computer basics"
 *   " computer  basics " -> "computer basics"
 *   "computer-basics" -> "computer basics"
 *   "Internet & Email" -> "internet and email"
 *   "internet-and-email" -> "internet and email"
 */
export function normalizeCategory(val?: string | null): string {
  if (!val || typeof val !== 'string') return '';
  return val
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Checks if two category names match after normalization.
 */
export function isCategoryMatch(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return normalizeCategory(a) === normalizeCategory(b);
}

/**
 * Checks if two subcategory names match after normalization.
 */
export function isSubCategoryMatch(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return normalizeCategory(a) === normalizeCategory(b);
}

/**
 * Resolves any raw string or slug to its canonical Category label.
 * e.g. "computer-basics" -> "Computer Basics"
 */
export function getCanonicalCategory(raw?: string | null): string | null {
  if (!raw) return null;
  const norm = normalizeCategory(raw);
  const found = ALL_CATEGORIES.find((c) => normalizeCategory(c) === norm);
  return found || null;
}

/**
 * Resolves any raw string or slug to its canonical Sub-Category label for a given category.
 * e.g. ("Computer Basics", "ms-office") -> "MS Office"
 */
export function getCanonicalSubCategory(category: string, raw?: string | null): string | null {
  if (!raw) return null;
  const validSubs = CATEGORY_MAP[category] || [];
  const norm = normalizeCategory(raw);
  const found = validSubs.find((s) => normalizeCategory(s) === norm);
  return found || null;
}

/**
 * Retrieves valid sub-categories for a category.
 */
export function getSubCategoriesForCategory(category?: string | null): string[] {
  if (!category) return [];
  const canonical = getCanonicalCategory(category) || category;
  return CATEGORY_MAP[canonical] || [];
}
