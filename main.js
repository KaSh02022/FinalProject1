/* =========================================================
   MAIN.JS
   The one JavaScript file used by every page (linked with
   <script src="../js/main.js"> at the bottom of <body>).
   Every function checks "does this element exist on the current
   page?" before doing anything, so the same file works safely
   on all pages even though each page only has some of the UI.

   Table of contents:
   1.  ICONS            - inline SVG icon system (real Lucide icons)
   2.  MOCK DATA         - users, workspace, projects, tasks...
   3.  FORMAT HELPERS     - dates, priority/status lookup helpers
   4.  TOAST              - bottom-right notifications
   5.  SIDEBAR             - collapse (desktop) + drawer (mobile)
   6.  DROPDOWN            - click-to-open menus
   7.  MODAL / DRAWER       - open/close by id
   8.  COMMAND PALETTE       - Ctrl/Cmd+K search
   9.  TABS / PILL TABS       - tab switching
   10. SETTINGS NAV           - project settings page sections
   11. FILTER SEARCH           - simple text filtering
   12. KANBAN BOARD             - render + drag & drop + add task
   13. TASK DRAWER               - task detail panel
   14. LOGIN PAGE                 - demo sign-in
   15. INIT                        - run everything on page load
   ========================================================= */

/* =========================================================
   1. ICONS
   These path strings are copied from the real Lucide icon set
   (the same icon library the React app uses via "lucide-react"),
   so the HTML version renders pixel-identical icons without
   installing anything. Each entry is the inner content of a
   24x24 SVG icon.
   ========================================================= */
const ICON_PATHS = {
  layoutDashboard: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
  listTodo: '<path d="M13 5h8"/><path d="M13 12h8"/><path d="M13 19h8"/><path d="m3 17 2 2 4-4"/><rect x="3" y="4" width="6" height="6" rx="1"/>',
  folderKanban: '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/><path d="M8 10v4"/><path d="M12 10v2"/><path d="M16 10v6"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>',
  usersRound: '<path d="M18 21a8 8 0 0 0-16 0"/><circle cx="10" cy="8" r="5"/><path d="M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3"/>',
  shieldCheck: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  flag: '<path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528"/>',
  kanbanSquare: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 7v7"/><path d="M12 7v4"/><path d="M16 7v9"/>',
  chevronsLeft: '<path d="m11 17-5-5 5-5"/><path d="m18 17-5-5 5-5"/>',
  chevronsRight: '<path d="m6 17 5-5-5-5"/><path d="m13 17 5-5-5-5"/>',
  menu: '<path d="M4 5h16"/><path d="M4 12h16"/><path d="M4 19h16"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  search: '<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>',
  folderPlus: '<path d="M12 10v6"/><path d="M9 13h6"/><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  listPlus: '<path d="M16 5H3"/><path d="M11 12H3"/><path d="M16 19H3"/><path d="M18 9v6"/><path d="M21 12h-6"/>',
  logOut: '<path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  settings: '<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/>',
  calendar: '<path d="M8 2v3"/><path d="M16 2v3"/><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/>',
  list: '<path d="M3 5h.01"/><path d="M3 12h.01"/><path d="M3 19h.01"/><path d="M8 5h13"/><path d="M8 12h13"/><path d="M8 19h13"/>',
  layoutGrid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  activity: '<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>',
  listChecks: '<path d="M13 5h8"/><path d="M13 12h8"/><path d="M13 19h8"/><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/>',
  calendarClock: '<path d="M16 14v2.2l1.6 1"/><path d="M16 2v3"/><path d="M21 7.338V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h2.338"/><path d="M3 9h5.859"/><path d="M8 2v3"/><circle cx="16" cy="16" r="6"/>',
  arrowUp: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
  arrowDown: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
  minus: '<path d="M5 12h14"/>',
  chevronsUp: '<path d="m17 11-5-5-5 5"/><path d="m17 18-5-5-5 5"/>',
  checkSquare: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="m16 9-5.5 5.5L8 12"/>',
  messageSquare: '<path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/>',
  gripVertical: '<circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  alertTriangle: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  shieldAlert: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
  checkCircle2: '<circle cx="12" cy="12" r="10"/><path d="m16 9-5.5 5.5L8 12"/>',
  xCircle: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  loader: '<path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/>',
  loader2: '<path d="M21 12a9 9 0 1 1-6.219-8.56"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  trash2: '<path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  moreHorizontal: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  userCog: '<path d="M10 15H6a4 4 0 0 0-4 4v2"/><path d="m14.305 16.53.923-.382"/><path d="m15.228 13.852-.923-.383"/><path d="m16.852 12.228-.383-.923"/><path d="m16.852 17.772-.383.924"/><path d="m19.148 12.228.383-.923"/><path d="m19.53 18.696-.382-.924"/><path d="m20.772 13.852.924-.383"/><path d="m20.772 16.148.924.383"/><circle cx="18" cy="15" r="3"/><circle cx="9" cy="7" r="4"/>',
  userMinus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="22" x2="16" y1="11" y2="11"/>',
  userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>',
  userX: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" x2="22" y1="8" y2="13"/><line x1="22" x2="17" y1="8" y2="13"/>',
  userCheck: '<path d="m16 11 2 2 4-4"/><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  send: '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
  plusCircle: '<circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/>',
  arrowRightLeft: '<path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>',
  tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
};

function iconSvg(name) {
  const inner = ICON_PATHS[name];
  if (!inner) return '';
  return '<svg viewBox="0 0 24 24">' + inner + '</svg>';
}

