import { API_BASE_URL, getApiErrorMessage } from './src/config/apiConfig.js';
import { queueNotice } from './src/utils/notify.js';

// Hàm xử lý Response chung
const handleResponse = async (res) => {
    // 1. Kiểm tra nếu bị cấm (403 - Tài khoản bị khóa/Suspend)
    if (res.status === 403) {
        const data = await res.clone().json().catch(() => ({}));
        if (data.message === 'ACCOUNT_SUSPENDED' || data.logout) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // the page reloads right after: show the message on /login instead of a blocking alert
            queueNotice({ type: 'error', title: 'Your account has been suspended by an administrator.' });
            window.location.href = '/login';
            throw new Error('Account banned');
        }
    }

    // 2. Kiểm tra nếu các lỗi khác (!res.ok)
    if (!res.ok) {
        if (res.status === 401) {
            // Token hết hạn hoặc không hợp lệ -> Xóa token và về login
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        const errorData = await res.json().catch(() => ({}));
        const error = new Error(getApiErrorMessage(errorData, res.status));
        error.status = res.status;
        throw error;
    }

    return res.json();
};

// Hàm bổ trợ lấy Headers đính kèm Token
const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

// ==================== PROJECTS ====================

export const fetchProjects = async () => {
    const res = await fetch(`${API_BASE_URL}/project`, {
        headers: getAuthHeaders()
    });
    return handleResponse(res);
};

// Workspace statistics for the Dashboard KPI ({ totalProjects, totalBudget, onTimeRate })
export const fetchPortfolio = async () => {
    const res = await fetch(`${API_BASE_URL}/project/portfolio`, {
        headers: getAuthHeaders()
    });
    return handleResponse(res);
};

export const fetchProjectById = async (id) => {
    const res = await fetch(`${API_BASE_URL}/project/${id}`, {
        headers: getAuthHeaders()
    });
    return handleResponse(res);
};

export const createProject = async (projectData) => {
    const res = await fetch(`${API_BASE_URL}/project`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(projectData)
    });
    return handleResponse(res);
};

// -- BỔ SUNG: Cập nhật thông tin dự án --
export const updateProject = async (projectId, projectData) => {
    const res = await fetch(`${API_BASE_URL}/project/${projectId}`, {
        method: 'PUT', // Đổi thành 'PATCH' nếu Backend của bạn yêu cầu PATCH
        headers: getAuthHeaders(),
        body: JSON.stringify(projectData)
    });
    return handleResponse(res);
};

// -- BỔ SUNG: Xóa dự án --
export const deleteProject = async (projectId) => {
    const res = await fetch(`${API_BASE_URL}/project/${projectId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return handleResponse(res);
};

export const fetchUsersByProject = async (projectId) => {
    const res = await fetch(`${API_BASE_URL}/project/${projectId}/user`, {
        headers: getAuthHeaders()
    });
    return handleResponse(res);
};

export const fetchUsers = async () => {
    const res = await fetch(`${API_BASE_URL}/user`, {
        headers: getAuthHeaders()
    });
    return handleResponse(res);
};

export const fetchMembers = async () => {
    const res = await fetch(`${API_BASE_URL}/member`, {
        headers: getAuthHeaders()
    });
    return handleResponse(res);
};

export const fetchMembersByProject = async (projectId) => {
    const res = await fetch(`${API_BASE_URL}/member/project/${projectId}`, {
        headers: getAuthHeaders()
    });
    return handleResponse(res);
};

export const inviteMember = async (payload) => {
    const res = await fetch(`${API_BASE_URL}/member/invite`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
    });
    return handleResponse(res);
};

export const deleteMemberByProject = async (projectId, memberUserId) => {
    const res = await fetch(`${API_BASE_URL}/member/${memberUserId}/project/${projectId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return handleResponse(res);
};

export const fetchColumns = async (projectId) => {
    const res = await fetch(`${API_BASE_URL}/project/${projectId}/column`, {
        headers: getAuthHeaders()
    });
    return handleResponse(res);
};

export const fetchColumnsByProject = async (projectId) => {
    const res = await fetch(`${API_BASE_URL}/column/project/${projectId}`, {
        headers: getAuthHeaders()
    });
    return handleResponse(res);
};

// ==================== TASKS ====================

// -- ĐÃ SỬA: Đưa API_BASE_URL và handleResponse vào createQuickTask --
export const createQuickTask = async (taskData) => {
    const res = await fetch(`${API_BASE_URL}/task`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(taskData)
    });
    return handleResponse(res);
};

export const fetchTasksByProject = async (projectId) => {
    const res = await fetch(`${API_BASE_URL}/task/project/${projectId}`, {
        headers: getAuthHeaders()
    });
    return handleResponse(res);
};

// Tasks assigned to the signed-in user, across all projects (My Tasks page)
export const fetchMyTasks = async () => {
    const res = await fetch(`${API_BASE_URL}/task/my-task`, {
        headers: getAuthHeaders()
    });
    return handleResponse(res);
};

// Epic Burndown of one project. The body is the chart itself — { totalPoints, currentWeek, weeks } —
// with no { success, data } wrapper (see src/utils/epicBurndown.js)
export const fetchEpicBurndown = async (projectId) => {
    const res = await fetch(`${API_BASE_URL}/task/project/${encodeURIComponent(projectId)}/epic-burndown`, {
        headers: getAuthHeaders()
    });
    return handleResponse(res);
};

// Plan vs. Real Progress (cumulative, burn-up) of one project:
// { success, currentProjectWeek, maxProjectWeek, weeks } — a different contract from the Epic Burndown
export const fetchWeeklyExpectancy = async (projectId) => {
    const res = await fetch(`${API_BASE_URL}/task/project/${encodeURIComponent(projectId)}/weekly-expectancy`, {
        headers: getAuthHeaders()
    });
    return handleResponse(res);
};

export const fetchTaskById = async (taskId) => {
    const res = await fetch(`${API_BASE_URL}/task/${taskId}`, {
        headers: getAuthHeaders()
    });
    return handleResponse(res);
};

export const createTask = async (taskData) => {
    const res = await fetch(`${API_BASE_URL}/task`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(taskData)
    });
    return handleResponse(res);
};

