import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useConfirm, deleteConfirm } from '../../components/common/confirmContext.js';
import { notify } from '../../utils/notify.js';
import { withFallback, failureMessage } from '../../utils/requestState.js';
import {
    fetchProjectById,
    fetchTasksByProject,
    fetchMembersByProject,
    updateProjectDetail,
    uploadProjectDocument,
    deleteProjectDocument
} from './../../../api.jsx';
import { API_ORIGIN } from "../../config/apiConfig.js";
import "./project.css";
import {
    Loader2,
    FileText,
    Upload,
    Trash2,
    Edit3,
    Check
    } from "lucide-react";

import ProjectHeader from '../../components/project/ProjectHeader.jsx';

// Domain Backend chứa thư mục uploads
// uploads are served from the backend origin
const API_BASE_URL = API_ORIGIN;

// Helper function format ngày dạng DD/MM/YYYY
const formatDate = (dateString, fallback = 'Not set') => {
    if (!dateString) return fallback;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return fallback;

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
};

export default function ProjectOverview() {
    const { id: projectId } = useParams();

    // Project & Data States
    const [project, setProject] = useState(null);
    const [projectMembers, setProjectMembers] = useState([]);
    const [tasks, setTasks] = useState([]);
    const confirm = useConfirm();
    const [loading, setLoading] = useState(true);
    // Requests that failed in the last load; bump reloadKey to retry
    const [loadFailures, setLoadFailures] = useState([]);
    const [reloadKey, setReloadKey] = useState(0);
    const [memberCurrentRole, setMemberRole] = useState("");

    // State for Project Details
    const [projectDetail, setProjectDetail] = useState("");
    const [isEditingDetail, setIsEditingDetail] = useState(false);
    const [isSavingDetail, setIsSavingDetail] = useState(false);

    // State for Document Attachments (Multiple Files)
    const [documents, setDocuments] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);

    // Get current user from LocalStorage
    const getCurrentUser = () => {
        try {
            return JSON.parse(localStorage.getItem('user') || '{}');
        } catch {
            return {};
        }
    };

    const currentUser = getCurrentUser();
    const currentUserId = currentUser._id || currentUser.id || null;

    // Fetch current logged-in user's system role
    useEffect(() => {
        const fetchCurrentMemberRole = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) return;
                const res = await fetch(`${API_BASE_URL}/api/user/currentUser`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                setMemberRole(data.memberRole || "");
            } catch (err) {
                console.error("Failed to fetch user role:", err);
            }
        };
        fetchCurrentMemberRole();
    }, []);

    // Find current user's membership role in this project
    const currentProjectMember = useMemo(() => {
        if (!currentUserId || !projectMembers.length) return null;
        return projectMembers.find(m => {
            const uId = typeof m.userId === 'object' ? (m.userId?._id || m.userId?.id) : (m.userId || m._id || m.id);
            return String(uId) === String(currentUserId);
        }) || null;
    }, [currentUserId, projectMembers]);

    // Check Manager or Admin permissions
    const currentUserRole = currentProjectMember?.role || currentUser?.role || memberCurrentRole;
    const isAdmin = String(currentUser?.role).toLowerCase() === 'admin';
    const isManager = currentUserRole === 'Manager' || isAdmin;

    // Load Project details, Tasks, and Members
    useEffect(() => {
        if (!projectId) return;

        setLoading(true);
        const failures = [];
        Promise.all([
            withFallback(fetchProjectById(projectId), null, failures, 'project'),
            withFallback(fetchTasksByProject(projectId), [], failures, 'tasks'),
            withFallback(fetchMembersByProject(projectId), [], failures, 'members')
        ]).then(([projectData, tasksData, membersData]) => {
            const realProject = projectData?.data || projectData || {};
            setProject(realProject);
            setProjectDetail(realProject.projectDetail || "");
            setDocuments(realProject.documents || []);
            setTasks(Array.isArray(tasksData) ? tasksData : (tasksData?.data || []));
            setProjectMembers(Array.isArray(membersData) ? membersData : (membersData?.data || []));
        }).finally(() => {
            setLoadFailures(failures);
            setLoading(false);
        });
    }, [projectId, reloadKey]);

    // Save project overview description
    const handleSaveDetail = async () => {
        if (!isManager) return;
        try {
            setIsSavingDetail(true);
            const res = await updateProjectDetail(projectId, projectDetail);
            if (res?.project) {
                setProject(res.project);
            }
            setIsEditingDetail(false);
        } catch (error) {
            console.error("Failed to update project details:", error);
            notify({ type: "error", title: "Failed to update project details.", message: error.message });
        } finally {
            setIsSavingDetail(false);
        }
    };

    // Upload multiple files to server
    const handleFileUpload = async (e) => {
        e.preventDefault();

        // Chặn người dùng nếu không phải Manager hoặc Admin
        if (!isManager) {
            notify({ type: "error", title: "Only a Manager or an Admin can do this." });
            return;
        }

        if (!selectedFiles || selectedFiles.length === 0) {
            notify({ type: "info", title: "Please select at least one file to upload!" });
            return;
        }

        try {
            setIsUploading(true);

            // Normalize UTF-8 characters for filenames
            const normalizedFiles = Array.from(selectedFiles).map(file => {
                const normalizedName = file.name.normalize('NFC');
                return new File([file], normalizedName, { type: file.type });
            });

            const res = await uploadProjectDocument(projectId, normalizedFiles);

            if (res?.documents) {
                setDocuments(res.documents);
                setSelectedFiles([]);
                e.target.reset(); // Reset file input form
            }
        } catch (error) {
            console.error("File upload error:", error);
            notify({ type: "error", title: "An error occurred while uploading files!", message: error.message });
        } finally {
            setIsUploading(false);
        }
    };

    // Delete project document
    const handleDeleteDocument = async (docId) => {
        const doc = documents.find(d => String(d._id) === String(docId));
        // the dialog stays open until the request finishes; a failure is shown inside it (was an alert)
        await confirm(deleteConfirm({
            item: "document",
            name: doc?.name,
            onConfirm: async () => {
                try {
                    const res = await deleteProjectDocument(projectId, docId);
                    if (res?.documents) {
                        setDocuments(res.documents);
                    } else {
                        setDocuments(prev => prev.filter(d => String(d._id) !== String(docId)));
                    }
                } catch (error) {
                    console.error("Failed to delete document:", error);
                    throw new Error(error.message || "An error occurred while deleting the document.");
                }
            },
        }));
    };

    if (loading) {
        return (
            <div className="page-loading" role="status">
                <Loader2 className="icon animate-spin" aria-hidden="true" />
                <span>Loading project details...</span>
            </div>
        );
    }

    // The overview is meaningless without the project — show the error, not placeholder values
    const coreFailure = loadFailures.find((f) => f.label === 'project');
    const partialFailure = !coreFailure && loadFailures.length > 0;
    if (coreFailure) {
        return (
            <main className="page-content">
                <ErrorState
                    title="Couldn't load this project"
                    message={failureMessage(coreFailure)}
                    onRetry={() => setReloadKey((k) => k + 1)}
                />
            </main>
        );
    }

    // Format ngày bắt đầu và ngày kết thúc
    const formattedStartDate = formatDate(project?.startDate || project?.createdAt);
    const formattedDueDate = formatDate(project?.date || project?.dueDate || project?.endDate);

    return (
        <>

                <ProjectHeader
                    projectId={projectId}
                    project={project}
                    memberCount={projectMembers.length}
                    taskCount={tasks.length}
                    startDate={formattedStartDate}
                    endDate={formattedDueDate}
                />

                {/* Main Content */}
                <main className="page-content" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {partialFailure && (
                        <ErrorState
                            variant="inline"
                            title="Some project data could not be loaded."
                            message="Task or member counts may be incomplete."
                            onRetry={() => setReloadKey((k) => k + 1)}
                        />
                    )}

                    {/* Section 1: Project Details Description */}
                    <div className="card" style={{ padding: '20px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                                <FileText size={20} color="#4f46e5" /> Project Overview & Details
                            </h3>
                            {isManager && !isEditingDetail && (
                                <button className="btn btn-outline btn-sm" onClick={() => setIsEditingDetail(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                    <Edit3 size={14} /> Edit
                                </button>
                            )}
                        </div>

                        {isEditingDetail ? (
                            <div>
                                <textarea
                                    className="textarea"
                                    rows="6"
                                    value={projectDetail}
                                    onChange={(e) => setProjectDetail(e.target.value)}
                                    placeholder="Enter detailed description, project goals, scope, and requirements..."
                                    style={{ width: '100%', marginBottom: '12px', padding: '10px' }}
                                />
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                    <button className="btn btn-secondary btn-sm" onClick={() => setIsEditingDetail(false)} style={{ cursor: 'pointer' }}>
                                        Cancel
                                    </button>
                                    <button className="btn btn-primary btn-sm" onClick={handleSaveDetail} disabled={isSavingDetail} style={{ cursor: isSavingDetail ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {isSavingDetail ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                                        <span>Save Changes</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ color: '#374151', lineHeight: '1.6', whiteSpace: 'pre-line', fontSize: '14px' }}>
                                {projectDetail ? projectDetail : <i style={{ color: '#9ca3af' }}>No detailed description provided for this project yet.</i>}
                            </div>
                        )}
                    </div>

                    {/* Section 2: Upload & Manage Attachments */}
                    <div className="card" style={{ padding: '20px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                            <Upload size={20} color="#4f46e5" /> Documents & Attachments
                        </h3>

                        {/* File Upload Form - Chỉ hiển thị cho Manager và Admin */}
                        {isManager ? (
                            <form onSubmit={handleFileUpload} style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
                                <input
                                    type="file"
                                    multiple
                                    aria-label="Choose files to upload"
                                    className="input"
                                    style={{ flex: '1', padding: '8px' }}
                                    onChange={(e) => setSelectedFiles(e.target.files)}
                                    required
                                />
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={isUploading || selectedFiles.length === 0}
                                    style={{ cursor: (isUploading || selectedFiles.length === 0) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                                >
                                    {isUploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                                    <span>Upload ({selectedFiles.length || 0} files)</span>
                                </button>
                            </form>
                        ) : (
                            <div style={{ padding: '10px 12px', background: '#f3f4f6', borderRadius: '6px', color: '#6b7280', fontSize: '13px', marginBottom: '16px' }}>
                            </div>
                        )}

                        {/* List of Uploaded Documents */}
                        <div className="document-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {documents.length === 0 ? (
                                <p style={{ color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', padding: '16px 0' }}>No documents have been uploaded yet.</p>
                            ) : (
                                documents.map((doc) => {
                                    const uploaderName = typeof doc.uploadedBy === 'object'
                                        ? (doc.uploadedBy?.username || doc.uploadedBy?.email || 'User')
                                        : 'User';

                                    const isOwnerOrManager = isManager || String(doc.uploadedBy?._id || doc.uploadedBy) === String(currentUserId);

                                    // FIX LỖI: Nối Domain Backend nếu doc.url là đường dẫn tương đối (/uploads/...)
                                    const fileUrl = doc.url?.startsWith('http')
                                        ? doc.url
                                        : `${API_BASE_URL}${doc.url}`;

                                    return (
                                        <div key={doc._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <FileText size={24} color="#4f46e5" />
                                                <div>
                                                    <a
                                                        href={fileUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        download
                                                        style={{ fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}
                                                    >
                                                        {doc.name}
                                                    </a>
                                                </div>
                                            </div>

                                            {isOwnerOrManager && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteDocument(doc._id)}
                                                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px' }}
                                                    title="Delete file"
                                                    aria-label={`Delete document ${doc.name || ''}`.trim()}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                </main>
        </>
    );
}