/* Finds every <span class="icon" data-icon="..."> on the page (or
   inside `root`, for content just inserted by JS) and fills it in. */
function renderIcons(root) {
  (root || document).querySelectorAll('[data-icon]').forEach(function (el) {
    el.innerHTML = iconSvg(el.getAttribute('data-icon'));
  });
}

/* =========================================================
   2. MOCK DATA
   Copied from the React app's mock data (src/mocks/*.js) so the
   HTML version shows the same workspace, people, and tasks.
   ========================================================= */
const workspace = { name: 'Aptech Capstone Team' };

const users = [
  { id: 'u1', name: 'Cao Sơn', email: 'caosonhs@gmail.com', avatarColor: '#4f46e5', initials: 'CS', title: 'Team Leader', role: 'leader' },
  { id: 'u2', name: 'Quách Loan', email: 'loan.quach@teamflow.dev', avatarColor: '#0ea5e9', initials: 'QL', title: 'Backend Engineer', role: 'member' },
  { id: 'u3', name: 'Ngô Lâm', email: 'lam.ngo@teamflow.dev', avatarColor: '#16a34a', initials: 'NL', title: 'Frontend Engineer', role: 'member' },
  { id: 'u4', name: 'Khánh Ngọc', email: 'ngoc.khanh@teamflow.dev', avatarColor: '#db2777', initials: 'KN', title: 'System Admin', role: 'admin' },
];
const currentUser = users[0]; // Cao Sơn — signed in as the demo "Team Leader"
const roleLabel = { leader: 'Team Leader', member: 'Member', admin: 'System Admin' };

function findUser(id) { return users.find(function (u) { return u.id === id; }); }

const projects = [
  { id: 'p1', name: 'TeamFlow Platform', description: 'Kanban team task management system — the capstone product.', color: '#4f46e5', status: 'on-track', dueDate: '2026-09-15', taskDone: 4, taskTotal: 14 },
  { id: 'p2', name: 'Marketing Website', description: 'Public marketing site and landing pages for launch.', color: '#0ea5e9', status: 'at-risk', dueDate: '2026-09-05', taskDone: 3, taskTotal: 8 },
  { id: 'p3', name: 'Mobile Companion App', description: 'React Native companion app for on-the-go task updates.', color: '#f59e0b', status: 'behind', dueDate: '2026-10-01', taskDone: 2, taskTotal: 7 },
  { id: 'p4', name: 'Internal Tooling', description: 'Admin dashboards and internal automation scripts.', color: '#16a34a', status: 'completed', dueDate: '2026-08-01', taskDone: 5, taskTotal: 8 },
];
const statusMeta = {
  'on-track': { label: 'On track', badgeClass: 'badge-success' },
  'at-risk': { label: 'At risk', badgeClass: 'badge-warning' },
  behind: { label: 'Behind', badgeClass: 'badge-danger' },
  completed: { label: 'Completed', badgeClass: 'badge-neutral' },
};

/* The interactive Board / List / Calendar / Activity pages all model
   ONE real project — "TeamFlow Platform" — in full detail. Modelling
   all four projects this deeply would just repeat the same patterns
   for no extra learning value. */
const columns = [
  { id: 'c0', name: 'Todo', color: '#94a3b8', order: 0, isDone: false },
  { id: 'c1', name: 'In Progress', color: '#f59e0b', order: 1, isDone: false },
  { id: 'c2', name: 'Review', color: '#9333ea', order: 2, isDone: false },
  { id: 'c3', name: 'Done', color: '#16a34a', order: 3, isDone: true },
];
function findColumn(id) { return columns.find(function (c) { return c.id === id; }); }

const labels = [
  { id: 'l0', name: 'Design', color: '#9333ea' },
  { id: 'l1', name: 'Frontend', color: '#2563eb' },
  { id: 'l2', name: 'Backend', color: '#0d9488' },
  { id: 'l3', name: 'Security', color: '#dc2626' },
  { id: 'l4', name: 'Bug', color: '#e11d48' },
  { id: 'l5', name: 'Documentation', color: '#f59e0b' },
  { id: 'l6', name: 'DevOps', color: '#475569' },
  { id: 'l7', name: 'Research', color: '#0ea5e9' },
];
function findLabel(id) { return labels.find(function (l) { return l.id === id; }); }

const priorityMeta = {
  urgent: { label: 'Urgent', color: '#dc2626', bg: '#fef2f2', icon: 'chevronsUp' },
  high: { label: 'High', color: '#f97316', bg: '#fff7ed', icon: 'arrowUp' },
  medium: { label: 'Medium', color: '#f59e0b', bg: '#fffbeb', icon: 'minus' },
  low: { label: 'Low', color: '#2563eb', bg: '#eff6ff', icon: 'arrowDown' },
};

/* Each task stores just the "spec" fields (like the React mocks do);
   checklist items, comments, and activity entries are generated on
   demand by the helper functions further down, from a small shared
   pool of sentences — exactly how the original mock data is built. */