export const moveTask = async (taskId, updateData) => {
    const res = await fetch(`${API_BASE_URL}/task/${taskId}/move`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updateData)
    });
    return handleResponse(res);
};

export const updateTask = async (taskId, fields) => {
    const res = await fetch(`${API_BASE_URL}/task/${taskId}`, {
        method: 'PUT', // Hoặc 'PATCH' tùy cấu hình Backend của bạn
        headers: getAuthHeaders(),
        body: JSON.stringify(fields)
    });
    return handleResponse(res);
};

export const deleteTask = async (taskId) => {
    const res = await fetch(`${API_BASE_URL}/task/${taskId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return handleResponse(res);
};

// ==================== CHECKLIST ====================

export const addChecklistItem = async (taskId, text) => {
    const res = await fetch(`${API_BASE_URL}/task/${taskId}/checklist`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ text })
    });
    return handleResponse(res);
};

export const toggleChecklistItem = async (taskId, itemId, completed) => {
    const res = await fetch(`${API_BASE_URL}/task/${taskId}/checklist/${itemId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ completed })
    });
    return handleResponse(res);
};

// ⚠ BACKEND MISMATCH (verified at runtime, Phase E): the route is DELETE /task/:id/checklist/:itemId but the
// backend controller reads :id as the CHECKLIST ITEM id. Calling it the documented way
// (deleteChecklist(taskId, itemId)) returns 404. The drawers call deleteChecklist(itemId) — the item id lands in
// :id and the delete works. Keep that call until the backend reads req.params.itemId; then pass (taskId, itemId).
export const deleteChecklist = async (taskId, checklistId) => {
    const res = await fetch(`${API_BASE_URL}/task/${taskId}/checklist/${checklistId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return handleResponse(res);
};

// ==================== COMMENTS & ACTIVITIES ====================

export const fetchTaskComments = async (taskId) => {
    const res = await fetch(`${API_BASE_URL}/task/${taskId}/comments`, {
        headers: getAuthHeaders()
    });
    return handleResponse(res);
};

export const addComment = async (taskId, text) => {
    const res = await fetch(`${API_BASE_URL}/task/${taskId}/comments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ text })
    });
    return handleResponse(res);
};

export const fetchTaskActivities = async (taskId) => {
    const res = await fetch(`${API_BASE_URL}/task/${taskId}/activity`, {
        headers: getAuthHeaders()
    });
    return handleResponse(res);
};


export const register = async (userData) => {
    const res = await fetch(`${API_BASE_URL}/user/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
    });
    return handleResponse(res);
};

// POST /task/:id/review is not mounted by the backend (reviewTask has no route) — intentionally no client function

// ==================== NOTES ====================

export const fetchNotesByProject = async (projectId) => {
    const res = await fetch(`${API_BASE_URL}/note/project/${projectId}`, {
        headers: getAuthHeaders()
    });
    return handleResponse(res);
};

export const createNote = async (noteData) => {
    const res = await fetch(`${API_BASE_URL}/note`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(noteData)
    });
    return handleResponse(res);
};

export const deleteNote = async (noteId) => {
    const res = await fetch(`${API_BASE_URL}/note/${noteId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return handleResponse(res);
};

export const updateUserStatus = async (userId, status) => {
    const res = await fetch(`${API_BASE_URL}/user/${userId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status })
    });
    return handleResponse(res);
};

// Thêm vào api.jsx của bạn
// Both go through handleResponse like every other call: a failed request throws (the UI keeps its data
// and shows the error) instead of being read as a success.
export const updateProjectDetail = async (projectId, projectDetail) => {
    const response = await fetch(`${API_BASE_URL}/project/${projectId}/project-detail`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ projectDetail })
    });
    return handleResponse(response);
};

export const deleteProjectDocument = async (projectId, documentId) => {
    const response = await fetch(`${API_BASE_URL}/project/${projectId}/documents/${documentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return handleResponse(response);
};

// api.jsx
export const uploadProjectDocument = async (projectId, files) => {
    const token = localStorage.getItem('token');
    const formData = new FormData();

    // Lặp qua mảng files và đính kèm vào 'files' key (khớp với upload.array('files'))
    Array.from(files).forEach((file) => {
        formData.append('files', file);
    });

    const res = await fetch(`${API_BASE_URL}/project/${projectId}/documents/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });

    return handleResponse(res);
};

export const fetchTasksByWeek = async (projectId) => {
    const response = await fetch(`${API_BASE_URL}/project/${projectId}/tasks-by-week`);
    if (!response.ok) throw new Error('Failed to fetch tasks by week');
    return response.json();
};
