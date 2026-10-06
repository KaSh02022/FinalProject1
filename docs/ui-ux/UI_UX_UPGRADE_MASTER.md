# UI/UX UPGRADE MASTER

> **Single Source of Truth** cho toàn bộ quá trình nâng cấp UI/UX.
> Phiên làm việc mới: đọc file này trước tiên, sau đó đọc mục **Phase Status** và **Next Phase**.
> Cập nhật file này sau MỖI phase và sau MỖI quyết định thiết kế quan trọng.

| Mục | Giá trị |
|---|---|
| Cập nhật lần cuối | 2026-10-06 |
| Trạng thái hiện tại | **Phase A, B, C COMPLETED** (2026-10-06). Mọi kiểm thử cần dữ liệu thật: **BLOCKED — requires live backend** |
| Code đã sửa | Có — xem **Changed Files**. Git: baseline `a9ef6f4`, Phase A `4908de3`, Phase B `88caebf`, Phase C `a5701fe` |
| Phase triển khai kế tiếp | Phase D — Task Card (**chờ user cho phép**) |

---

## Project

**EprojectReactJs** — tên sản phẩm hiển thị: **TeamFlow** (Kanban quản lý công việc nhóm).

- Đường dẫn: `D:\Study\Aptech\EprojectReactJs`
- Không phải git repo (không có lịch sử commit → mọi thay đổi phải ghi rõ trong mục **Changed Files**).
- Backend: REST + Socket.IO tại `http://localhost:3000` (**không nằm trong thư mục này**, không tìm thấy trên máy trong lúc khảo sát).

---

## Current State

### 1. Tech stack (đã xác minh từ `package.json` + code)

| Hạng mục | Thực tế |
|---|---|
| Framework | React 19.3 + Vite 8 (rolldown), **JavaScript thuần** (không TypeScript) |
| UI library | **Không có**. Dùng bộ CSS tự viết (port từ prototype HTML trước đó) |
| CSS strategy | Global CSS thuần + CSS custom properties. 5 file trong `src/assets/style/` + `src/pages/Project/project.css` (2074 dòng) + **rất nhiều inline style** (~450 `style={{}}`, ~340 mã hex hard-code trong JSX) |
| Icon | `lucide-react` (đang dùng) + nhiều SVG inline copy tay. `react-icons` **cài nhưng không dùng** |
| Routing | `react-router-dom` v7, `BrowserRouter`, khai báo trong `src/App.jsx` |
| State | `useState`/`useMemo` cục bộ trong từng page; `localStorage` cho `user`/`token`; `window` CustomEvent `myTasksUpdated` để đồng bộ badge |
| API layer | `api.jsx` ở **root** (ngoài `src/`), dùng `fetch`. Một số component gọi `fetch` trực tiếp (Header, Nav, KPI) |
| Realtime | `socket.io-client` (`src/utils/socket.js`): `join_project`, `task_created/updated/moved/deleted`, `user_banned` |
| Drag & drop | `@hello-pangea/dnd` (Board) |
| Chart | `recharts` (ProjectChart). `chart.js` + `react-chartjs-2` **cài nhưng không dùng** |
| Khác | `axios` **cài nhưng không dùng** |
| Font | Inter qua **Google Fonts CDN** trong `index.html` |
| Build | `npm run build` OK — 1 chunk JS 948 KB (gzip 272 KB), CSS 70 KB |
| Lint | `oxlint`: **0 error / 65 warning** (unused vars, set-state-in-effect, exhaustive-deps) |
| Test / Typecheck | **Không có** |

### 2. Cấu trúc thư mục liên quan UI

```
index.html                         (title, Google Fonts CDN)
api.jsx                            (API layer — ngoài src/)
main.js                            (JS của prototype HTML cũ — KHÔNG được import, legacy)
src/
  main.jsx  App.jsx  App.css (CSS template Vite, không dùng)  index.css (template Vite, không import)
  Layouts/MainLayout.jsx           (shell cho /dashboard, /myTasks, /adminuser)
  components/layout/
    SideBar/SideBar.jsx, Nav/Nav.jsx
    Header/Header.jsx, DropdownHeader/DropdownHeader.jsx
  assets/style/
    style.css       (tokens + reset + button/badge/avatar/form)  ← design system gốc
    layouts.css     (app shell, sidebar, header, command palette, project header/tabs, settings)
    components.css  (stat card, project card, board, task card, modal, drawer, dropdown, tabs, calendar, toast…)
    responsive.css  (breakpoint 1279/1023/767/639)
    main.css        (CSS trang "home" của prototype, gần như không dùng)
  pages/
    Login, Register, ForgetPassword/(ResetPassword)
    Dashboard/ (Dasboard.jsx + KPI + OverViews/* + ProjectProgress/*)
    MyTasks/ (MyTasks.jsx 1087 dòng, FilterBar, Task)
    AdminUsers/
    Project/ Project.jsx (danh sách project), ProjectBoard.jsx (1769 dòng), ProjectList, ProjectCalendar,
             ProjectChart, ProjectOverview, ProjectSetting, project.css (2074 dòng)
```

### 3. Routing & màn hình chính

| Route | Page | Shell |
|---|---|---|
| `/`, `/login` | Login | Không shell |
| `/register`, `/forgot`, `/resetPassword` | Auth | Không shell |
| `/dashboard`, `/myTasks`, `/adminuser` | Dashboard, MyTasks, AdminUsers | `MainLayout` (Outlet) |
| `/project` | Project (danh sách) | **Tự render** `<SideBar/><Header/>` |
| `/projectboard/:id` … `/projectoverview/:id`, `/projectchart/:id`, `/projectlist/:id`, `/projectcalendar/:id`, `/projectsetting/:id` | Project sub-pages | **Mỗi page tự render** Sidebar + Header + project header + tab strip |

### 4. Kanban hiện tại (`ProjectBoard.jsx`)

- `DragDropContext` → mỗi column `Droppable` → mỗi task `Draggable` (toàn card là drag handle).
- Optimistic update khi kéo thả, rollback nếu `moveTask` lỗi. Kéo vào cột có tên chứa "done" → `action: 'accept'`.
- Quyền: `isManager` / `isLeader` / assignee mới kéo được task; Leader/Manager có nút ✕ "Not Accept" trên card ở cột Done.
- Thứ tự task trong cột theo `column.taskOrderIds`.
- Filter: search theo title + select "Week" (tuần tính từ `project.startDate`).
- Card hiển thị: title, badge trạng thái tiến độ (Overdue/Expiring/On Track), badge `W{n}`, badge `{n} pts`, priority (`priority-tag` — **không có CSS**), avatar assignee.
- Task detail = `TaskDrawer` (component nội bộ trong ProjectBoard.jsx): title, status, priority, points, week, assignee, description, checklist, comments, activity.
- Tạo task: modal `quickCreateTaskModal`.
- Realtime qua socket, có dedupe khi nhận `task_created`.

### 5. Component có thể tái sử dụng (đã có)

- CSS primitives trong `style.css`: `.btn` (primary/secondary/outline/ghost/danger, sm/lg), `.icon-btn`, `.badge` (6 tone), `.priority-badge`, `.avatar` (xs–lg) + `.avatar-group`, `.input/.textarea/.select`, `.field`, `.card`.
- `components.css`: `.board*`, `.task-card*`, `.modal-*`, `.drawer-*`, `.dropdown-*`, `.tabs/.pill-tabs`, `.empty-state/.error-state`, `.skeleton`, `.toast`, `.filter-bar/.filter-chip`, `.progress-bar`, `.stat-card`, `.panel`, `.timeline`, `.calendar-*`, `.command-palette-*` (CSS có nhưng chưa có React component).
- React: `SideBar`, `Nav`, `Header`, `DropdownHeader`. **Chưa có** component dùng chung kiểu `Avatar`, `Badge`, `Modal`, `Drawer`, `EmptyState`, `ProjectHeader`.

### 6. Giới hạn kỹ thuật cần lưu ý

1. **Không có backend để chạy thử** trong lúc khảo sát → Board/Dashboard chỉ xem được trạng thái rỗng/lỗi. Validation UI có dữ liệu thật cần user chạy backend (port 3000) hoặc cung cấp đường dẫn backend.
2. Không TypeScript, không test → regression chỉ bắt được bằng build + lint + kiểm tra trình duyệt thật.
3. Không git → cần backup/ghi Changed Files cẩn thận (đề xuất `git init` trước Phase A — **chờ user quyết**).
4. Import path sai hoa/thường: `components/layout/Sidebar/SideBar.jsx` và `Sidebar/Sidebar.jsx` trong khi thư mục thật là `SideBar/SideBar.jsx`. Chạy được trên Windows (không phân biệt hoa thường) nhưng **sẽ build lỗi trên Linux/CI**.
5. `project.css` là **bản sao gần như toàn bộ** design system global (≈130 selector trùng + `:root` token trùng) với breakpoint khác (1024/768 vs 1023/767) → thứ tự import CSS quyết định giao diện; sửa một nơi dễ bị nơi kia ghi đè.

---

## UI/UX Audit

Phương pháp: đọc code + chạy `vite` thật + chụp Edge headless ở 1280×800, 768×1024, 390×844 (không có backend → dữ liệu rỗng).
Mức độ: **Critical** (chặn sử dụng) · **High** (ảnh hưởng lớn trải nghiệm/nhất quán) · **Medium** · **Low**.

### Bảng tổng hợp vấn đề