const tasks = [
  { id: 'p1-t1', columnId: 'c0', title: 'Design authentication flow', description: 'Map out login, signup, refresh-token, and logout flows including error states.', priority: 'high', assigneeIds: ['u4'], labelIds: ['l0', 'l3'], dueDate: '2026-09-02', checklistTotal: 3, checklistDone: 0, commentCount: 0, createdAt: '2026-08-10T09:00:00' },
  { id: 'p1-t2', columnId: 'c0', title: 'Create project settings page', description: 'General, members, workflow, labels, and danger zone tabs.', priority: 'medium', assigneeIds: ['u3'], labelIds: ['l1'], dueDate: '2026-09-05', checklistTotal: 2, checklistDone: 0, commentCount: 0, createdAt: '2026-08-11T09:00:00' },
  { id: 'p1-t3', columnId: 'c0', title: 'Database schema', description: 'Design normalized schema for users, projects, tasks, and activity.', priority: 'high', assigneeIds: ['u2'], labelIds: ['l2'], dueDate: '2026-08-30', checklistTotal: 4, checklistDone: 1, commentCount: 1, createdAt: '2026-08-09T09:00:00' },
  { id: 'p1-t4', columnId: 'c0', title: 'Prepare capstone presentation', description: 'Slide deck covering architecture, demo flow, and lessons learned.', priority: 'low', assigneeIds: ['u1'], labelIds: ['l5'], dueDate: '2026-09-14', checklistTotal: 2, checklistDone: 0, commentCount: 0, createdAt: '2026-08-12T09:00:00' },
  { id: 'p1-t5', columnId: 'c1', title: 'Implement login API', description: 'JWT-based auth with refresh tokens and rate limiting on the mock adapter layer.', priority: 'high', assigneeIds: ['u2'], labelIds: ['l2', 'l3'], dueDate: '2026-08-29', checklistTotal: 4, checklistDone: 2, commentCount: 3, createdAt: '2026-08-08T09:00:00' },
  { id: 'p1-t6', columnId: 'c1', title: 'Build dashboard UI', description: "KPI row, today's tasks, upcoming deadlines, and team workload widgets.", priority: 'high', assigneeIds: ['u3'], labelIds: ['l1', 'l0'], dueDate: '2026-08-28', checklistTotal: 6, checklistDone: 3, commentCount: 5, createdAt: '2026-08-07T09:00:00' },
  { id: 'p1-t7', columnId: 'c1', title: 'API integration layer', description: 'Adapter pattern so mock data can be swapped for a real backend later.', priority: 'medium', assigneeIds: ['u2'], labelIds: ['l2', 'l1'], dueDate: '2026-09-01', checklistTotal: 3, checklistDone: 1, commentCount: 2, createdAt: '2026-08-06T09:00:00' },
  { id: 'p1-t8', columnId: 'c1', title: 'Mobile responsive layout', description: 'Board becomes a single-column swipeable view under 480px.', priority: 'medium', assigneeIds: ['u4'], labelIds: ['l1'], dueDate: '2026-08-27', checklistTotal: 5, checklistDone: 2, commentCount: 1, createdAt: '2026-08-05T09:00:00' },
  { id: 'p1-t9', columnId: 'c2', title: 'Kanban drag & drop', description: 'Cross-column drag and drop with keyboard support.', priority: 'urgent', assigneeIds: ['u3'], labelIds: ['l1', 'l4'], dueDate: '2026-08-26', checklistTotal: 5, checklistDone: 4, commentCount: 6, createdAt: '2026-08-04T09:00:00' },
  { id: 'p1-t10', columnId: 'c2', title: 'Task detail drawer', description: 'Right-side drawer with metadata, checklist, comments, and activity tabs.', priority: 'high', assigneeIds: ['u1'], labelIds: ['l1'], dueDate: '2026-08-25', checklistTotal: 5, checklistDone: 5, commentCount: 4, createdAt: '2026-08-03T09:00:00' },
  { id: 'p1-t11', columnId: 'c3', title: 'Write documentation', description: 'Architecture, design system, and implementation status docs.', priority: 'low', assigneeIds: ['u1'], labelIds: ['l5'], dueDate: '2026-08-20', checklistTotal: 3, checklistDone: 3, commentCount: 2, createdAt: '2026-07-28T09:00:00' },
  { id: 'p1-t12', columnId: 'c3', title: 'Setup CI/CD pipeline', description: 'Lint, typecheck, and build on every push.', priority: 'medium', assigneeIds: ['u3'], labelIds: ['l6'], dueDate: '2026-08-15', checklistTotal: 4, checklistDone: 4, commentCount: 0, createdAt: '2026-07-25T09:00:00' },
  { id: 'p1-t13', columnId: 'c3', title: 'User research interviews', description: 'Five interviews with student teams on current Trello pain points.', priority: 'medium', assigneeIds: ['u1'], labelIds: ['l7'], dueDate: '2026-08-10', checklistTotal: 5, checklistDone: 5, commentCount: 3, createdAt: '2026-07-20T09:00:00' },
  { id: 'p1-t14', columnId: 'c3', title: 'Design system tokens', description: 'Color, spacing, radius, and typography tokens documented and applied.', priority: 'low', assigneeIds: ['u4'], labelIds: ['l0'], dueDate: '2026-08-05', checklistTotal: 3, checklistDone: 3, commentCount: 1, createdAt: '2026-07-18T09:00:00' },
];
function findTask(id) { return tasks.find(function (t) { return t.id === id; }); }

/* The 8-item checklist pool used to build each task's checklist,
   exactly like the React mocks (checklistPool in mocks/tasks.js). */
const checklistPool = ['Gather requirements', 'Draft initial implementation', 'Add unit tests', 'Peer review', 'Update documentation', 'QA verification', 'Deploy to staging', 'Final sign-off'];
function buildChecklist(task) {
  return checklistPool.slice(0, task.checklistTotal).map(function (text, i) {
    return { text: text, done: i < task.checklistDone };
  });
}

/* Same idea for comments: a pool of generic review comments, cycled
   through so every task's comment thread matches its comment count. */
