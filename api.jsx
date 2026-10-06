const API_BASE_URL = 'http://localhost:3000/api'; // Thay bằng URL API của bạn

// Hàm xử lý Response chung
const handleResponse = async (res) => {
    // 1. Kiểm tra nếu bị cấm (403 - Tài khoản bị khóa/Suspend)
    if (res.status === 403) {
        const data = await res.clone().json().catch(() => ({}));
        if (data.message === 'ACCOUNT_SUSPENDED' || data.logout) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            alert('Tài khoản của bạn đã bị khóa bởi Quản trị viên!');
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
        throw new Error(errorData.message || `Lỗi ${res.status}: Không thể thực hiện yêu cầu`);
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

export const reviewTask = async (taskId, isAccepted) => {
    const res = await fetch(`${API_BASE_URL}/task/${taskId}/review`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: isAccepted ? 'accept' : 'not_accept' })
    });
    return handleResponse(res);
};

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
export const updateProjectDetail = async (projectId, projectDetail) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/project/${projectId}/project-detail`, {
        method: 'PUT',
        headers: getAuthHeaders(),

        body: JSON.stringify({ projectDetail })
    });
    return response.json();
};

export const deleteProjectDocument = async (projectId, documentId) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/project/${projectId}/documents/${documentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    return response.json();
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