| ID | Khu vực | Mức | Vấn đề | Nguyên nhân | Ảnh hưởng UX | Đề xuất | File liên quan |
|---|---|---|---|---|---|---|---|
| A-01 | W. Responsive / B. Sidebar | **Critical** | Ở ≤768px sidebar bị ẩn và **không có cách nào mở lại** — không có nút hamburger | (1) `responsive.css` cuối file có `.mobile-menu-btn{display:none}` đặt SAU media query → ghi đè; (2) `MainLayout` không truyền `onOpenSidebar`; (3) `SideBar` không nhận props `mobileOpen` (ProjectList có truyền nhưng bị bỏ qua) | Tablet dọc & mobile **mất toàn bộ điều hướng** | Shell dùng chung có state `mobileOpen`, overlay, nút menu; xoá rule ghi đè | `responsive.css`, `MainLayout.jsx`, `SideBar.jsx`, `Header.jsx`, các page Project* |
| A-02 | W. Responsive / C. Header | **Critical** | Ở 390px nội dung tràn ngang, avatar + chuông bị đẩy khỏi màn hình, card KPI bị cắt mép phải | Hai hệ breakpoint xung đột (`project.css` 1024/768 vs `responsive.css` 1023/767), nhiều width cố định inline (`260px`, `150px`, add-task `260px`) | Không dùng được trên mobile | Gộp 1 hệ breakpoint, bỏ width cố định inline, kiểm tra overflow từng vùng (cần đo bằng DevTools ở Phase B) | `project.css`, `responsive.css`, `KPI.jsx`, `ProjectBoard.jsx` |
| A-03 | V. Error state | **Critical** | API lỗi → Board hiện tiêu đề giả "Dự án", "0 members", vùng board trắng; Projects hiện "No projects found." | `fetchBoardData` nuốt lỗi (`.catch(() => null/[])`); Project list không phân biệt rỗng vs lỗi | Người dùng tưởng dữ liệu mất / project rỗng — **che giấu lỗi dữ liệu thật** | Error state rõ ràng + nút Retry; phân biệt empty vs error (chỉ sửa tầng hiển thị, giữ API) | `ProjectBoard.jsx`, `Project.jsx`, các Project* khác |
| A-04 | A. Layout / Architecture | **High** | Project pages không dùng `MainLayout`; mỗi page tự render Sidebar + Header + project header + tab strip (6 bản copy) | Route project nằm ngoài `<Route element={<MainLayout/>}>` | Nav "Projects" **không active** khi đang ở Board; header/tab lệch nhau giữa các trang; sửa 1 chỗ phải sửa 6 chỗ | Tách `ProjectHeader` + `ProjectTabs` dùng chung; đưa project routes vào layout chung (giữ nguyên URL) | `App.jsx`, 6 file `Project*.jsx` |
| A-05 | Design system | **High** | CSS trùng lặp: `project.css` copy lại ~130 selector + token của global CSS | Lịch sử port từ prototype HTML | Không nhất quán, khó bảo trì, rủi ro ghi đè ngẫu nhiên | Gộp về 1 nguồn token + component CSS; `project.css` chỉ giữ phần riêng của Project | `project.css`, `style.css`, `components.css`, `layouts.css` |
| A-06 | Design system | **High** | ~450 inline style + ~340 mã hex hard-code trong JSX | Code style nhanh, không dùng token | Không đổi theme được, màu lệch nhau (vd. badge Overdue dùng `#fca5a5`, token dùng `#fecaca`) | Chuyển dần inline → class dùng token, ưu tiên Board/Header/Nav | Toàn bộ `pages/*`, `Header.jsx`, `Nav.jsx` |
| G-01 | G. Task card | **High** | Card nhồi 4–5 badge cùng hàng tiêu đề (Overdue/Expiring/On Track + W + pts); tiêu đề bị ép hẹp | Tất cả metadata đặt chung `task-card-top` | Khó quét nhanh; "On Track" xuất hiện trên hầu hết card = nhiễu | Hierarchy mới: priority → title → meta row; chỉ hiện trạng thái khi bất thường (Overdue/Expiring); W/pts thành meta chữ nhỏ | `ProjectBoard.jsx`, `components.css` |
| G-02 | G. Task card / Q. Badge | **High** | Priority dùng class `priority-tag priority-*` **không tồn tại trong CSS** → hiển thị chữ trơn | Đổi tên class nhưng không có CSS | Không nhìn nhanh được priority — yêu cầu cốt lõi của Kanban | Dùng icon priority kiểu "signal bars"/màu token đã có (`--color-priority-*`) | `ProjectBoard.jsx`, `style.css` |
| G-03 | G. Task card / Z. Micro | **Medium** | Nút ✕ "Not Accept" đỏ tròn, đặt tuyệt đối giữa card | Inline style | Dễ bấm nhầm, phá layout (padding-right 32px), không rõ nghĩa | Chuyển thành action hiện khi hover/focus hoặc trong menu "…" của card, có label/tooltip | `ProjectBoard.jsx` |
| G-04 | G. Task card | **Medium** | Không hiển thị due date / tiến độ checklist / số comment trên card | Card chưa dùng dữ liệu có sẵn | Thiếu tín hiệu deadline nhanh | Thêm 1 meta row tối giản: due/week, checklist x/y (nếu có), assignee | `ProjectBoard.jsx` |
| E-01 | E. Kanban board | **High** | Không có column "status icon"/màu, header cột yếu; nút "+" header là ký tự text, class `btn-icon` khác hệ `.icon-btn` | Markup đơn giản | Khó phân biệt cột khi nhiều cột | Header cột: status icon theo loại cột (todo/in-progress/review/done) + tên + count + action "+"/"…" | `ProjectBoard.jsx`, `components.css` |
| E-02 | E/F. Board & Column | **High** | Board không chiếm hết chiều cao, mỗi cột không scroll độc lập theo viewport; nút "+ Add Task" width cố định 260px trong cột 300px | Inline style `width:260px`, `minHeight:150px` | Board nhiều task phải cuộn cả trang, mất header cột | Board full-height, column body scroll riêng, header cột sticky | `ProjectBoard.jsx`, `components.css`, `layouts.css` |
| E-03 | E. Drag & drop | **Medium** | Drop target chỉ đổi nền 5% opacity; card kéo được scale + translate inline; không có dấu hiệu card "không kéo được" | Inline style trong render | Feedback kéo thả yếu, phụ thuộc inline | Class `is-dragging`/`is-drag-over` dùng token; outline dashed cho drop zone; cursor `not-allowed`/icon khoá cho card không có quyền | `ProjectBoard.jsx`, `components.css` |
| E-04 | T. Empty state | **Medium** | Cột rỗng hiển thị chữ "Empty"/"Not found" | — | Lạnh, không hướng dẫn | Placeholder nhẹ "Kéo task vào đây" / "Không có task khớp bộ lọc" | `ProjectBoard.jsx` |
| H-01 | H. Task detail / L. Drawer | **High** | `TaskDrawer` bị **nhân bản** ở `ProjectBoard.jsx` và `MyTasks.jsx`; nhiều inline style | Copy-paste | Hai drawer có thể lệch hành vi/giao diện | Chỉ tách phần **trình bày** dùng chung (layout drawer, section, field) — giữ logic từng nơi nếu khác nhau; đánh giá kỹ trước khi gộp | `ProjectBoard.jsx`, `MyTasks.jsx` |
| H-02 | H/L. Drawer | **Medium** | Drawer mở/đóng không animation, không đóng bằng Esc, không focus trap, max-width 672px chiếm gần nửa màn hình | `hidden` class toggle | Cảm giác giật, khó dùng bàn phím | Slide-in 200ms, Esc để đóng, focus vào tiêu đề, return focus khi đóng | `ProjectBoard.jsx`, `components.css` |
| I-01 | I. Search | **Medium** | Icon search là emoji 🔍; MyTasks search có chừa padding nhưng **không có icon** | Placeholder | Thiếu nhất quán, emoji render khác nhau theo OS | Dùng `Search` của lucide trong `.input-icon-wrap` | `ProjectBoard.jsx`, `MyTasks.jsx` |
| J-01 | J. Filter | **Medium** | Select "All Weeks" bị dẹt (inline `height:100%`), không có chip hiển thị filter đang bật, không có "Clear" | Inline style | Người dùng không biết đang lọc | Filter bar: search + week select chuẩn height 32–36px + chip "Week 3 ×" + Clear all | `ProjectBoard.jsx` |
| K-01 | K. Sort | **Low** | Board không có sort/group | Tính năng chưa có | — | Không thêm tính năng mới ở đợt UI này; chỉ ghi nhận (xem Known Issues) | — |
| C-01 | C. Header | **Medium** | Header trống bên trái (không breadcrumb/tiêu đề trang), nút chuông nền xám tròn khác style `.icon-btn` | Inline style | Không biết đang ở đâu; header "lơ lửng" | Header: breadcrumb (Workspace › Project › Board) + search trigger + bell + avatar, dùng `.icon-btn` chung | `Header.jsx` |
| C-02 | S. Notification | **Medium** | Dropdown thông báo toàn inline style, không đóng bằng Esc, không `aria-expanded` | — | A11y kém, khó bảo trì | Dùng `.dropdown-menu` chung | `Header.jsx` |
| C-03 | C. Header | **Medium** | Header gọi API `/task/my-task` + **gọi `/project/:id` cho từng project**; Nav cũng gọi `/task/my-task` riêng → trùng API call | Mỗi component tự fetch | Chậm, nhiều request mỗi lần mở trang | Không thuộc phạm vi UI thuần — ghi Known Issue; chỉ xử lý nếu user đồng ý (rủi ro logic) | `Header.jsx`, `Nav.jsx` |
| B-01 | B. Sidebar | **Medium** | Nav active = khối tím đặc (`primary-600`), workspace name hard-code "Nang Cao Team", không có collapse trên desktop, không có danh sách project gần đây | Prototype | Nặng thị giác so với nội dung; điều hướng project phải qua trang Projects | Active state nhẹ (nền slate/indigo-50 + chữ đậm), nút collapse rail, mục "Projects" có thể mở rộng (chỉ dùng API sẵn có `fetchProjects`) | `SideBar.jsx`, `Nav.jsx`, `layouts.css` |
| B-02 | B. Sidebar | **Low** | Badge đỏ "My Tasks" inline style | — | — | Class `.nav-badge` | `Nav.jsx` |
| D-01 | D. Navigation | **Medium** | Project tabs icon 24px (to hơn chữ) | Class `icon icon-sm` gắn trực tiếp lên `<svg>` của lucide nhưng CSS chỉ nhắm `.icon-sm svg` | Tab nặng nề, lệch baseline | Quy ước icon: CSS áp cho cả `svg.icon-sm` hoặc truyền `size` | `style.css`, các Project* |
| M-01 | M. Dashboard | **High** | Dashboard gần như trống: "Welcome back, Cao" **hard-code**, 2 `grid-3` rỗng; các widget TodayTask/UCMDeadlines… chứa **dữ liệu mock tĩnh** và link `project-board.html` (không render) | Chưa hoàn thiện | Trang đầu tiên sau login nghèo nàn, sai tên người dùng | Lấy tên từ `localStorage.user`; layout dashboard dùng **chỉ API đã có** (portfolio, my-task); widget không có API thì **không hiển thị dữ liệu giả** | `Dasboard.jsx`, `KPI.jsx`, `OverViews/*`, `ProjectProgress/*` |
| M-02 | M. Dashboard | **Low** | Dùng `class=` thay `className` trong JSX; KPI dùng class Tailwind (`text-xs text-slate-400`) không tồn tại | — | Cảnh báo React, loading không style | Sửa khi chạm vào file | `Dasboard.jsx`, `KPI.jsx`, `MainLayout.jsx`… |
| U-01 | U. Loading | **Medium** | Loader dùng class `animate-spin` (Tailwind) **không tồn tại** → icon không quay; Board loading chiếm cả màn hình, mất shell | — | Trông như treo | Định nghĩa `.animate-spin` (hoặc dùng `.icon-spin` có sẵn); skeleton cột/card cho Board, giữ shell khi loading | `style.css`, `ProjectBoard.jsx` + 7 page khác |
| N-01 | N. Form / L. Modal | **Medium** | Modal tạo task: inline style, không Esc/focus trap, nút đóng thiếu `aria-label` | — | A11y, nhất quán | Chuẩn hoá `.modal-*`, Esc, autofocus field đầu | `ProjectBoard.jsx`, `Project.jsx` |
| O-01 | O/P. Button/Input | **Low** | Có `.btn-icon` (project.css) song song `.icon-btn` (style.css); nút "+ Add Task" ghép text "+" | — | Không nhất quán | Gộp về `.icon-btn`, dùng icon `Plus` | `project.css`, `ProjectBoard.jsx` |
| R-01 | R. Avatar | **Medium** | Avatar assignee trên card dùng `.task-assignee-avatar` riêng, không màu theo user, `gap:'-4px'` không hợp lệ; header avatar màu cố định `#4f46e5` | — | Khó nhận diện người | Avatar màu ổn định theo hash userId, dùng `.avatar` + `.avatar-group` có sẵn, giới hạn 3 + "+n" | `ProjectBoard.jsx`, `DropdownHeader.jsx` |
| X-01 | X. Accessibility | **High** | Toàn app chỉ ~16 thuộc tính `aria-*`; card là `div` có onClick, không role/tabIndex; dropdown không `aria-expanded`; không Esc cho overlay | — | Không dùng được bằng bàn phím | Card `role="button"`/`tabIndex=0` + Enter mở drawer (dnd hỗ trợ keyboard sẵn bằng Space); aria cho dropdown/drawer/modal | Board, Header, Drawer, Modal |
| X-02 | X. Contrast | **Medium** | `--color-text-subtle #94a3b8` trên nền trắng ≈ 2.6:1 dùng cho text thật (placeholder/meta) | Token | Khó đọc | Text phụ dùng tối thiểu `#64748b` (4.7:1); subtle chỉ cho icon/placeholder | `style.css` |
| Y-01 | Y. Visual hierarchy | **Medium** | Project header chiếm ~180px (tên + mô tả + 4 meta + tabs) trước khi tới board | — | Board — màn hình trọng tâm — bị đẩy xuống | Header project gọn 1 dòng (dot + tên + meta compact + actions), tabs cùng khối; mô tả chuyển sang Overview | `ProjectHeader` mới (tách từ 6 page) |
| Z-01 | Z. Micro-interaction | **Low** | Transition chỉ có ở vài chỗ, không tôn trọng `prefers-reduced-motion` | — | — | Token `--duration-fast/normal`, `--ease-out`; media query reduced-motion | `style.css` |
| F-01 | Font/Asset | **Low** | Inter tải qua Google Fonts CDN | `index.html` | Offline sẽ fallback system font | **Cần user quyết** (DEC-P02): giữ CDN hay self-host `.woff2` trong `public/fonts` | `index.html` |
| P-01 | Performance | **Low** | Bundle 948 KB một chunk; 4 package không dùng (axios, react-icons, chart.js, react-chartjs-2) | Không code-split | Tải lần đầu chậm | Ghi Known Issue; lazy route có thể làm ở Phase L nếu user đồng ý. **Không** tự gỡ package | `App.jsx`, `package.json` |

### Điểm mạnh nên giữ

- Đã có **token system** khá chuẩn (indigo/slate, spacing 4px, radius, shadow nhẹ) — đúng tinh thần Linear/Plane, chỉ cần hợp nhất và tinh chỉnh.
- Font Inter, cỡ chữ nền 14px — đúng mật độ SaaS.
- Login page sạch, căn giữa tốt.
- Drag & drop có optimistic update + rollback, realtime socket — **không đụng vào logic này**.

---

## Reference Analysis

6 ảnh tham khảo: Linear light (SDA board), Linear dark (Encom board + bulk action bar), Linear light (Active Cycle), Linear dark (All issues board), Linear dark (list view có filter chip), Notion "Cycles board" (dark, swimlane).

### Design principles rút ra