const commentPool = [
  'Please review the API response shape before we lock the contract.',
  'Updated validation rules to match the new schema.',
  'Looks good to me, merging after CI passes.',
  'Can we add an empty state for this? Currently just blank.',
  'Fixed the edge case with overdue tasks not sorting correctly.',
  'Left a few comments on the PR, mostly naming nits.',
  'This is blocked on the design handoff, following up on it.',
  'Retested on mobile — works as expected now.',
  'Should we support undo here or is confirm enough?',
  'Nice, this closes the loop with the activity log.',
];
function buildComments(task) {
  const comments = [];
  for (let i = 0; i < task.commentCount; i++) {
    const author = task.assigneeIds[i % task.assigneeIds.length] || 'u1';
    comments.push({
      authorId: author,
      body: commentPool[(i + task.id.length) % commentPool.length],
      hoursAgo: (task.commentCount - i) * 5 + 2,
    });
  }
  return comments;
}

/* Builds the "Activity" tab for one task: created -> assigned ->
   moved/completed -> one entry per comment. Mirrors mocks/activity.js. */
function buildActivity(task) {
  const actor = task.assigneeIds[0] || 'u1';
  const entries = [
    { action: 'created', actorId: actor, detail: 'created "' + task.title + '"', hoursAgo: 200 },
    { action: 'assigned', actorId: actor, detail: 'assigned "' + task.title + '" to themselves', hoursAgo: 199 },
  ];
  const column = findColumn(task.columnId);
  if (column.order > 0) {
    entries.push({
      action: column.isDone ? 'completed' : 'moved',
      actorId: actor,
      detail: column.isDone ? 'marked "' + task.title + '" as done' : 'moved "' + task.title + '" to ' + column.name,
      hoursAgo: 190,
    });
  }
  buildComments(task).forEach(function (c) {
    entries.push({ action: 'commented', actorId: c.authorId, detail: 'commented on "' + task.title + '"', hoursAgo: c.hoursAgo });
  });
  return entries.sort(function (a, b) { return b.hoursAgo - a.hoursAgo; });
}

const actionIcon = {
  created: 'plusCircle', moved: 'arrowRightLeft', assigned: 'userPlus', commented: 'messageSquare',
  completed: 'checkCircle2', 'priority-changed': 'flag', 'label-added': 'tag', 'due-date-changed': 'calendarClock',
};

/* =========================================================
   3. FORMAT HELPERS
   ========================================================= */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/* Fixed "today" so overdue/due-today badges stay consistent no matter
   when this page is opened (this is demo data, not a live system). */
const TODAY = new Date('2026-09-10T00:00:00');

function parseDate(iso) { return new Date(iso + (iso.length <= 10 ? 'T00:00:00' : '')); }
function formatDate(iso) { const d = parseDate(iso); return MONTHS[d.getMonth()] + ' ' + d.getDate(); }
function formatDateLong(iso) { const d = parseDate(iso); return MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); }
function daysBetween(iso) {
  const d = parseDate(iso);
  return Math.round((d - TODAY) / (1000 * 60 * 60 * 24));
}
function isOverdue(iso, isDone) {
  if (!iso || isDone) return false;
  return daysBetween(iso) < 0;
}
function isDueToday(iso) { return iso ? daysBetween(iso) === 0 : false; }
function formatRelativeHours(hoursAgo) {
  if (hoursAgo < 1) return 'just now';
  if (hoursAgo < 24) return Math.round(hoursAgo) + (hoursAgo < 2 ? ' hour ago' : ' hours ago');
  const days = Math.round(hoursAgo / 24);
  return days + (days === 1 ? ' day ago' : ' days ago');
}

/* =========================================================
   4. TOAST
   ========================================================= */
function showToast(title, description, variant) {
  const viewport = document.querySelector('.toast-viewport');
  if (!viewport) return;
  const icons = { success: 'checkCircle2', error: 'xCircle', info: 'info' };
  const toast = document.createElement('div');
  toast.className = 'toast variant-' + (variant || 'info');
  toast.innerHTML =
    '<span class="toast-icon icon" data-icon="' + icons[variant || 'info'] + '"></span>' +
    '<div class="toast-body"><p class="toast-title">' + title + '</p>' +
    (description ? '<p class="toast-desc">' + description + '</p>' : '') + '</div>' +
    '<button class="toast-close icon icon-sm" data-icon="x" aria-label="Dismiss"></button>';
  viewport.appendChild(toast);
  renderIcons(toast);
  const timer = setTimeout(function () { toast.remove(); }, 4000);
  toast.querySelector('.toast-close').addEventListener('click', function () {
    clearTimeout(timer);
    toast.remove();
  });
}

/* =========================================================
   5. SIDEBAR
   Desktop (>=1024px): a button at the bottom toggles a "collapsed"
   class that shrinks the sidebar to an icon rail.
   Mobile (<768px): the sidebar becomes an off-canvas drawer opened
   by the header's hamburger button.
   ========================================================= */
function initSidebar() {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  const collapseBtn = document.querySelector('[data-action="toggle-sidebar"]');
  if (collapseBtn) {
    collapseBtn.addEventListener('click', function () {
      sidebar.classList.toggle('collapsed');
      const collapsed = sidebar.classList.contains('collapsed');
      collapseBtn.setAttribute('data-icon', collapsed ? 'chevronsRight' : 'chevronsLeft');
      renderIcons(collapseBtn.parentElement);
    });
  }

  const overlay = document.querySelector('.sidebar-overlay');
  document.querySelectorAll('[data-action="open-sidebar"]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      sidebar.classList.add('mobile-open');
      if (overlay) overlay.classList.add('show');
    });
  });
  document.querySelectorAll('[data-action="close-sidebar"]').forEach(function (el) {
    el.addEventListener('click', function () {
      sidebar.classList.remove('mobile-open');
      if (overlay) overlay.classList.remove('show');
    });
  });
}

