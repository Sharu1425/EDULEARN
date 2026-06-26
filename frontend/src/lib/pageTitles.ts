/**
 * Route → page-title map for the global header.
 * Longest-prefix match wins, so "/coding-results" beats "/coding".
 * Mirrors the sidebar nav in utils/roleUtils.ts.
 */
const TITLES: Array<[string, string]> = [
    ["/dashboard", "Dashboard"],
    ["/assessment-choice", "Practice & Assessments"],
    ["/assessconfig", "Practice & Assessments"],
    ["/unified-assessment", "Practice & Assessments"],
    ["/assessment", "Assessment"],
    ["/mastery", "Topic Mastery"],
    ["/coding-results", "Coding Results"],
    ["/coding", "Coding Lab"],
    ["/my-results", "My Results"],
    ["/results", "Results"],
    ["/test-result", "Result"],
    ["/thinktrace-result", "ThinkTrace Report"],
    ["/thinktrace", "ThinkTrace"],
    ["/profile", "Profile"],
    ["/settings", "Settings"],
    // Teacher
    ["/teacher-dashboard", "Dashboard"],
    ["/teacher/student-management", "Students"],
    ["/teacher/assessment-management", "Assessments"],
    ["/teacher/create-assessment", "Create Assessment"],
    ["/teacher/batch-analytics", "Batch Analytics"],
    ["/teacher/results-dashboard", "Results"],
    ["/teacher/assessment-history", "Assessment History"],
    ["/teacher/assessment", "Assessment Results"],
    // Admin
    ["/admin-dashboard", "Admin Panel"],
]

export function getPageTitle(pathname: string): string {
    let bestLen = -1
    let title = "EduLearn"
    for (const [path, t] of TITLES) {
        if ((pathname === path || pathname.startsWith(path)) && path.length > bestLen) {
            bestLen = path.length
            title = t
        }
    }
    return title
}