| Principle | Quan sát từ ảnh | Áp dụng cho TeamFlow |
|---|---|---|
| **Layout** | Sidebar ~220–240px nền hơi khác main; header mỏng ~48–56px chỉ có tiêu đề view + count + filter; board chiếm toàn bộ phần còn lại | Shell: sidebar 240px, header 52px, project header gọn, board full-height |
| **Spacing** | Grid 4/8px; card padding ~12px; khoảng giữa card 8–10px; giữa cột 12–16px; khoảng trắng nhiều quanh nội dung | Giữ scale `--space-*`, card padding 12, gap card 8, gap cột 12 |
| **Typography** | 1 font sans, 13–14px cho nội dung; title card 14px medium; ID/meta 12px màu muted; header cột 14px semibold + count muted cạnh bên | Scale: 12 / 13 / 14 / 16 / 20; title card 14/500; meta 12/400 muted |
| **Color** | Nền gần như đơn sắc (trắng/xám rất nhạt hoặc xám đen); **màu chỉ dùng cho tín hiệu**: icon trạng thái cột, chấm màu label, priority bars, accent tím cho nút chính | Neutral-first; màu = ý nghĩa (status, priority, label, overdue). Không gradient |
| **Component** | Badge dạng "pill viền mảnh" + chấm màu ("● Bug", "● Feature"); icon button ghost vuông nhỏ; avatar tròn 20–24px | Badge outline + dot; icon-btn ghost; avatar 20–24px |
| **Card** | Viền 1px rất nhạt, bo 6–8px, gần như không shadow; hierarchy: ID nhỏ → title → 1 hàng meta icon nhỏ; avatar góc trên phải | Card hierarchy theo yêu cầu: priority → title → description preview (1 dòng, tuỳ chọn) → labels → assignee + due |
| **Navigation** | Sidebar nhóm rõ: Search/Inbox/My issues → Favorites → Your teams (cây) → Projects; active = nền xám nhạt, không tô đặc màu | Nav active nhẹ; nhóm "Workspace" và "Projects"; project hiện tại được highlight |
| **Information density** | Cao nhưng thoáng: mỗi card 2–3 dòng, metadata bằng icon thay chữ | Giảm chữ trên card ("On Track", "pts") → icon + số |
| **Interaction** | Card selected có viền/nền accent (ảnh 2); bulk action bar nổi dưới đáy; "+" và "…" ở header cột; filter chip có thể xoá (ảnh 5) | Hover/focus/selected rõ; "+" header cột; filter chip có nút ×; (bulk select: ngoài phạm vi) |
| **Responsive** | (Suy luận) cột cố định ~280–340px, board cuộn ngang; ảnh 4 cho thấy cột cuối bị cắt → gợi ý cuộn | Cột 280–300px desktop, ~85vw mobile + scroll-snap; không thu cột nhỏ |
| **Notion swimlane (ảnh 6)** | Header cột dạng pill màu, nền cột tint theo status, nhóm theo hàng | Lấy ý tưởng **tint rất nhẹ** cho status icon, **không** tint cả cột (giảm nhiễu); swimlane ngoài phạm vi |

### Đối chiếu Current vs Reference

| Khu vực | Hiện tại | Tham khảo | Đề xuất |
|---|---|---|---|
| App shell | Project pages tự dựng shell; mobile mất nav | Shell thống nhất, sidebar cố định | 1 `AppShell` cho mọi trang đăng nhập; drawer sidebar mobile |
| Sidebar | Active tô tím đặc; workspace hard-code; không collapse | Active nền xám nhạt; nhóm mục; teams/projects dạng cây | Active nhẹ, collapse rail desktop, nhóm Projects |
| Header | Trống trái, chuông xám tròn | Tiêu đề view + count + Filter ngay header | Breadcrumb + view title; icon-btn ghost |
| Project header | 4 tầng thông tin ~180px | Không có — chỉ 1 dòng "Board 31 + Filter" | Gọn 1 dòng + tabs; mô tả sang Overview |
| Board | Không full-height, cột không scroll riêng | Full-height, cột scroll riêng | Full-height, column body scroll, header sticky |
| Column header | Tên + count + "+" text | Status icon màu + tên + count muted + "+" "…" | Status icon theo loại cột + count + "+" |
| Task card | 4–5 badge cạnh title, priority không style | ID → title → meta icon; avatar góc phải | priority → title → desc 1 dòng → labels → avatar + due |
| Priority | Chữ trơn | Signal bars icon xám/đậm; urgent "!" cam | Signal bars + màu token, Urgent nổi bật |
| Deadline | Chỉ "Overdue/Expiring/On Track" | Icon cycle + số | Due/week dạng meta; chỉ tô màu khi Overdue/Expiring |
| Labels | Không có (data không có labels) | Pill viền + dot màu | Dùng pattern pill cho W/points/status nếu cần; không bịa label |
| Assignee | Avatar cùng màu | Avatar ảnh/initials 20px góc phải | Initials màu ổn định theo user, max 3 + "+n" |
| Drag & drop | Nền 5% + scale inline | (Ảnh tĩnh) card selected viền accent | Drop zone dashed accent, card kéo nghiêng nhẹ + shadow-lg |
| Filter | Search emoji + select dẹt | "+ Filter" dashed, chip "Assignee is X ×" | Search lucide + week select + chip có × + Clear |
| Empty/Error | "Empty"/ẩn lỗi | — | Empty có hướng dẫn; Error + Retry |
| Dark mode | Không | Có (4/6 ảnh) | Token sẵn sàng dark; bật dark là phase tuỳ chọn (DEC-P03) |

---

## Design Direction

**"Calm, dense, signal-first"** — giao diện trung tính, yên tĩnh như Linear/Plane; màu chỉ xuất hiện khi mang ý nghĩa (trạng thái, priority, deadline, hành động chính). Ưu tiên tốc độ quét thông tin trên board hơn trang trí.

Nguyên tắc ưu tiên: Clarity > Decoration · Usability > Effects · Consistency > Đẹp từng component · Performance > Animation nặng · Maintainability > CSS "khéo".

**Không** sao chép Linear: giữ bản sắc TeamFlow (indigo `#4f46e5`, logo hiện tại, Inter), giữ khái niệm riêng của dự án (Week, Points, Leader accept/not-accept).

---

## Design System

> Nguyên tắc: **mở rộng token hiện có trong `style.css`**, không tạo hệ token mới. `style.css` là nguồn token duy nhất.

### Color system

| Nhóm | Token | Giá trị | Ghi chú |
|---|---|---|---|
| Brand | `--color-primary-50…900` | giữ nguyên indigo | Primary action, focus ring, active tab |
| Neutral | `--color-bg` | `#f8fafc` → cân nhắc `#f7f8fa` | Nền app |
| | `--color-surface` | `#ffffff` | Card, header, sidebar |
| | `--color-surface-sunken` *(mới)* | `#f1f5f9` | Nền cột board, input disabled |
| | `--color-border` / `-strong` | `#e2e8f0` / `#cbd5e1` | Giữ |
| | `--color-text` / `-muted` / `-subtle` | `#0f172a` / `#64748b` / `#94a3b8` | **subtle chỉ cho icon/placeholder** (contrast) |
| Status cột *(mới)* | `--status-backlog/todo/progress/review/done/canceled` | slate-400 / slate-500 / amber-500 / indigo-500 / green-600 / slate-400 | Map theo tên cột (có fallback) |
| Priority | `--color-priority-*` | giữ | Urgent/High/Medium/Low |
| Semantic | success/warning/danger/info | giữ | Overdue = danger, Expiring = warning |
| Overlay | `--color-overlay` *(mới)* | `rgb(15 23 42 / .4)` | Modal/drawer/sidebar mobile |

Dark mode: chuẩn bị bằng cách mọi màu đi qua token semantic; **bật dark** là quyết định riêng (DEC-P03).

### Typography

Inter; base 14px / line-height 1.5.
`--text-xs 12px` (meta, count) · `--text-sm 13px` (nav, badge, label) · `--text-base 14px` (body, card title) · `--text-md 16px` (section/modal title) · `--text-lg 20px` (page title).
Weight: 400 body · 500 card title/nav · 600 heading/column title. Số dùng `font-variant-numeric: tabular-nums` cho count/points.

### Spacing

Giữ `--space-1…6` (4px base), bổ sung `--space-8 32px`, `--space-10 40px`.
Quy ước: card padding 12 · gap trong card 8 · gap giữa card 8 · gap cột 12 · padding page 24 (desktop) / 16 (mobile).

### Border radius

`--radius-sm 6` (badge, chip, icon-btn nhỏ) · `--radius-md 8` (button, input, card) · `--radius-lg 10` (column) · `--radius-xl 12` (modal, panel) · `--radius-full`.
Task card **8px** (giảm từ 10) cho cảm giác sắc gọn kiểu Linear.

### Shadow / elevation

| Level | Dùng cho | Token |
|---|---|---|
| 0 | Card nghỉ | viền 1px, `--shadow-xs` |
| 1 | Card hover | `--shadow-sm` + viền `border-strong` |
| 2 | Dropdown, popover | `--shadow-md` |
| 3 | Card đang kéo, modal, drawer | `--shadow-lg` |

### Motion

`--duration-fast 120ms` (hover, màu) · `--duration-normal 200ms` (drawer, modal, sidebar) · `--ease-out cubic-bezier(.16,1,.3,1)`.
Bắt buộc `@media (prefers-reduced-motion: reduce)` tắt transform/animation.

### Icon strategy

- **Chỉ dùng `lucide-react`** (đã cài). SVG inline copy tay → thay dần bằng component lucide khi chạm file.
- Kích thước: 14 (meta trong card) · 16 (button, tab, nav) · 18 (icon-btn header).
- Truyền `size` trực tiếp hoặc sửa CSS cho `svg.icon-*` (sửa lỗi D-01).
- Không dùng emoji làm icon. Không cài thêm icon library.

---

## Component Strategy

Quy tắc: tìm component/CSS có sẵn → reuse → refactor → chỉ tạo mới khi thật cần. **Không** đưa vào UI library mới (Tailwind/shadcn/MUI) — project đã có CSS system riêng, thêm library = viết lại toàn bộ (vi phạm nguyên tắc 1).

### Component React dự kiến tách (tối thiểu, đều là trình bày — không chứa logic API)

| Component | Lý do | Thay thế cho |
|---|---|---|
| `ProjectHeader` (+ tabs) | 6 bản copy | header + `project-tabs` trong 6 file `Project*.jsx` |
| `AppShell` / mở rộng `MainLayout` | Shell thống nhất + sidebar mobile | Sidebar/Header tự render trong Project pages |
| `Avatar` / `AvatarGroup` | Lặp ở card, drawer, header, project card | `.task-assignee-avatar`, avatar inline |
| `PriorityIcon` | Priority hiện không có style | `priority-tag` |
| `EmptyState` / `ErrorState` | Lặp nhiều kiểu | các khối "Empty"/"Not found"/"No projects" |
| `TaskCard` | Tách khỏi ProjectBoard 1769 dòng để dễ đọc | JSX card inline trong ProjectBoard |

Component **không** tạo mới: Button, Input, Badge (dùng class CSS có sẵn là đủ).

### CSS

- `style.css` = tokens + primitives (nguồn duy nhất).
- `layouts.css` = shell, sidebar, header, project header.
- `components.css` = board, card, modal, drawer, dropdown, states.
- `responsive.css` = 1 hệ breakpoint duy nhất.
- `project.css` = chỉ phần riêng Project (calendar, settings, overview…) — **xoá phần trùng sau khi đối chiếu từng selector**.

---

## Kanban UX

### Board

- Full-height dưới project header; cuộn ngang mượt; cột cuối có padding phải để không dính mép.
- Filter bar ngay trên board, sticky: `[🔍 Search] [Week ▾] [chip đang lọc ×] [Clear]` ……… `[+ New task]`.
- Hiển thị tổng số task đang hiển thị / tổng (vd. "12 / 31") khi có filter.

### Column

```
┌────────────────────────────────┐
│ ◐ In Progress   5        +  ⋯ │  ← status icon màu, tên 14/600, count muted, actions hiện rõ khi hover
├────────────────────────────────┤
│  [card]                        │  ← body scroll riêng, header sticky
│  [card]                        │
│  + Add task                    │  ← ghost, full width
└────────────────────────────────┘
```

- Width 288px desktop; nền `--color-surface-sunken` rất nhạt; bo 10px.
- Status icon map theo tên cột (todo/progress/review/done) — fallback chấm xám. Không đổi data.
- "⋯" chỉ thêm nếu có hành động thật đã tồn tại; không tạo menu rỗng.

### Task card — hierarchy

```
┌────────────────────────────────┐
│ ▂▄▆ High            [Overdue]  │  ← priority icon+label 12px; badge trạng thái CHỈ khi Overdue/Expiring
│ Implement login API            │  ← title 14/500, tối đa 2 dòng
│ Mô tả ngắn một dòng…           │  ← description preview 12px muted, 1 dòng (chỉ khi có)
│ W3 · 5 pts · ☑ 2/4             │  ← meta 12px muted, icon 14px
│ 📅 12/10              (CS)(QL) │  ← due/week end date + avatar group (max 3 +n)
└────────────────────────────────┘
```

- Bỏ badge "On Track" (trạng thái mặc định = không hiển thị) → giảm nhiễu (DEC-002).
- Card states: **rest** (viền nhạt) · **hover** (viền strong + shadow-sm) · **focus-visible** (ring indigo 2px) · **dragging** (shadow-lg, nghiêng 1–2°, opacity 1) · **locked** (không có quyền kéo: cursor pointer, icon khoá nhỏ hiện khi hover) · **selected/open** (đang mở trong drawer: viền indigo).
- Nút "Not Accept" (Leader/Manager, cột Done): chuyển thành icon-btn nhỏ có tooltip + `aria-label`, hiện khi hover/focus; luôn hiện trên thiết bị cảm ứng. **Giữ nguyên handler `handleLeaderDecisionOnTask`.**

### Drag & drop

- Drop zone đang hover: nền `--color-primary-50` + viền dashed `--color-primary-300`.
- Placeholder giữ chiều cao (dnd lo) → không nhảy layout.
- Không thay đổi `handleOnDragEnd`, payload `moveTask`, quyền `isDragDisabled`.
- Chuyển style kéo thả từ inline sang class, **giữ nguyên** `provided.draggableProps.style` (bắt buộc cho dnd).