/* =========================================================
   6. DROPDOWN
   <div class="dropdown">
     <button data-dropdown-trigger>...</button>
     <div class="dropdown-menu hidden" data-dropdown-menu>...</div>
   </div>
   ========================================================= */
function initDropdowns() {
  document.addEventListener('click', function (e) {
    const trigger = e.target.closest('[data-dropdown-trigger]');
    if (trigger) {
      const menu = trigger.parentElement.querySelector('[data-dropdown-menu]');
      const isOpen = !menu.classList.contains('hidden');
      document.querySelectorAll('[data-dropdown-menu]').forEach(function (m) { m.classList.add('hidden'); });
      if (!isOpen) menu.classList.remove('hidden');
      return;
    }
    if (!e.target.closest('[data-dropdown-menu]')) {
      document.querySelectorAll('[data-dropdown-menu]').forEach(function (m) { m.classList.add('hidden'); });
    }
  });
}

/* =========================================================
   7. MODAL / DRAWER
   Both use the same on/off mechanism: toggle the "hidden" class
   on the overlay element that has the matching id.
   ========================================================= */
function initOverlays() {
  document.addEventListener('click', function (e) {
    const opener = e.target.closest('[data-open-modal], [data-open-drawer]');
    if (opener) {
      const id = opener.getAttribute('data-open-modal') || opener.getAttribute('data-open-drawer');
      const overlay = document.getElementById(id);
      if (overlay) overlay.classList.remove('hidden');
      if (opener.hasAttribute('data-open-modal') && id === 'commandPalette') {
        const input = overlay.querySelector('.command-palette-input');
        if (input) { input.value = ''; input.dispatchEvent(new Event('input')); setTimeout(function () { input.focus(); }, 0); }
      }
      return;
    }
    const closer = e.target.closest('[data-close-modal], [data-close-drawer]');
    if (closer) {
      const id = closer.getAttribute('data-close-modal') || closer.getAttribute('data-close-drawer');
      const overlay = document.getElementById(id);
      if (overlay) overlay.classList.add('hidden');
      return;
    }
    if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('drawer-overlay')) {
      e.target.classList.add('hidden');
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.modal-overlay:not(.hidden), .drawer-overlay:not(.hidden)').forEach(function (el) {
      el.classList.add('hidden');
    });
  });
}

/* =========================================================
   8. COMMAND PALETTE
   The header's search bar (and Ctrl/Cmd+K) opens a modal that
   filters across projects, tasks, and members as you type.
   ========================================================= */
function initCommandPalette() {
  const overlay = document.getElementById('commandPalette');
  if (!overlay) return;
  const input = overlay.querySelector('.command-palette-input');
  const results = overlay.querySelector('.command-palette-results');

  function render(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      results.innerHTML = '<p class="command-palette-empty">Start typing to search across your workspace.</p>';
      return;
    }
    const matchedProjects = projects.filter(function (p) { return p.name.toLowerCase().includes(q); });
    const matchedTasks = tasks.filter(function (t) { return t.title.toLowerCase().includes(q); });
    const matchedMembers = users.filter(function (u) { return u.name.toLowerCase().includes(q); });
    if (!matchedProjects.length && !matchedTasks.length && !matchedMembers.length) {
      results.innerHTML = '<p class="command-palette-empty">No results for "' + query + '".</p>';
      return;
    }
    let html = '';
    if (matchedProjects.length) {
      html += '<div class="command-palette-section"><p class="command-palette-section-label">Projects</p>' +
        matchedProjects.map(function (p) {
          return '<a class="command-palette-row" href="project-board.html"><span class="icon icon-md" data-icon="layoutGrid" style="color:' + p.color + '"></span><span>' + p.name + '</span></a>';
        }).join('') + '</div>';
    }
    if (matchedTasks.length) {
      html += '<div class="command-palette-section"><p class="command-palette-section-label">Tasks</p>' +
        matchedTasks.map(function (t) {
          return '<a class="command-palette-row" href="project-board.html?task=' + t.id + '"><span class="priority-dot" style="background:' + priorityMeta[t.priority].color + ';width:8px;height:8px;border-radius:50%;display:inline-block"></span><span>' + t.title + '</span></a>';
        }).join('') + '</div>';
    }
    if (matchedMembers.length) {
      html += '<div class="command-palette-section"><p class="command-palette-section-label">Members</p>' +
        matchedMembers.map(function (m) {
          return '<a class="command-palette-row" href="members.html"><span class="avatar avatar-xs" style="background:' + m.avatarColor + '">' + m.initials + '</span><span>' + m.name + '</span></a>';
        }).join('') + '</div>';
    }
    results.innerHTML = html;
    renderIcons(results);
  }

  input.addEventListener('input', function () { render(input.value); });
  render('');

  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      overlay.classList.remove('hidden');
      input.value = '';
      render('');
      setTimeout(function () { input.focus(); }, 0);
    }
  });
}

/* =========================================================
   9. TABS / PILL TABS
   <button data-tab-group="g" data-tab="a">...</button>
   <div data-tab-panel="g" data-tab="a">...</div>
   ========================================================= */
function initTabs() {
  document.querySelectorAll('[data-tab-group]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const group = btn.getAttribute('data-tab-group');
      const tab = btn.getAttribute('data-tab');
      document.querySelectorAll('[data-tab-group="' + group + '"]').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      document.querySelectorAll('[data-tab-panel="' + group + '"]').forEach(function (panel) {
        const match = panel.getAttribute('data-tab') === tab;
        panel.classList.toggle('active', match);
        panel.classList.toggle('hidden', !match);
      });
    });
  });
}

/* =========================================================
   10. SETTINGS NAV (Project Settings page)
   ========================================================= */
function initSettingsNav() {
  const items = document.querySelectorAll('.settings-nav-item');
  if (!items.length) return;
  items.forEach(function (item) {
    item.addEventListener('click', function () {
      items.forEach(function (i) { i.classList.remove('active'); });
      item.classList.add('active');
      const target = item.getAttribute('data-settings-target');
      document.querySelectorAll('.settings-section').forEach(function (section) {
        section.classList.toggle('active', section.id === 'settings-' + target);
      });
    });
  });
}

/* =========================================================
   11. FILTER SEARCH
   <input data-filter-input="group">
   <div data-filter-target="group" data-filter-text="...">
   ========================================================= */
function initFilterSearch() {
  document.querySelectorAll('[data-filter-input]').forEach(function (input) {
    const group = input.getAttribute('data-filter-input');
    input.addEventListener('input', function () {
      const q = input.value.trim().toLowerCase();
      document.querySelectorAll('[data-filter-target="' + group + '"]').forEach(function (item) {
        const text = (item.getAttribute('data-filter-text') || '').toLowerCase();
        item.classList.toggle('hidden', q.length > 0 && text.indexOf(q) === -1);
      });
    });
  });
}

/* =========================================================
   12. KANBAN BOARD
   ========================================================= */
function renderAvatarGroup(userIds, size) {
  const cls = 'avatar avatar-' + (size || 'sm');
  return userIds.map(function (id) {
    const u = findUser(id);
    if (!u) return '';
    return '<span class="' + cls + '" style="background:' + u.avatarColor + '" title="' + u.name + '">' + u.initials + '</span>';
  }).join('');
}
function renderLabelChips(labelIds) {
  return labelIds.map(function (id) {
    const l = findLabel(id);
    if (!l) return '';
    return '<span class="label-chip" style="color:' + l.color + ';background:' + l.color + '1a">' + l.name + '</span>';
  }).join('');
}

function buildTaskCard(task) {
  const card = document.createElement('article');
  card.className = 'task-card';
  card.draggable = true;
  card.dataset.taskId = task.id;
  card.setAttribute('data-filter-target', 'board');
  card.setAttribute('data-filter-text', task.title);
  const p = priorityMeta[task.priority];
  const overdue = isOverdue(task.dueDate, findColumn(task.columnId).isDone);
  const dueToday = isDueToday(task.dueDate);
  const dueClass = overdue ? 'due-overdue' : dueToday ? 'due-today' : '';

  card.innerHTML =
    '<div class="task-card-top">' +
      '<span class="priority-badge" style="color:' + p.color + ';background:' + p.bg + '"><span class="icon icon-xs" data-icon="' + p.icon + '"></span>' + p.label + '</span>' +
      '<span class="task-card-drag-handle icon icon-sm" data-icon="gripVertical" aria-hidden="true"></span>' +
    '</div>' +
    '<p class="task-card-title">' + task.title + '</p>' +
    (task.labelIds.length ? '<div class="task-card-labels">' + renderLabelChips(task.labelIds) + '</div>' : '') +
    (task.checklistTotal > 0 || task.commentCount > 0
      ? '<div class="task-card-sub-meta">' +
        (task.checklistTotal > 0 ? '<span class="icon-inline' + (task.checklistDone === task.checklistTotal ? ' complete' : '') + '"><span class="icon icon-sm" data-icon="checkSquare"></span>' + task.checklistDone + '/' + task.checklistTotal + '</span>' : '') +
        (task.commentCount > 0 ? '<span class="icon-inline"><span class="icon icon-sm" data-icon="messageSquare"></span>' + task.commentCount + '</span>' : '') +
        '</div>'
      : '') +
    '<div class="task-card-bottom">' +
      '<span class="avatar-group">' + (task.assigneeIds.length ? renderAvatarGroup(task.assigneeIds) : '') + '</span>' +
      (task.dueDate ? '<span class="task-card-due ' + dueClass + '">' + formatDate(task.dueDate) + '</span>' : '<span></span>') +
    '</div>';

  card.addEventListener('click', function () { openTaskDrawer(task.id); });
  card.addEventListener('dragstart', function (e) {
    e.dataTransfer.setData('text/plain', task.id);
    card.classList.add('dragging');
  });
  card.addEventListener('dragend', function () { card.classList.remove('dragging'); });

  renderIcons(card);
  return card;
}

function renderBoard() {
  const board = document.getElementById('kanbanBoard');
  if (!board) return;
  board.innerHTML = '';
  columns.forEach(function (column) {
    const columnTasks = tasks.filter(function (t) { return t.columnId === column.id; });
    const columnEl = document.createElement('div');
    columnEl.className = 'board-column';
    columnEl.innerHTML =
      '<div class="board-column-header">' +
        '<span class="project-color-dot" style="background:' + column.color + '"></span>' +
        '<h3 class="board-column-title">' + column.name + '</h3>' +
        '<span class="board-column-count">' + columnTasks.length + '</span>' +
      '</div>' +
      '<div class="board-column-body" data-column-id="' + column.id + '"></div>' +
      '<div class="board-column-footer">' +
        '<button class="add-task-btn" data-add-task="' + column.id + '"><span class="icon icon-sm" data-icon="plus"></span>Add Task</button>' +
        '<div class="add-task-form hidden" data-add-task-form="' + column.id + '">' +
          '<textarea rows="2" placeholder="Enter a task title…"></textarea>' +
          '<div class="add-task-form-actions">' +
            '<button class="btn btn-primary btn-sm" data-add-task-submit="' + column.id + '">Add</button>' +
            '<button class="icon-btn icon-btn-sm" data-add-task-cancel="' + column.id + '" aria-label="Cancel"><span class="icon icon-sm" data-icon="x"></span></button>' +
          '</div>' +
        '</div>' +
      '</div>';
    board.appendChild(columnEl);
    const body = columnEl.querySelector('.board-column-body');
    columnTasks.forEach(function (task) { body.appendChild(buildTaskCard(task)); });
  });
  renderIcons(board);
  initDragAndDrop();
  initAddTaskInline();
}