### Task detail (Drawer)

- Panel phải 560px (desktop), full-screen (mobile); slide-in 200ms; Esc đóng; focus title.
- Bố cục: header (priority, trạng thái lưu, close) → title lớn → **properties 2 cột dạng "label : value"** (Status, Priority, Points, Week, Assignee) → Description → Checklist (progress) → Comments → Activity.
- Giữ nguyên toàn bộ handler cập nhật/xoá/checklist/comment.

---

## Responsive Strategy

Một hệ breakpoint duy nhất (giữ theo `responsive.css`): **sm 640 · md 768 · lg 1024 · xl 1280**.

| Viewport | Sidebar | Header | Board | Card / Drawer / Modal |
|---|---|---|---|---|
| ≥1280 | Full 240px, có nút collapse | Đầy đủ breadcrumb | Cột 288px | Drawer 560px, modal 480px |
| 1024–1279 | Full, collapse được | Đầy đủ | Cột 280px | như trên |
| 768–1023 | Icon rail 64px (tooltip) | Breadcrumb rút gọn | Cột 272px, cuộn ngang | Drawer 560px / tối đa 90vw |
| <768 | **Off-canvas drawer + nút hamburger + overlay** | Hamburger + tên trang + bell + avatar | Cột **~85vw**, `scroll-snap-type: x mandatory`, thấy mép cột kế bên | Drawer full-screen; modal dạng sheet full-width |

- Mobile Kanban **không** thu cột nhỏ, không chuyển thành list tự động (DEC-004).
- Touch: card target ≥ 44px, action luôn hiện (không phụ thuộc hover). `@hello-pangea/dnd` hỗ trợ long-press trên touch.
- Kiểm tra bắt buộc mỗi phase: **1280×800, 1024×768, 768×1024, 390×844, 375×812**: không scroll ngang toàn trang (trừ board), không text tràn, không nút bị đẩy khỏi màn hình, sticky header không che nội dung.

---

## Accessibility Strategy

- Mục tiêu: WCAG 2.1 AA ở những gì chạm tới.
- Contrast: text ≥ 4.5:1 (`--color-text-muted` là mức thấp nhất cho text).
- Focus: `:focus-visible` ring indigo đã có — đảm bảo không bị inline style/`outline:none` ghi đè.
- Keyboard: card `tabIndex=0` + Enter mở drawer; Space để kéo (dnd hỗ trợ sẵn); Esc đóng drawer/modal/dropdown/sidebar mobile; trả focus về phần tử mở.
- ARIA: `aria-expanded`/`aria-haspopup` cho dropdown; `role="dialog" aria-modal aria-labelledby` cho modal/drawer; `aria-label` cho mọi icon-btn; `aria-current="page"` cho nav/tab active (NavLink có sẵn).
- Không truyền thông tin chỉ bằng màu: priority có icon + chữ; overdue có chữ.
- `prefers-reduced-motion`.

---

## Upgrade Roadmap

> Thứ tự đã điều chỉnh theo thực tế: **sửa nền móng + lỗi Critical trước**, rồi mới tới Board (màn hình trọng tâm).
> Mọi phase: không đổi API/backend/data model; không gỡ package; giữ URL route.

### Phase A — Design Foundation & CSS Consolidation
- **Objective**: một nguồn token + primitives; loại bỏ xung đột CSS là gốc rễ lỗi responsive.
- **Files**: `src/assets/style/style.css`, `components.css`, `layouts.css`, `responsive.css`, `src/pages/Project/project.css`, `index.html` (chỉ nếu DEC-P02 = self-host).
- **Changes**: bổ sung token (surface-sunken, status, overlay, motion, text scale); định nghĩa `.animate-spin`; sửa icon sizing `svg.icon-*`; gộp breakpoint về 1 hệ; xoá selector trùng trong `project.css` (đối chiếu từng selector, giữ bản đang thắng cascade để không đổi giao diện ngoài ý muốn); reduced-motion.
- **Risk**: **Cao nhất về CSS** — `project.css` đang ghi đè global ở trang Project; xoá sai → vỡ giao diện Calendar/Setting/Overview. Giảm rủi ro: chụp ảnh trước/sau tất cả route ở 5 viewport.
- **Validation**: build + lint (không tăng warning); chụp ảnh 11 route × 5 viewport so sánh trước/sau.
- **Acceptance**: không còn `:root` trùng; 1 hệ breakpoint; spinner quay; icon tab 16px; không có thay đổi giao diện ngoài các điểm đã liệt kê.

### Phase B — App Shell / Sidebar / Header (sửa Critical A-01, A-02, A-04)
- **Objective**: điều hướng dùng được ở mọi viewport; shell thống nhất.
- **Files**: `App.jsx` (chỉ cấu trúc `<Route>` lồng, **giữ nguyên path**), `Layouts/MainLayout.jsx`, `SideBar.jsx`, `Nav.jsx`, `Header.jsx`, `DropdownHeader.jsx`, 7 file `Project*.jsx` (bỏ Sidebar/Header tự render), `layouts.css`, `responsive.css`; sửa import path hoa/thường.
- **Changes**: state sidebar mobile/collapse trong layout; hamburger + overlay + Esc; nav active nhẹ, "Projects" active cho mọi `/project*`; header breadcrumb; dropdown/notification dùng class chung + aria. Giữ nguyên logic fetch badge (C-03 chỉ ghi nhận).
- **Risk**: Trung bình — đưa project routes vào layout có thể tạo double header nếu sót 1 page; `Header` nhận `onOpenModal` từ vài page.
- **Validation**: điều hướng giữa tất cả route; mở/đóng sidebar mobile; 5 viewport; không tràn ngang.
- **Acceptance**: nav truy cập được ở 375px; không còn page tự render Sidebar/Header; active state đúng.

### Phase C — Project Header + Kanban Board & Column
- **Objective**: board là trung tâm, full-height, cột rõ ràng.
- **Files**: component mới `ProjectHeader` (vd. `src/components/project/ProjectHeader.jsx`), 7 file `Project*.jsx` (thay khối header/tabs), `ProjectBoard.jsx` (markup board/column/filter bar), `components.css`.
- **Changes**: project header gọn; filter bar (lucide search, select chuẩn, chip, Clear); column header status icon + count + "+"; column scroll riêng, header sticky; empty column placeholder; error state + Retry, loading skeleton giữ shell (A-03).
- **Risk**: Trung bình — đụng file 1769 dòng; không được chạm `handleOnDragEnd`, socket, quyền.
- **Validation**: kéo thả trong/giữa cột (cần backend), search/week filter, tạo task từ header cột, realtime 2 tab.
- **Acceptance**: board full-height, cột scroll độc lập, lỗi API hiện Error state thay vì dữ liệu giả.

### Phase D — Task Card
- **Objective**: card quét nhanh priority/deadline/assignee.
- **Files**: `TaskCard` (tách từ ProjectBoard), `Avatar`/`AvatarGroup`, `PriorityIcon`, `components.css`, `style.css`.
- **Changes**: hierarchy mới; bỏ "On Track"; meta W/pts/checklist; avatar màu theo user; trạng thái hover/focus/dragging/locked/open; nút Not Accept dạng icon-btn có tooltip.
- **Risk**: Trung bình — phải truyền đúng `provided`/`snapshot` của dnd; giữ `isDragDisabled`.
- **Validation**: kéo thả, mở drawer bằng click + Enter, card có/không assignee/description/checklist, title rất dài.
- **Acceptance**: priority + deadline + assignee nhìn được trong < 1 giây; không layout jump khi kéo.

### Phase E — Task Detail Drawer
- **Objective**: drawer đẹp, dùng bàn phím được, nhất quán giữa Board và MyTasks.
- **Files**: `ProjectBoard.jsx` (TaskDrawer), `MyTasks.jsx` (TaskDrawer bản sao), `components.css`.
- **Changes**: layout properties 2 cột, section rõ, slide-in, Esc, focus; chỉ chia sẻ **phần trình bày** — gộp logic chỉ khi đã so sánh 2 bản và user đồng ý (DEC-P04).
- **Risk**: Cao nếu gộp logic; Thấp nếu chỉ CSS/markup.
- **Validation**: sửa từng field, checklist, comment, xoá task, assignee search — ở cả Board và MyTasks.
- **Acceptance**: 2 drawer cùng giao diện; mọi thao tác cũ vẫn hoạt động.

### Phase F — Projects list, MyTasks, Search/Filter consistency
- **Objective**: đồng bộ filter/search/list/project card với design system.
- **Files**: `Project.jsx`, `MyTasks.jsx`, `MyTasks/FilterBar`, `MyTasks/Task`, `ProjectList.jsx`, `components.css`.
- **Changes**: project card (progress, avatar group, hover); empty vs error; search icon; pill tabs; list row.
- **Risk**: Thấp–Trung bình.
- **Acceptance**: mọi search có icon; mọi list có empty + error state riêng.

### Phase G — Dashboard
- **Objective**: dashboard hữu ích **chỉ với dữ liệu thật** sẵn có.
- **Files**: `Dasboard.jsx`, `KPI.jsx`, `OverViews/*`, `ProjectProgress/*`.
- **Changes**: chào theo tên user thật; KPI; widget dựa trên `/task/my-task` (task sắp hạn, quá hạn) — API đã tồn tại; widget mock không có API → **không render** (ghi Known Issue), sửa `class` → `className`.
- **Risk**: Thấp. Không thêm endpoint.
- **Acceptance**: không còn dữ liệu giả/hard-code tên.

### Phase H — Forms / Modal / Auth / Settings / Admin
- **Files**: modal tạo task (ProjectBoard, Project), `Login`, `Register`, `ForgetPassword`, `ResetPassword`, `ProjectSetting`, `AdminUsers`.
- **Changes**: chuẩn hoá `.field`/`.modal-*`, Esc, autofocus, thông báo lỗi inline, loading button.
- **Acceptance**: mọi form cùng một phong cách; submit/validate như cũ.

### Phase I — Responsive pass (toàn app)
- Kiểm tra lại toàn bộ 11 route × 5 viewport sau khi các phase trên xong; mobile board scroll-snap; drawer/modal mobile; Calendar/Chart overflow.

### Phase J — Accessibility pass
- Contrast, focus, aria, keyboard flow toàn app; kiểm tra bằng bàn phím thuần.

### Phase K — Micro-interaction & (tuỳ chọn) Dark mode
- Transition token, skeleton, toast; dark mode chỉ khi DEC-P03 = có.

### Phase L — Final Visual QA
- Chụp ảnh toàn bộ, so sánh với Design System; dọn inline style còn sót ở khu vực đã chạm; build/lint; cập nhật tài liệu. (Code-split/gỡ package không dùng: chỉ khi user đồng ý.)

---

## Phase Status

| Phase | Tên | Trạng thái |
|---|---|---|
| 0 | Khảo sát project | ✅ COMPLETED (2026-10-06) |
| 1 | Audit giao diện hiện tại | ✅ COMPLETED (2026-10-06) |
| 2 | Phân tích ảnh tham khảo | ✅ COMPLETED (2026-10-06) |
| 3 | Đề xuất thiết kế | ✅ COMPLETED (2026-10-06) |
| 4 | Tạo tài liệu master | ✅ COMPLETED (2026-10-06) |
| 5 | Roadmap | ✅ COMPLETED (2026-10-06) |
| A | Design Foundation & CSS Consolidation | ✅ COMPLETED (2026-10-06) |
| B | App Shell / Sidebar / Header (+ API error state) | ✅ COMPLETED (2026-10-06) — phần cần dữ liệu thật: BLOCKED |
| C | Project Header + Kanban Board | ✅ COMPLETED (2026-10-06) — phần cần dữ liệu thật: BLOCKED |
| D | Task Card | ⬜ |
| E | Task Detail Drawer | ⬜ |
| F | Projects / MyTasks / Filter | ⬜ |
| G | Dashboard | ⬜ |
| H | Forms / Modal / Auth / Settings | ⬜ |
| I | Responsive pass | ⬜ |
| J | Accessibility pass | ⬜ |
| K | Micro-interaction (+ dark mode tuỳ chọn) | ⬜ |
| L | Final Visual QA | ⬜ |

### Phase 0–5 — COMPLETED

- **Objective**: hiểu project, audit, rút nguyên tắc từ ảnh tham khảo, đề xuất thiết kế, lập roadmap.
- **Implemented**: chỉ tạo tài liệu này. Cài `node_modules` bằng `npm ci` (theo lockfile, không đổi `package.json`/lockfile) để chạy build/lint/dev; đã xoá thư mục `dist/` sinh ra khi build thử.
- **Changed files**: `docs/ui-ux/UI_UX_UPGRADE_MASTER.md` (mới).
- **Validation**: xem mục Validation.
- **Issues**: không có backend để xem board có dữ liệu.
- **Next phase**: Phase A (chờ duyệt).

### Bước 0 — Git baseline — COMPLETED