function initDragAndDrop() {
  document.querySelectorAll('.board-column-body').forEach(function (body) {
    body.addEventListener('dragover', function (e) { e.preventDefault(); body.classList.add('drag-over'); });
    body.addEventListener('dragleave', function () { body.classList.remove('drag-over'); });
    body.addEventListener('drop', function (e) {
      e.preventDefault();
      body.classList.remove('drag-over');
      const taskId = e.dataTransfer.getData('text/plain');
      const card = document.querySelector('.task-card[data-task-id="' + taskId + '"]');
      if (!card) return;
      body.appendChild(card);
      const task = findTask(taskId);
      if (task) task.columnId = body.getAttribute('data-column-id');
      updateColumnCounts();
    });
  });
}
function updateColumnCounts() {
  document.querySelectorAll('.board-column').forEach(function (columnEl) {
    const count = columnEl.querySelectorAll('.task-card').length;
    columnEl.querySelector('.board-column-count').textContent = count;
  });
}
function initAddTaskInline() {
  document.querySelectorAll('[data-add-task]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const columnId = btn.getAttribute('data-add-task');
      btn.classList.add('hidden');
      const form = document.querySelector('[data-add-task-form="' + columnId + '"]');
      form.classList.remove('hidden');
      form.querySelector('textarea').focus();
    });
  });
  document.querySelectorAll('[data-add-task-cancel]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const columnId = btn.getAttribute('data-add-task-cancel');
      document.querySelector('[data-add-task-form="' + columnId + '"]').classList.add('hidden');
      document.querySelector('[data-add-task="' + columnId + '"]').classList.remove('hidden');
    });
  });
  document.querySelectorAll('[data-add-task-submit]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const columnId = btn.getAttribute('data-add-task-submit');
      const form = document.querySelector('[data-add-task-form="' + columnId + '"]');
      const textarea = form.querySelector('textarea');
      const title = textarea.value.trim();
      if (!title) return;
      const task = {
        id: 't' + Date.now(), columnId: columnId, title: title, description: '',
        priority: 'medium', assigneeIds: [], labelIds: [], dueDate: null,
        checklistTotal: 0, checklistDone: 0, commentCount: 0, createdAt: new Date().toISOString(),
      };
      tasks.push(task);
      document.querySelector('.board-column-body[data-column-id="' + columnId + '"]').appendChild(buildTaskCard(task));
      textarea.value = '';
      form.classList.add('hidden');
      document.querySelector('[data-add-task="' + columnId + '"]').classList.remove('hidden');
      updateColumnCounts();
      showToast('Task created', '"' + title + '" was added.', 'success');
    });
  });
}

/* =========================================================
   13. TASK DRAWER
   ========================================================= */