- Project chưa có Git → `git init` (branch `master`).
- `.gitignore` đã có `node_modules`, `dist`, `*.log`, `*.local`; **bổ sung**: `.qa/`, `qa-screenshots/`, `*.tmp`, `.env`, `.env.*`.
- Danh tính Git: dùng cấu hình **toàn cục sẵn có** của máy (`Cao Son`) — không tạo danh tính mới, không sửa cấu hình Git.
- Baseline commit: **`a9ef6f4` — "chore: baseline before ui ux upgrade"** (55 file, gồm cả tài liệu Phase 0–5). Không có `node_modules`/`dist` trong commit.
- Rollback về trước nâng cấp: `git checkout a9ef6f4 -- .`

### Phase A — Design Foundation & CSS Consolidation — COMPLETED

**Objective**: một nguồn token + primitives, giảm trùng lặp CSS mà không gây regression, font local, bổ sung utility bị thiếu.

**Phương pháp kiểm chứng (dùng lại cho các phase sau)** — script QA nằm ngoài repo (scratchpad của phiên); mô tả để tái tạo:
1. *Specimen diff*: với **mỗi selector** trong stylesheet đang chạy (591 selector, gồm 43 tổ hợp class lấy từ `className` trong JSX), dựng 1 phần tử DOM khớp selector (pseudo-class `:hover/:focus/...` được ép bằng rule nhân bản ngay sau rule gốc để giữ vị trí cascade), đo ~90 thuộc tính computed style ở 5 viewport, so trước/sau. Cách này bao phủ cả UI không render được do thiếu backend (task card, modal, drawer…).
2. *Page dump diff*: computed style + toạ độ của **mọi phần tử** (8.435 phần tử) trên 13 route × 5 viewport.
3. *Overflow/console QA*: đo `scrollWidth` của document và các container (`.app-main`, `.page-content`, `.header`, `.project-header`), phần tử ra ngoài viewport, nút menu, lỗi console; chụp ảnh. Viewport giả lập bằng CDP `Emulation.setDeviceMetricsOverride` (Chrome headless).
Chạy 2 lần trên cùng code cho diff = 0 → công cụ ổn định.

**Implemented**

1. **Gộp CSS trùng lặp** (`project.css` → CSS chung), tự động bằng PostCSS + kiểm chứng:
   - `project.css` nằm **cuối bundle** → giá trị của nó là giá trị đang hiệu lực trên mọi trang. Quy tắc gộp: chép giá trị `project.css` đè lên rule gốc cùng selector trong `style/layouts/components.css`, rồi xoá khỏi `project.css`.
   - **192 selector** đã gộp (gồm 74 trùng y hệt), `:root` trùng đã gỡ.
   - Lần gộp đầu, specimen diff phát hiện **27 khác biệt** do dời vị trí cascade (vd. `.btn` của project.css đang đè `gap` của `.btn-sm`; `.avatar` đè kích thước `.avatar-xs`; `.mobile-menu-btn`, `.header-search`, `.project-header` đè media query của responsive.css). → Hoàn tác, **giữ nguyên các họ `.btn*`, `.avatar*`, `.mobile-menu-btn`, `.header-search*`, `.project-header` trong project.css**, gộp lại → **diff = 0**.
   - Dọn sau gộp: bỏ khai báo thừa, rule tách lặp giá trị rule nhóm, 37 tiêu đề section rỗng; viết lại header file `project.css` mô tả đúng vai trò.
   - Kết quả: `project.css` 2074 → **~730 dòng**; CSS bundle 70.22 KB → **61.96 KB**.
   - **Chưa gộp** (có chủ đích): 2 khối media `max-width: 1024px / 768px` của project.css (điều khiển sidebar/header mobile, xung đột với hệ 1023/767 của responsive.css) → **Phase B**, vì gắn trực tiếp với lỗi điều hướng mobile.
2. **Token** (chỉ bổ sung, không đổi giá trị cũ) trong `style.css`: `--space-8/10`, `--color-surface-sunken`, `--color-on-primary`, `--color-overlay`, `--status-*` (6 trạng thái cột), `--font-sans`, `--text-xs…lg`, `--duration-fast/normal`, `--ease-out`, thang `--z-*`, `--color-priority-high-text/medium-text`.
3. **Hex → token** trong `layouts.css`, `components.css`, `responsive.css`, `project.css`: chỉ thay khi **giá trị bằng nhau tuyệt đối** (`#e2e8f0`→`--color-border`, `#cbd5e1`, `#94a3b8`, `#f1f5f9`, `#f8fafc`, `#fff`→`--color-surface`/`--color-on-primary`, `rgb(15 23 42/.4)`→`--color-overlay`, `9999px`→`--radius-full`). Bảng màu label (`#ffedd5`…) giữ nguyên.
4. **Font Inter local** (DEC-P02): 3 file woff2 variable (latin, latin-ext, **vietnamese**) + LICENSE (SIL OFL) tại `src/assets/fonts/inter/`; `@font-face` ở đầu `style.css` (`font-display: swap`, `unicode-range`). Gỡ `preconnect` + stylesheet Google Fonts khỏi `index.html`. `body` dùng `--font-sans` (fallback: system-ui, Segoe UI, Roboto, Helvetica Neue, Arial).
5. **Utility thiếu**: `.animate-spin` (spinner `Loader2` ở 8 page trước đây không quay); `svg.icon` + `svg.icon.icon-xs…xl` (lucide đặt class lên chính `<svg>` nên rule cũ `.icon-sm svg` không áp dụng → icon 24px); `.priority-tag.priority-{low,medium,high,urgent}` (class đang dùng trên task card nhưng chưa từng có CSS); `prefers-reduced-motion`.
6. **Regression do chính Phase A gây ra và đã sửa**: trước đây icon 24px trong tab project bị flexbox ép về 0px ở mobile (vô tình ẩn); khi icon có kích thước đúng, thanh tab tràn 449px ở 390px. Sửa gốc: `.project-tabs` cuộn ngang (ẩn scrollbar), `.project-tab` không co/xuống dòng.

**Changed files (Phase A)**: `index.html`, `src/assets/style/style.css`, `layouts.css`, `components.css`, `responsive.css`, `src/pages/Project/project.css`; mới: `src/assets/fonts/inter/*` (3 woff2 + LICENSE.txt). **Không sửa file JSX nào.**

**Validation (Phase A)**

| Kiểm tra | Kết quả |
|---|---|
| `npm run build` | ✅ PASS — JS 948.40 KB (không đổi), CSS **61.96 KB** (từ 70.22), 3 font woff2 được bundle; không còn tham chiếu `fonts.googleapis/gstatic` |
| `npm run lint` | ✅ 0 error, **65 warning** (bằng baseline) |
| Specimen diff (591 selector × 5 viewport) | ✅ Chỉ 2 loại khác biệt **có chủ đích**: `font-family` (chuỗi fallback mới) và bán kính pill `9999px→999px` (hình dạng giống hệt) |
| Page dump diff (8.435 phần tử × 65 trang) | ✅ Chỉ khác biệt có chủ đích: font-family; icon lucide `icon-sm` 24→14px, `icon` 24→18px và dịch chuyển vị trí nhỏ kéo theo (tab project thấp hơn ~4px) |
| Font trong trình duyệt | ✅ 3 face Inter `loaded`, request font tới `localhost:5179`, không có request ra ngoài; glyph tiếng Việt dùng subset vietnamese |
| Overflow 5 viewport | ✅ Không có tràn mới. **Cải thiện**: `app-main`/`project-header` hết tràn ở 375px. Tràn bên trong `.page-content` (Board/List/Chart/Setting/MyTasks ở ≤390px) **giống baseline** → Phase B |
| Console | Không có lỗi mới. Lỗi có sẵn: `class`→`className` (MainLayout/Dashboard) |

**Technical debt còn lại sau Phase A**
- Họ `.btn*`, `.avatar*` vẫn ở `project.css` vì đang đè rule chung qua thứ tự cascade. Hệ quả thực tế hiện tại: `.avatar-xs` hiển thị **32px** (thay vì 20px), `.checklist-add-btn` bị `.btn` đè `display`/`color`. Chỉ chuyển khi chấp nhận thay đổi hiển thị có chủ đích (Phase D/F/H).
- ~450 inline style và ~340 hex trong JSX **chưa đụng** (Phase A không sửa JSX).
- Breakpoint kép (1024/768 vs 1023/767) → Phase B.

### Phase B — App Shell / Sidebar / Header — COMPLETED

**Objective**: một App Shell thống nhất, điều hướng dùng được ở mọi viewport, sửa 3 lỗi Critical (sidebar mobile, tràn 390px, lỗi API bị trình bày thành dữ liệu giả/rỗng).

**Implemented**

1. **MainLayout = App Shell duy nhất** (refactor file có sẵn, không tạo AppShell mới):
   - 7 route Project (`/project`, `/projectboard/:id`, `/projectlist/:id`, `/projectcalendar/:id`, `/projectsetting/:id`, `/projectoverview/:id`, `/projectchart/:id`) được lồng vào `<Route element={<MainLayout/>}>` — **path giữ nguyên**.
   - Gỡ Sidebar/Header tự dựng khỏi 7 trang bằng script có bộ so khớp thẻ JSX: chỉ thay wrapper `app-shell`/`app-main` bằng Fragment, xoá `<Sidebar/>`, `<Header/>`, import và state sidebar chết. **Không đổi nội dung trang.** Import sai hoa/thường (`Sidebar/Sidebar.jsx`) biến mất cùng lúc (KI-02 đã xử lý).
   - Modal/drawer của các trang (vốn là anh em trong `app-shell`) giờ nằm trong `app-main` — đều `position: fixed` nên không đổi hiển thị.
   - State sidebar trong MainLayout: `collapsed` (desktop, lưu `localStorage['tf.sidebarCollapsed']`, đọc/ghi bọc try/catch), `mobileOpen`. Đóng drawer khi: bấm backdrop, nút ✕, **Esc**, **mọi điều hướng kể cả Back/Forward** (so `location.key` trong lúc render — pattern chuẩn của React, không thêm effect), và khi rời layout mobile (xoay/đổi kích thước). Khi mở: `body` + `.page-content` không cuộn; focus vào nút ✕; khi đóng: focus về nút menu.
2. **Sidebar** (`SideBar.jsx`, `Nav.jsx`, `layouts.css`, `responsive.css`):
   - Desktop ≥1024: 260px, nút **Collapse** → rail 72px. Tablet 768–1023: rail 72px (tooltip qua `title`). Mobile <768: drawer `min(280px, 85vw)` + backdrop + nút ✕; khi đóng có `inert` + `visibility: hidden` (không Tab vào được); khi mở `role="dialog" aria-modal`.
   - Active state nhẹ (`primary-50` + chữ `primary-700` đậm) thay cho khối tím đặc. **"Projects" active trên mọi route `/project*`** (trước đây mất active khi vào Board).
   - Badge "My Tasks" dùng class `.nav-badge` (bỏ inline style; ở dạng rail thành chấm đếm góc icon).
3. **Header** (`Header.jsx`, `DropdownHeader.jsx`):
   - Trái: nút menu (chỉ <768, `aria-controls`/`aria-expanded`) + ngữ cảnh trang lấy từ route (**không gọi thêm API**): "Dashboard", "Projects / Board"… (mobile chỉ hiện mục cuối).
   - Phải: chuông + avatar. Popover thông báo chuyển từ ~40 dòng inline style sang class `.notif-*`; rộng `min(320px, 100vw − 24px)`; Esc/click ngoài để đóng; `aria-expanded`. **Logic fetch task sắp hết hạn giữ nguyên.**
   - Menu tài khoản: đóng khi click ngoài/Esc; **bỏ dữ liệu giả** khi thiếu user (`no-email@domain.com`, role `member`) — chỉ hiện những gì có trong `localStorage.user`; avatar không còn hex cứng. Logic đăng xuất giữ nguyên.
   - Prop `onOpenModal` (trước truyền vào Header nhưng DropdownHeader không dùng) đã bỏ — không mất chức năng.