function openTaskDrawer(taskId) {
  const drawer = document.getElementById('taskDrawer');
  const task = findTask(taskId);
  if (!drawer || !task) return;
  const p = priorityMeta[task.priority];

  drawer.querySelector('[data-drawer-title]').value = task.title;
  drawer.querySelector('[data-drawer-updated]').textContent = 'Updated ' + formatDateLong(task.createdAt.slice(0, 10));
  drawer.querySelector('[data-drawer-priority-icon]').setAttribute('data-icon', p.icon);
  drawer.querySelector('[data-drawer-priority-icon]').parentElement.style.color = p.color;
  drawer.querySelector('[data-drawer-priority-icon]').parentElement.style.background = p.bg;
  drawer.querySelector('[data-drawer-priority-label]').textContent = p.label;
  drawer.querySelector('[data-drawer-status]').value = task.columnId;
  drawer.querySelector('[data-drawer-priority-select]').value = task.priority;
  drawer.querySelector('[data-drawer-due]').value = task.dueDate || '';
  drawer.querySelector('[data-drawer-description]').value = task.description || '';
  drawer.querySelector('[data-drawer-assignees]').innerHTML = renderAvatarGroup(task.assigneeIds, 'sm');
  drawer.querySelector('[data-drawer-labels]').innerHTML = task.labelIds.map(function (id) {
    const l = findLabel(id);
    return '<span class="label-chip" style="color:' + l.color + ';background:' + l.color + '1a">' + l.name + '</span>';
  }).join('');

  const checklist = buildChecklist(task);
  const checklistItems = drawer.querySelector('[data-drawer-checklist-items]');
  checklistItems.innerHTML = checklist.map(function (item, i) {
    return '<label class="checklist-item' + (item.done ? ' done' : '') + '" data-index="' + i + '">' +
      '<input type="checkbox" class="checkbox"' + (item.done ? ' checked' : '') + '>' +
      '<span class="checklist-text">' + item.text + '</span></label>';
  }).join('');
  drawer.querySelector('[data-drawer-checklist-count]').textContent = checklist.length ? task.checklistDone + '/' + checklist.length : '';
  const progressFill = drawer.querySelector('[data-drawer-checklist-progress]');
  progressFill.parentElement.classList.toggle('hidden', checklist.length === 0);
  progressFill.style.width = (checklist.length ? Math.round((task.checklistDone / checklist.length) * 100) : 0) + '%';
  checklistItems.querySelectorAll('.checklist-item').forEach(function (item) {
    item.querySelector('.checkbox').addEventListener('change', function (e) {
      item.classList.toggle('done', e.target.checked);
    });
  });

  const comments = buildComments(task);
  const commentsList = drawer.querySelector('[data-drawer-comments-list]');
  drawer.querySelector('[data-drawer-comments-title]').textContent = 'Comments' + (comments.length ? ' (' + comments.length + ')' : '');
  if (comments.length === 0) {
    commentsList.innerHTML = '<div class="empty-state" style="padding:24px 0;"><p class="empty-state-title">No comments yet</p><p class="empty-state-desc">Start the discussion below.</p></div>';
  } else {
    commentsList.innerHTML = comments.map(function (c) {
      const author = findUser(c.authorId);
      return '<div class="comment-item"><span class="avatar avatar-sm" style="background:' + author.avatarColor + '">' + author.initials + '</span>' +
        '<div class="comment-body-wrap"><div class="comment-author-row"><span class="comment-author">' + author.name + '</span>' +
        '<span class="comment-time">' + formatRelativeHours(c.hoursAgo) + '</span></div>' +
        '<p class="comment-text">' + c.body + '</p></div></div>';
    }).join('');
  }

  const activity = buildActivity(task);
  drawer.querySelector('[data-drawer-activity]').innerHTML = activity.map(function (a) {
    const actor = findUser(a.actorId);
    return '<li class="timeline-item"><span class="timeline-icon action-' + a.action + '"><span class="icon icon-sm" data-icon="' + actionIcon[a.action] + '"></span></span>' +
      '<div class="timeline-content"><p class="timeline-text"><strong>' + (actor ? actor.name : 'Someone') + '</strong> ' + a.detail + '</p>' +
      '<p class="timeline-time">' + formatRelativeHours(a.hoursAgo) + '</p></div>' +
      (actor ? '<span class="timeline-actor-avatar avatar avatar-xs" style="background:' + actor.avatarColor + '">' + actor.initials + '</span>' : '') +
      '</li>';
  }).join('');

  drawer.dataset.taskId = task.id;
  drawer.classList.remove('hidden');
  renderIcons(drawer);
}

function initTaskDrawerControls() {
  const drawer = document.getElementById('taskDrawer');
  if (!drawer) return;
  const statusSelect = drawer.querySelector('[data-drawer-status]');
  if (statusSelect) {
    statusSelect.addEventListener('change', function () {
      const task = findTask(drawer.dataset.taskId);
      if (!task) return;
      task.columnId = statusSelect.value;
      const card = document.querySelector('.task-card[data-task-id="' + task.id + '"]');
      const targetBody = document.querySelector('.board-column-body[data-column-id="' + task.columnId + '"]');
      if (card && targetBody) { targetBody.appendChild(card); updateColumnCounts(); }
      showToast('Task updated', null, 'success');
    });
  }
  const prioritySelect = drawer.querySelector('[data-drawer-priority-select]');
  if (prioritySelect) {
    prioritySelect.addEventListener('change', function () {
      const task = findTask(drawer.dataset.taskId);
      if (!task) return;
      task.priority = prioritySelect.value;
      openTaskDrawer(task.id);
    });
  }
  const deleteBtn = drawer.querySelector('[data-drawer-delete]');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', function () {
      document.getElementById('confirmDeleteTaskModal').classList.remove('hidden');
    });
  }
  const confirmDelete = document.getElementById('confirmDeleteTaskModal');
  if (confirmDelete) {
    confirmDelete.querySelector('[data-confirm-delete-task]').addEventListener('click', function () {
      const taskId = drawer.dataset.taskId;
      const card = document.querySelector('.task-card[data-task-id="' + taskId + '"]');
      if (card) card.remove();
      const index = tasks.findIndex(function (t) { return t.id === taskId; });
      if (index !== -1) tasks.splice(index, 1);
      updateColumnCounts();
      confirmDelete.classList.add('hidden');
      drawer.classList.add('hidden');
      showToast('Task deleted', null, 'success');
    });
  }
}

/* Deep-link support: opening a page as project-board.html?task=p1-t5
   automatically opens that task's drawer — same idea as the React
   app's `?task=id` URL parameter. */
function openTaskFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const taskId = params.get('task');
  if (taskId && findTask(taskId) && document.getElementById('taskDrawer')) {
    openTaskDrawer(taskId);
  }
}

/* =========================================================
   14. LOGIN PAGE
   ========================================================= */
function initLoginPage() {
  const form = document.getElementById('loginForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      window.location.href = 'dashboard.html';
    });
  }
  document.querySelectorAll('[data-demo-login]').forEach(function (row) {
    row.addEventListener('click', function () { window.location.href = 'dashboard.html'; });
  });
}

/* =========================================================
   15. INIT
   ========================================================= */
document.addEventListener('DOMContentLoaded', function () {
  renderIcons();
  initSidebar();
  initDropdowns();
  initOverlays();
  initCommandPalette();
  initTabs();
  initSettingsNav();
  initFilterSearch();
  renderBoard();
  initTaskDrawerControls();
  openTaskFromUrl();
  initLoginPage();
});