4. **Hợp nhất breakpoint** (DEC-015): 2 khối media 1024/768 của `project.css` + `.mobile-menu-btn{display:none}` (thủ phạm Critical #1) đã gỡ; giá trị đang hiệu lực được chuyển vào `responsive.css` (1279/1023/767/639).
5. **API error ≠ empty ≠ dữ liệu giả** (Critical #3) — `src/components/common/ErrorState.jsx` (dùng lại CSS `.error-state`, thêm biến thể inline) + `src/utils/requestState.js` (`withFallback`: **giữ nguyên giá trị fallback cũ** nên logic trang không đổi, nhưng ghi nhận request thất bại; `failureMessage`):
   | Trang | Lỗi "lõi" → Error State + Retry | Lỗi phụ → cảnh báo inline (trang vẫn dùng được) |
   |---|---|---|
   | Board | project, columns, tasks | members |
   | Backlog (List) | project, columns, tasks (columns lỗi sẽ khiến mọi task bị coi là backlog) | members |
   | Calendar | project, tasks | members, notes |
   | Settings | project, members (tránh **form trống có thể lưu đè** dữ liệu thật) | tasks, columns |
   | Overview | project | tasks, members |
   | Chart | project, tasks, columns (biểu đồ từ dữ liệu lỗi = số 0 giả) | members |
   | Projects | danh sách project | — |
   | Admin Users | danh sách user (thêm kiểm tra `res.ok`; trước đây lỗi JSON → `users.filter` crash) | — |
   | Dashboard KPI | portfolio (trước hiện 0 / 0% / $0 khi lỗi) | — |
   Retry: gọi lại đúng hàm tải sẵn có (`fetchBoardData`, `loadData`, `loadProjects`); Overview/Chart/KPI/AdminUsers tải trong `useEffect` nên Retry tăng `reloadKey` (dependency của effect) — **không viết lại logic tải**. Loading toàn màn hình `minHeight: 100vh` đổi thành `.page-loading` bên trong shell.
6. **Dashboard**: bỏ "Welcome back, Cao" viết cứng → lấy `username/name` từ `localStorage.user`, thiếu thì "Welcome back" (không tạo tên giả). `class=` → `className=` (hết lỗi console `Invalid DOM property`, KI-13 phần MainLayout/Dashboard).
7. **Tràn ngang mobile**: thanh tab project (Phase A) và pill tabs MyTasks cuộn ngang trong vùng của chúng; padding mobile của `.project-header` giờ có hiệu lực (trước bị project.css chặn).
8. **Lỗi phát hiện & sửa trong lúc QA Phase B**: (a) nút hamburger + nút ✕ **hiện trên desktop** vì `.icon-btn{display:inline-flex}` (style.css, nạp sau layouts.css) đè `display:none` — trước đây bị che bởi project.css → tăng độ đặc hiệu `.header .mobile-menu-btn`, `.sidebar .sidebar-close-btn`; (b) bấm **Back** trên mobile mở lại drawer → reset theo `location.key`; (c) `activeModal` chết trong ProjectSetting (sinh thêm 1 cảnh báo lint) → gỡ.

**Compatibility strategy**: đã chuyển **cả 7** trang Project trong Phase B vì phần chuyển là cơ học (wrapper), xác minh được bằng build + QA; không cần tách đợt.

**Validation (Phase B)**

| Kiểm tra | Kết quả |
|---|---|
| `npm run build` | ✅ PASS — JS 948.69 KB (gzip 273.26), CSS 65.66 KB |
| `npm run lint` | ✅ 0 error, **59 warning** (baseline 65). So danh sách theo file+rule với commit baseline: **không có cảnh báo mới** |
| Viewport QA 13 route × 5 viewport (CDP) | ✅ Không tràn ngang document/`.app-main`/`.page-content`/`.header`; chuông + avatar luôn trong viewport; hamburger chỉ hiện <768; 1280 & 1024 sidebar 260px, 768 rail 72px, 390/375 drawer |
| Sidebar mobile (tự động, 10 trang × 2 viewport) | ✅ mở bằng nút menu, có backdrop, body bị khoá cuộn, Esc đóng, cuộn được mở lại |
| Interaction QA (30 kiểm tra) | ✅ 30/30: collapse desktop + lưu trạng thái; popover thông báo (Esc); menu tài khoản (click ngoài, không có danh tính giả); Retry gọi lại 4 API thật; Projects/Board hiện Error State; "Projects" active trên trang con; breadcrumb; không còn header/sidebar trùng; drawer: inert khi đóng, focus vào ✕, backdrop/✕/điều hướng/Back/đổi kích thước đều đóng đúng, focus trả về nút menu; popover thông báo nằm trong viewport 390px |
| Regression trang không thuộc phạm vi | ✅ Login/Register/Forgot: page dump so với cuối Phase A = **0 khác biệt** |
| Console | ✅ Không có exception / lỗi console mới (chỉ còn lỗi mạng do không có backend). Lỗi `class`→`className` đã hết |
| Board với dữ liệu thật (kéo thả, task card, drawer, modal, realtime) | ⛔ **BLOCKED — backend unavailable (DEC-P06)**. Không ghi PASS |
| Nhánh "thành công" của mọi trang (dữ liệu thật hiển thị trong shell mới) | ⛔ **BLOCKED** — chỉ kiểm được nhánh loading/error |

**Viewport results (Phase B)**: 1280×800 ✅ · 1024×768 ✅ (sidebar đầy đủ — trước đây là rail do breakpoint 1024 của project.css) · 768×1024 ✅ rail (trước đây sidebar **biến mất, không có cách mở**) · 390×844 ✅ drawer · 375×812 ✅ drawer.


# Phase C — COMPLETED

> Ngày: 2026-10-06 · commit code `a5701fe`. Phạm vi: Project Header dùng chung, Board toolbar, cấu trúc Kanban, responsive, visual kéo thả.
> Không đổi API, payload, socket, quyền kéo thả, `handleOnDragEnd`, `moveTask`, route. Không mock data.

## Objective

Màn hình Project/Kanban gọn, rõ thứ bậc, board chiếm toàn bộ phần còn lại của viewport, cột có chiều rộng nhất quán và tự cuộn, responsive tới 375px, nhất quán với foundation Phase A và App Shell Phase B; giảm trùng lặp code (header lặp 6 lần) và không để `ProjectBoard.jsx` phình thêm.

## Project Header

- Khảo sát 6 khối header (Board, Backlog, Calendar, Settings, Overview, Chart): **cấu trúc giống hệt** (chấm màu + tên + mô tả + 4 meta + nút Settings + 5 tab). Khác nhau chỉ ở: tab active, cách mỗi trang định dạng ngày (đã tính sẵn), chữ fallback ("Dự án"/"Project"), Chart có loading riêng cho header.
- Tạo `src/components/project/ProjectHeader.jsx` — **không fetch, không tự tạo dữ liệu**: trang truyền `project`, `memberCount`, `taskCount` (đúng như trang đang đếm — Backlog đếm task backlog), `startDate`/`endDate` (chuỗi trang đã định dạng), `loading` (Chart). Tab active + trạng thái nút Settings suy từ route (`useLocation`).
- Bố cục: hàng 1 = **chấm màu + tên (1 dòng, ellipsis) + meta dạng chip** (`n members`, `n tasks`, `start – end`) … **nút Settings** bên phải; mô tả 1 dòng mờ (ellipsis + `title` đầy đủ, ẩn nếu không có — thay cho chữ giữ chỗ "No description"); hàng 2 = tab. Tên rỗng → "Untitled project" (nhãn trung tính, không phải dữ liệu giả).
- Chiều cao header (đo bằng fixture): desktop 127px (trước ~180px), tablet 155px, mobile 179px.
- a11y: `aria-current` cho tab/nút Settings, `aria-label` cho nav tab, nút Settings, danh sách meta.

## Board Toolbar

- `src/pages/Project/board/BoardToolbar.jsx` (thuần trình bày, state/logic lọc vẫn ở trang).
- **KI-15 đã sửa**: bỏ width cố định inline (`260px`, `150px`, nút `260px`). Desktop: `[search (≤320px, co giãn)] [Week ▾] ……… [+ Add task]` (flex-wrap). Mobile (<768): search chiếm 1 hàng; select tuần + nút Add task cùng hàng; chip ở dưới.
- Emoji 🔍 → icon lucide `Search`; select có icon `ChevronDown` (trước không có mũi tên); select tuần đang lọc có trạng thái active (nền indigo nhạt).
- **Chip bộ lọc đang áp dụng**: "Search: “…” ×", "Week N ×", "Clear all" (khi ≥2 bộ lọc) — có hover, focus-visible, nút × có `aria-label`.
- **Chỉ dùng 2 bộ lọc có sẵn** (search theo tên, tuần). Sort / Assignee / Priority là **tính năng mới** → không tự thêm (xem DEC-024).

## Kanban Structure

```
main.page-content.page-content--board   (flex column, không tự cuộn)
├── BoardToolbar                        (cố định)
└── .board                              (flex:1, cuộn NGANG, bleed tới mép trang)
    └── .board-column  ×N               (cao bằng board, rộng nhất quán)
        ├── BoardColumnHeader           status icon · tên · số task (data thật) · [+]
        ├── .board-column-body          (Droppable, cuộn DỌC riêng)
        │   └── .task-card ×n            (nội dung card giữ nguyên — Phase D)
        └── .add-task-btn
```
- `BoardColumnHeader.jsx` + `columnStatus.js`: icon/màu trạng thái suy từ **tên cột** (to do ○, in progress ◌·, review ◉, done ✓, canceled ✕, backlog ◌; tên lạ → trung tính). Chỉ ảnh hưởng hiển thị. Màu dùng token `--status-*`.
- Số task = `columnTasks.length` (dữ liệu thật sau lọc), không hard-code.
- Bỏ hack `.board.scroll-x { height: calc(100vh - 200px) }` trong project.css và `max-height: calc(100vh - 280px)` của thân cột; thay bằng flex đúng nghĩa (đo được: khoảng trống đáy board = 0px ở cả 5 viewport).
- Cột rỗng: "No tasks yet" / "No tasks match the filters" (khi đang lọc) — ẩn khi đang có card kéo qua để placeholder thả không bị đẩy xuống.
- Nút "+" header cột: `.icon-btn` + icon `Plus` + `aria-label` (trước là ký tự "+", class `btn-icon` riêng). Nút "Add task" cuối cột: bỏ `width:260px`.

## Responsive

| Viewport | Cột | Board | Toolbar | Header |
|---|---|---|---|---|
| ≥1024 | 288px | gap 12, cuộn ngang khi thiếu chỗ | 1 hàng | 1 hàng (tên + meta) + tab |
| 768–1023 | 272px | gap 10, gutter 20px | 1 hàng (wrap nếu cần) | meta xuống dòng khi tên dài |
| <768 | `min(85vw, 320px)` + `scroll-snap-type: x proximity` | thấy trọn 1 cột + mép cột kế (vuốt ngang) | search / week + add / chip | tên 16px ellipsis, meta wrap, tab cuộn ngang |

- Lỗi tab tràn ở mobile (Phase A) **không tái phát**: tab nằm trong vùng cuộn riêng (`tabsScrollable: true` ở 390/375).
- Bỏ `touch-action: pan-y` (gộp từ project.css ở Phase A) trên thân cột → vuốt ngang trên cột giờ cuộn được board trên mobile.
- Double padding (KI-20) **đã xử lý cho trang Board** (một lớp padding duy nhất + board bleed). Các trang khác giữ nguyên (KI-20 còn mở).

## Drag & Drop Visual Changes

Chỉ đổi **trình bày**; `handleOnDragEnd`, `moveTask` + payload, `isDragDisabled` (quyền), socket: **không đổi**.
- Card: inline style (opacity, transform ghép `scale/translateY` vào transform của dnd, boxShadow, transition ghi đè transition của dnd, cursor, margin, nền, bo góc) → class `task-card is-draggable|is-locked [is-dragging]` + `style={provided.draggableProps.style}` **nguyên vẹn**. Đang kéo: viền indigo, `--shadow-lg`, `rotate: 1.5deg` (thuộc tính `rotate` cộng dồn với transform của dnd thay vì ghi đè), cursor `grabbing`. Card không có quyền kéo: cursor `pointer`.
- CSS card không transition `transform` (để dnd tự animate).
- Cột nhận thả: `is-drop-target` = nền `--color-primary-50` + **outline** dashed indigo (outline không chiếm chỗ → không nhảy layout).
- **Sửa nguyên nhân giật layout khi kéo**: thân cột trước dùng flex `gap: 8px` **cộng** `margin-bottom: 8px` trên card — `@hello-pangea/dnd` không đo `gap`, nên khi kéo các card dịch sai vị trí. Nay chỉ dùng margin (đo: khoảng cách card = 8px).

## Components Added

| Component | Vị trí | Vai trò |
|---|---|---|
| `ProjectHeader` | `src/components/project/ProjectHeader.jsx` | Header + tab dùng chung 6 trang Project |
| `BoardToolbar` | `src/pages/Project/board/BoardToolbar.jsx` | Search, lọc tuần, chip, Add task |
| `BoardColumnHeader` | `src/pages/Project/board/BoardColumnHeader.jsx` | Status icon, tên, số task, nút + |
| `getColumnStatus` | `src/pages/Project/board/columnStatus.js` | Map tên cột → icon/màu (tách riêng để không vi phạm fast-refresh) |

Không tạo component trùng: dùng lại `.input-icon-wrap`, `.select-wrap`, `.icon-btn`, `.btn`, `.filter-chip*`, `ErrorState` (Phase B).

## Components Refactored

- `ProjectBoard.jsx` (1764 → 1699 dòng): dùng `ProjectHeader`, `BoardToolbar`, `BoardColumnHeader`; drag state bằng class; `page-content--board`. Data states Phase B giữ nguyên (LOADING / ERROR + Retry / EMPTY / SUCCESS).
- `ProjectList`, `ProjectCalendar`, `ProjectSetting`, `ProjectOverview`, `ProjectChart`: thay khối header ~40–50 dòng bằng `<ProjectHeader …/>`, gỡ import icon/`Link` không còn dùng. (Tổng: 6 file −318/+73 dòng ở bước này.)

## Changed Files

| File | Loại | Ghi chú |
|---|---|---|
| `src/components/project/ProjectHeader.jsx` | Mới | Header dùng chung |
| `src/pages/Project/board/BoardToolbar.jsx` | Mới | Toolbar Board |
| `src/pages/Project/board/BoardColumnHeader.jsx` | Mới | Header cột |
| `src/pages/Project/board/columnStatus.js` | Mới | Map trạng thái cột |
| `src/pages/Project/ProjectBoard.jsx` | Sửa | Toolbar/cột/header mới, drag class |
| `src/pages/Project/{ProjectList,ProjectCalendar,ProjectSetting,ProjectOverview,ProjectChart}.jsx` | Sửa | Dùng `ProjectHeader` |
| `src/assets/style/layouts.css` | Sửa | CSS Project Header |
| `src/assets/style/components.css` | Sửa | Board, cột, toolbar, chip, drag states, add-task |
| `src/assets/style/responsive.css` | Sửa | Tablet/mobile cho header + board |
| `src/pages/Project/project.css` | Sửa | Bỏ hack chiều cao board |

## Validation

### PASS (đã thực sự kiểm chứng)

| Kiểm tra | Kết quả |
|---|---|
| `npm run build` | ✅ PASS — JS 944.00 KB (gzip 272.83), CSS 69.96 KB |
| `npm run lint` | ✅ 0 error, **59 warning** — so theo file+rule với commit Phase B `181813a`: **không có cảnh báo mới** (phát sinh 5 cảnh báo trong lúc làm — 4 import icon thừa, 1 fast-refresh — đã sửa hết) |
| Console | ✅ Không có exception / lỗi console mới (chỉ lỗi mạng do không có backend) |
| Data states khi backend tắt (6 trang Project) | ✅ Board, Backlog, Calendar, Settings, Overview, Chart đều hiện **ErrorState + Retry**, **không** render header/dữ liệu giả (đúng như mong đợi) |
| Viewport QA thật 8 route × 5 viewport (CDP) | ✅ Không tràn ngang document/`.app-main`/`.page-content`; hamburger chỉ <768; drawer mobile mở/đóng/khóa cuộn/Esc OK |
| Shell interaction (bộ 30 kiểm tra Phase B) | ✅ 30/30 vẫn PASS (gồm Retry gọi lại API thật, nav active, breadcrumb, drawer, popover) |
| Regression trang ngoài phạm vi (Dashboard, MyTasks, Admin, Projects, Login/Register/Forgot) | ✅ Page dump so với cuối Phase B: **0 khác biệt** |
| **CSS layout fixture** (DOM cùng cấu trúc class với JSX, tiêm vào shell thật trong trình duyệt QA, không nằm trong repo) — 5 viewport | ✅ Board lấp đầy chiều cao (khoảng trống đáy 0px); `.page-content` không cuộn; board cuộn ngang; cột dài cuộn dọc riêng; cột ngắn cao bằng board; khoảng cách card 8px (margin); không card tràn ngang; cột 288/288/272/320/319px; mobile thấy trọn 1 cột; header không tràn, nút Settings trong viewport, tab cuộn ngang ở 390/375; toolbar mobile: search 1 hàng, week + Add cùng hàng; class `is-drop-target`/`is-dragging` cho đúng nền/outline/rotate/cursor và **không đổi kích thước** cột |

Lưu ý: fixture **chỉ chứng minh CSS/layout**, không chứng minh dữ liệu, kéo thả hay logic.

### BLOCKED — requires live backend

| Hạng mục | Trạng thái |
|---|---|
| SUCCESS DATA STATE của Board/Header/Backlog/Calendar/Settings/Overview/Chart trong app thật | ⛔ **SUCCESS DATA STATE — BLOCKED BY BACKEND** |
| Kanban với dữ liệu thật (cột/task thật, số đếm thật) | ⛔ BLOCKED — requires live backend |
| Drag & drop thật (`handleOnDragEnd`, `moveTask`, rollback, quyền `isDragDisabled`, auto-scroll khi kéo trong board cuộn ngang + scroll-snap mobile) | ⛔ BLOCKED — requires live backend |
| Realtime socket (task_created/updated/moved/deleted) | ⛔ BLOCKED — requires live backend |
| Task card với dữ liệu thật, Task Drawer, modal tạo task | ⛔ BLOCKED — requires live backend |
| Bộ lọc search/tuần trên dữ liệu thật, chip xoá bộ lọc | ⛔ BLOCKED — requires live backend (logic lọc không đổi) |
| Loading state của Board trong app (chỉ thấy thoáng qua trước khi lỗi) | ⚠️ Chỉ quan sát được dạng chuyển tiếp, không nghiệm thu riêng |

### Screenshot QA

- Trước/sau Phase C với backend tắt: cả hai đều là **ErrorState** (giống nhau — đúng kỳ vọng).
- Ảnh fixture (layout CSS): desktop 1280 thấy 4+ cột, cột "To Do" dài tự cuộn, cột rỗng có ô gợi ý viền đứt, chip lọc + "Clear all"; 390px: header 2 dòng meta, tab cuộn, toolbar 2 hàng, 1 cột đầy đủ + mép cột kế. Ảnh **không** dùng để kết luận dữ liệu thật.

## Backend Blockers

Giữ nguyên DEC-P06: không có backend cổng 3000 → mọi nghiệm thu cần dữ liệu thật ở trên là **BLOCKED**. Khi có backend cần chạy: kéo thả trong/giữa cột (kể cả ở 390px với scroll-snap), rollback khi `moveTask` lỗi, card không có quyền không kéo được, Leader "Not Accept" ở cột Done, realtime 2 tab, search/tuần + chip, Add task từ toolbar và từ header cột.

## Known Issues

- **KI-15 ✅ đã sửa** (filter bar width cố định).
- **KI-20 ◐ một phần**: double padding đã xử lý ở Board; các trang khác (main có padding inline) còn lại → Phase F.
- **KI-21 (mới)**: Board chưa có Sort / Assignee / Priority filter — cần user quyết vì là tính năng mới (DEC-024).
- **KI-22 (mới)**: icon trạng thái cột suy từ tên cột (cột do người dùng đặt tên) → tên lạ hiển thị icon trung tính. Nếu backend có trường trạng thái/vị trí chuẩn, nên map theo trường đó.
- **KI-23 (mới)**: Nội dung task card (badge W/pts/On Track, nút "Not Accept" tuyệt đối, avatar `.task-assignee-avatar`) vẫn inline style — **Phase D**.
- **KI-24 (mới)**: Ở tablet/desktop hẹp, tên project dài khiến meta xuống dòng (header 155px) — chấp nhận để không cắt tên quá sớm.
- KI-12 (`.avatar-xs` 32px), KI-16 (workspace tĩnh), KI-17 (project card hiện 0) — **không đụng** trong Phase C theo yêu cầu.

## Decisions

- **DEC-022 (Phase C)**: `ProjectHeader` là component trình bày thuần: không fetch, nhận giá trị trang đã tính/định dạng; tab active suy từ route. Nằm ở `src/components/project/` vì dùng chung 6 trang.
- **DEC-023 (Phase C)**: Component chỉ Board dùng (`BoardToolbar`, `BoardColumnHeader`, `columnStatus`) đặt cạnh trang tại `src/pages/Project/board/`.
- **DEC-024 (Phase C)**: Không thêm Sort/Assignee/Priority filter (tính năng mới, chưa được duyệt); toolbar đã có chỗ để thêm nhóm control khi được duyệt.
- **DEC-025 (Phase C)**: Kanban layout = `page-content--board` không cuộn + board cuộn ngang + thân cột cuộn dọc; cột 288 / 272 / `min(85vw,320px)` + scroll-snap proximity trên mobile.
- **DEC-026 (Phase C)**: Khoảng cách card trong cột chỉ dùng margin (không flex gap) vì @hello-pangea/dnd; drop target dùng outline; card kéo dùng `rotate` (không ghi đè transform của dnd); không transition `transform` trong CSS card.
- **DEC-027 (Phase C)**: Header bỏ chữ giữ chỗ "No description"/"no description" (ẩn khi rỗng); tên rỗng hiện "Untitled project".

## Next Phase

**Phase D — Task Card** — chỉ bắt đầu khi user cho phép.

Đề xuất:
1. Tách `TaskCard` khỏi `ProjectBoard.jsx` (component trình bày; giữ nguyên `Draggable`, `provided`, `snapshot`, quyền, handler).
2. Hierarchy: priority (`.priority-tag` đã có CSS từ Phase A) → tiêu đề (2 dòng) → meta 1 hàng (tuần · điểm · checklist nếu có) → trạng thái hạn **chỉ khi Overdue/Expiring** (bỏ badge "On Track", DEC-002) → avatar group.
3. Avatar: dùng `.avatar` + `.avatar-group`, màu ổn định theo user, tối đa 3 + "+n"; xử lý KI-12 (`.avatar-xs`) vì card dùng trực tiếp.
4. Nút "Not Accept" (Leader/Manager, cột Done): icon-btn có nhãn/tooltip, hiện khi hover/focus, luôn hiện trên cảm ứng; **giữ nguyên** `handleLeaderDecisionOnTask`.
5. Card: `role="button"`/`tabIndex`, Enter mở drawer.
6. Nghiệm thu card với dữ liệu thật vẫn **BLOCKED** cho tới khi có backend; Phase D chỉ có thể kiểm bằng build/lint/fixture CSS.

---

## Decisions

### Đã chốt (đề xuất mặc định — user có thể bác bỏ khi duyệt)

- **DEC-001**: Không thêm UI library/CSS framework (Tailwind, MUI, shadcn…). Nâng cấp trên CSS system hiện có. *Lý do*: tránh viết lại toàn bộ, project đã có token system tốt.
- **DEC-002**: Task card giảm metadata: bỏ badge "On Track", chỉ hiện trạng thái khi Overdue/Expiring; W/points thành meta nhỏ. *Lý do*: readability, signal-first.
- **DEC-003**: Không gradient mạnh, không glassmorphism; màu chỉ dùng cho tín hiệu.
- **DEC-004**: Mobile dùng board cuộn ngang, cột ~85vw + scroll-snap; không thu nhỏ cột, không tự đổi sang list.
- **DEC-005**: `style.css` là nguồn token duy nhất; `project.css` chỉ giữ phần riêng Project.
- **DEC-006**: Một hệ breakpoint: 640 / 768 / 1024 / 1280.
- **DEC-007**: Icon chỉ dùng `lucide-react`; không emoji làm icon; không cài icon library khác.
- **DEC-008**: Sidebar: full (desktop) → icon rail (768–1023) → off-canvas drawer (<768). Active state nền nhạt thay vì tô đặc.
- **DEC-009**: Không đổi API, payload, socket event, quyền kéo thả, route path. Refactor chỉ ở tầng trình bày.
- **DEC-010**: Không hiển thị dữ liệu mock/hard-code; widget thiếu API thì ẩn và ghi Known Issue.
- **DEC-011**: Lỗi API phải hiện Error state (có Retry), không giả làm trạng thái rỗng.
- **DEC-P01 — Git baseline — APPROVED (2026-10-06)**: `git init` + baseline commit `a9ef6f4` trước khi sửa UI; không đưa build/node_modules/file tạm vào Git; dùng danh tính Git sẵn có, không sửa cấu hình toàn cục.
- **DEC-P02 — Local Inter — APPROVED (2026-10-06)**: bỏ Google Fonts CDN; Inter variable woff2 (latin, latin-ext, vietnamese) trong `src/assets/fonts/inter/`, `@font-face` trong `style.css`; giữ typography hiện tại, fallback system-ui/Segoe UI/Roboto/Arial.
- **DEC-P06 — Backend unavailable / no mock data — BLOCKED (2026-10-06)**: không đoán vị trí backend, không tạo backend, không đổi API endpoint, không tạo mock data, không che lỗi API bằng empty state. Phần cần dữ liệu thật ghi **BLOCKED**; QA Board với dữ liệu thật làm khi có backend.
- **DEC-012 (Phase A)**: Gộp CSS chỉ được chấp nhận khi specimen diff + page dump diff = 0 (hoặc chỉ còn khác biệt có chủ đích đã liệt kê). Selector mà việc dời vị trí làm đổi cascade thì **giữ lại** trong project.css và ghi nợ kỹ thuật.
- **DEC-013 (Phase A)**: Font giữ tên family `'Inter'` (không đổi sang `'Inter Variable'`) để mọi chỗ đang khai báo `'Inter'` tiếp tục đúng.
- **DEC-014 (Phase A)**: Icon lucide định kích thước qua `svg.icon.icon-*`; `icon` mặc định 18px, `icon-sm` 14px. Chấp nhận thay đổi hiển thị này (sửa lỗi D-01).
- **DEC-015 (Phase A)**: Khối media 1024/768 của project.css **không** gộp ở Phase A; hợp nhất breakpoint làm ở Phase B cùng sidebar mobile.
- **DEC-016 (Phase B)**: `MainLayout` là App Shell duy nhất cho mọi trang đăng nhập (kể cả 7 trang Project); trang con không tự render Sidebar/Header. Path route không đổi.
- **DEC-017 (Phase B)**: Đúng 1 hệ breakpoint ở `responsive.css`; hệ quả có chủ đích ở **đúng 1024px** (giờ sidebar đầy đủ) và **đúng 768px** (giờ rail thay vì sidebar biến mất).
- **DEC-018 (Phase B)**: Lỗi request: "lõi" (không có thì nội dung trang sai) → Error State + Retry thay cả trang; "phụ" → cảnh báo inline, trang vẫn dùng được. Dùng `withFallback` để không đổi giá trị fallback và luồng logic hiện có. Không mock, không đổi API.
- **DEC-019 (Phase B)**: Header chỉ hiện ngữ cảnh suy ra từ route (không fetch tên project trong header để tránh API trùng); tên project vẫn ở project header của trang.
- **DEC-020 (Phase B)**: Trạng thái thu gọn sidebar desktop lưu `localStorage` (tiện ích theo người xem, đọc/ghi bọc try/catch); drawer mobile không lưu.
- **DEC-022 … DEC-027 (Phase C)**: xem mục *Phase C — COMPLETED › Decisions*.
- **DEC-021 (Phase B)**: Menu tài khoản/ lời chào chỉ dùng dữ liệu có thật trong `localStorage.user`; thiếu thì hiển thị trung tính, không dùng tên/email/role giữ chỗ.

### Chờ user quyết định

- **DEC-P03**: Có làm dark mode không? *(Khuyến nghị: chuẩn bị token ngay, bật dark ở Phase K nếu còn thời gian)*
- **DEC-P04**: Gộp logic 2 bản `TaskDrawer` (Board + MyTasks) hay chỉ đồng bộ giao diện? *(Khuyến nghị: chỉ đồng bộ giao diện trước)*
- **DEC-P05**: Có được sửa `Header`/`Nav` để không gọi trùng API `/task/my-task` và N lần `/project/:id`? *(Ngoài phạm vi UI thuần; khuyến nghị: để sau)*

---

## Changed Files

| Phase | File | Loại | Ghi chú |
|---|---|---|---|
| 0–5 | `docs/ui-ux/UI_UX_UPGRADE_MASTER.md` | Mới | Tài liệu này |
| 0–5 | `node_modules/` | Cài đặt | `npm ci` theo lockfile, không đổi `package.json`/`package-lock.json` |
| 0 | `.gitignore` | Sửa | Thêm `.qa/`, `qa-screenshots/`, `*.tmp`, `.env`, `.env.*` |
| A | `index.html` | Sửa | Gỡ Google Fonts (preconnect + stylesheet) |
| A | `src/assets/fonts/inter/*.woff2`, `LICENSE.txt` | Mới | Inter variable local (latin, latin-ext, vietnamese), SIL OFL |
| A | `src/assets/style/style.css` | Sửa | @font-face, token mới, gộp rule từ project.css, `svg.icon-*`, `.animate-spin`, `.priority-tag`, reduced-motion |
| A | `src/assets/style/layouts.css` | Sửa | Gộp rule từ project.css, hex→token, `.project-tabs` cuộn ngang |
| A | `src/assets/style/components.css` | Sửa | Gộp rule từ project.css, hex→token |
| A | `src/assets/style/responsive.css` | Sửa | hex→token (overlay) |
| A | `src/pages/Project/project.css` | Sửa | 2074→~730 dòng: bỏ 192 selector trùng, dọn section rỗng, header mới |
| B | `src/App.jsx` | Sửa | Lồng 7 route Project vào MainLayout (path không đổi) |
| B | `src/Layouts/MainLayout.jsx` | Sửa | App Shell: state collapse/drawer, Esc, khoá cuộn, focus, đóng khi điều hướng/resize; `class`→`className` |
| B | `src/components/layout/SideBar/SideBar.jsx` | Sửa | Props shell, nút ✕ mobile, nút Collapse, `inert`/`role=dialog` |
| B | `src/components/layout/SideBar/Nav/Nav.jsx` | Sửa | Projects active cho `/project*`, `.nav-badge`, `title` cho rail (logic fetch giữ nguyên) |
| B | `src/components/layout/Header/Header.jsx` | Sửa | Ngữ cảnh theo route, popover thông báo bằng class, Esc, aria (logic fetch giữ nguyên) |
| B | `src/components/layout/Header/DropdownHeader/DropdownHeader.jsx` | Sửa | Click ngoài/Esc, bỏ danh tính giữ chỗ, aria |
| B | `src/components/common/ErrorState.jsx` | Mới | Error State (page/inline) + Retry |
| B | `src/utils/requestState.js` | Mới | `withFallback`, `failureMessage` |
| B | `src/pages/Project/{Project,ProjectBoard,ProjectList,ProjectCalendar,ProjectSetting,ProjectOverview,ProjectChart}.jsx` | Sửa | Bỏ shell tự dựng; Error State + Retry; loading trong shell |
| B | `src/pages/AdminUsers/AdminUsers.jsx` | Sửa | Error State + Retry, kiểm tra `res.ok` |
| B | `src/pages/Dashboard/Dasboard.jsx`, `KPI/KPI.jsx` | Sửa | Lời chào từ user thật; KPI Error State thay số 0 giả; `className` |
| B | `src/assets/style/layouts.css`, `responsive.css`, `components.css` | Sửa | Shell/sidebar/header/notif CSS, 1 hệ breakpoint, error/loading CSS, pill tabs mobile |
| B | `src/pages/Project/project.css` | Sửa | Gỡ media 1024/768 + rule shell (~730→547 dòng) |
| C | `src/components/project/ProjectHeader.jsx`, `src/pages/Project/board/{BoardToolbar.jsx,BoardColumnHeader.jsx,columnStatus.js}` | Mới | Xem Phase C › Components Added |
| C | `src/pages/Project/{ProjectBoard,ProjectList,ProjectCalendar,ProjectSetting,ProjectOverview,ProjectChart}.jsx` | Sửa | Dùng ProjectHeader; Board toolbar/cột/drag class |
| C | `src/assets/style/{layouts,components,responsive}.css`, `src/pages/Project/project.css` | Sửa | Header, board, toolbar, chip, drag states, responsive; bỏ hack chiều cao board |

---

## Validation

### Baseline (2026-10-06, trước khi sửa code)

| Kiểm tra | Kết quả |
|---|---|
| `npm ci` | OK, 110 packages |
| `npm run build` | ✅ OK — JS 948.40 KB (gzip 272.40 KB), CSS 70.22 KB; cảnh báo chunk > 500 KB |
| `npm run lint` (oxlint) | ✅ 0 error, 65 warning |
| TypeScript / test | Không có trong project |
| Dev server thật (`vite`) + Edge headless | Đã chụp `/login`, `/dashboard`, `/project`, `/projectboard/:id`, `/myTasks` ở 1280×800, 390×844 và board ở 768×1024 |
| Backend `localhost:3000` | ❌ Không chạy / không tìm thấy → chỉ xem được trạng thái rỗng/lỗi |

Quan sát thực tế từ ảnh chụp: (1) desktop shell hiển thị đúng; (2) 768px & 390px không có nút mở sidebar; (3) 390px header actions bị đẩy ra ngoài, KPI card bị cắt; (4) Board khi API lỗi hiện "Dự án / 0 members / Chưa đặt" và vùng trống, không báo lỗi; (5) Projects khi API lỗi hiện "No projects found."; (6) MyTasks có báo lỗi "Không thể tải danh sách công việc." (tốt) nhưng không có Retry, ô search không có icon; (7) icon project tabs to hơn chữ; (8) select "All Weeks" bị dẹt.

### Checklist mỗi phase triển khai

1. `npm run build` OK · 2. `npm run lint` không tăng warning · 3. Chạy `vite` thật · 4. Chụp 1280×800, 1024×768, 768×1024, 390×844, 375×812 · 5. Regression: login, điều hướng, tạo/sửa/xoá/kéo thả task, drawer, filter, realtime (khi có backend) · 6. Cập nhật file này.

---

## Known Issues

| ID | Mô tả | Trạng thái |
|---|---|---|
| KI-01 | Không có backend để kiểm tra UI với dữ liệu thật | Chờ user (DEC-P06) |
| KI-02 | ~~Import path sai hoa/thường~~ | ✅ Đã hết ở Phase B (các import này bị gỡ khi chuyển trang vào MainLayout) |
| KI-03 | Header + Nav gọi trùng `/task/my-task`; Header gọi `/project/:id` cho từng project | Ngoài phạm vi UI (DEC-P05) |
| KI-04 | 4 package không dùng: `axios`, `react-icons`, `chart.js`, `react-chartjs-2` | Ghi nhận, không tự gỡ |
| KI-05 | Bundle 948 KB, không code-split | Phase L nếu được đồng ý |
| KI-06 | `main.js`, `src/App.css`, `src/index.css`, `src/assets/style/main.css` là legacy/template không dùng hoặc gần như không dùng | Ghi nhận, không tự xoá |
| KI-07 | Board chưa có sort/group (Linear có) | Ngoài phạm vi (không thêm tính năng) |
| KI-08 | Widget dashboard (TodayTask, UCMDeadlines, RecentActivity, TaskCompletion, TeamWorkload, ProjectStatus) chứa dữ liệu mock tĩnh, hiện không được render | Xử lý ở Phase G theo DEC-010 |
| KI-09 | 65 lint warning có sẵn (set-state-in-effect, exhaustive-deps…) | Không sửa trừ khi chạm đúng dòng đó |
| KI-10 | **Đính chính (Phase A)**: ảnh Phase 0 chụp bằng `--window-size` của Edge headless (có bề rộng cửa sổ tối thiểu ~500px) nên đã phóng đại lỗi. Đo lại bằng giả lập thiết bị chuẩn: header/avatar/chuông **không** tràn ở 390px; tràn thật nằm **bên trong `.page-content`** (filter bar Board, pill tabs MyTasks, input Setting, Chart, List) | Phase B (shell) + Phase C/F (nội dung từng trang) |
| KI-12 | `.avatar-xs` hiển thị 32px và `.checklist-add-btn` bị `.btn` đè, do họ `.btn*`/`.avatar*` trong project.css | Phase D/F/H (thay đổi hiển thị có chủ đích) |
| KI-13 | ~~Lỗi console `Invalid DOM property class`~~ | ✅ Đã sửa ở Phase B (MainLayout, Dashboard). Các widget dashboard không render (TodayTask…) vẫn dùng `class=` → Phase G |
| KI-14 | **BLOCKED**: QA Board với dữ liệu thật (kéo thả, task card, drawer, modal tạo task, realtime socket) và nhánh "thành công" của mọi trang trong shell mới | Chờ backend (DEC-P06) |
| KI-15 | ~~Filter bar của Board có width cố định inline~~ | ✅ Đã sửa ở Phase C (BoardToolbar responsive) |
| KI-16 | Tên workspace "Nang Cao Team" trong sidebar là chữ tĩnh (không có API workspace) | Ghi nhận; cần nguồn dữ liệu nếu muốn động |
| KI-17 | Trang Projects: khi tải số task/thành viên **của từng project** lỗi, card vẫn hiện 0 (fallback cũ) — chỉ lỗi danh sách chính mới có Error State | Phase F |
| KI-18 | MyTasks đã có thông báo lỗi riêng nhưng chưa có Retry, ô search chưa có icon | Phase F |
| KI-19 | Nội dung trang Project vẫn thụt lề theo cấu trúc cũ (16 khoảng trắng) sau khi bỏ wrapper — giữ nguyên để diff nhỏ | Ghi nhận (chỉ định dạng) |
| KI-20 | `.page-content` + `.page-content-inner` / padding inline → padding kép trên một số trang | ◐ Board đã xử lý ở Phase C; các trang khác → Phase F |
| KI-21 | Board chưa có Sort / Assignee / Priority filter (tính năng mới) | Chờ user quyết (DEC-024) |
| KI-22 | Icon trạng thái cột suy từ tên cột; tên lạ → icon trung tính | Ghi nhận; nên map theo trường trạng thái nếu backend có |
| KI-23 | Nội dung task card còn inline style (badge W/pts/On Track, nút Not Accept, avatar) | Phase D |
| KI-24 | Tên project dài làm meta header xuống dòng ở tablet (header ~155px) | Chấp nhận (không cắt tên quá sớm) |
| KI-11 | `api.jsx` nằm ngoài `src/` | Ghi nhận, không di chuyển |

---

## Next Phase

**Phase D — Task Card** — chỉ bắt đầu khi user cho phép. Chi tiết đề xuất: xem *Phase C — COMPLETED › Next Phase*.

<details><summary>Đề xuất Phase C trước đây (đã thực hiện)</summary>

**Phase C — Project Header + Kanban Board & Column**

Đề xuất phạm vi Phase C:
1. Tách `ProjectHeader` (tiêu đề + meta + tab) dùng chung cho 6 trang Project (hiện lặp 6 lần), gọn 1 dòng trên desktop, tab cuộn ngang trên mobile.
2. Board: filter bar responsive (bỏ width cố định inline — KI-15), search icon lucide thay emoji, select tuần chuẩn chiều cao, chip lọc + Clear.
3. Column: status icon theo tên cột (token `--status-*` đã có), count, nút "+" là `.icon-btn`; board full-height, thân cột cuộn riêng, header cột sticky; empty column có hướng dẫn.
4. Drag & drop: class `is-dragging` / `is-drag-over` dùng token thay inline style — **giữ nguyên** `handleOnDragEnd`, payload `moveTask`, `isDragDisabled`, `provided.draggableProps.style`.
5. Không đụng task card (Phase D) ngoài phần bắt buộc để cột hoạt động.

Ràng buộc: phần kéo thả / dữ liệu thật vẫn **BLOCKED** cho tới khi có backend → Phase C sẽ kiểm bằng specimen/CSS + trạng thái lỗi/rỗng; cần backend để nghiệm thu đầy đủ.

</details>
