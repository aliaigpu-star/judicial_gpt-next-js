/**
 * Admin API Client
 * Admin-specific API endpoints for the JudicialGPT admin panel
 */

const getBaseUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
};

const API_BASE_URL = getBaseUrl();

interface AdminUser {
    id: string;
    email: string;
    name: string;
    role: 'user' | 'admin' | 'moderator';
    status: 'active' | 'inactive' | 'suspended' | 'banned';
    emailVerified: boolean;
    avatarUrl?: string;
    conversationCount: number;
    messageCount: number;
    lastActivity?: string;
    createdAt: string;
}

interface AdminUserDetails extends AdminUser {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    stats: {
        conversationCount: number;
        messageCount: number;
        lastActivity?: string;
    };
    conversations: Array<{
        id: string;
        title: string;
        createdAt: string;
        updatedAt: string;
    }>;
}

interface DashboardStats {
    totalUsers: number;
    totalConversations: number;
    totalMessages: number;
    activeUsers: number;
    newUsersWeek: number;
    activeUsersToday: number;
    activeUsersYesterday: number;
    activeUsersWeekly: number;
    activeUsersMonthly: number;
    messagesToday: number;
    messagesYesterday: number;
    messagesWeekly: number;
    messagesMonthly: number;
}

interface AdminConversation {
    id: string;
    title: string;
    userId: string;
    userName?: string;
    userEmail?: string;
    messageCount: number;
    isPinned: boolean;
    isArchived: boolean;
    createdAt: string;
    updatedAt: string;
}

interface ConversationDetails {
    id: string;
    title: string;
    user: {
        id: string;
        email: string;
        name: string;
    } | null;
    messages: Array<{
        id: string;
        role: string;
        content: string;
        createdAt: string;
    }>;
    createdAt: string;
    updatedAt: string;
}

interface ActivityItem {
    id: string;
    type: string;
    title: string;
    user: string;
    userId: string;
    timestamp: string;
}

interface SystemStatus {
    status: 'healthy' | 'degraded';
    checks: {
        database: boolean;
        api: boolean;
    };
    timestamp: string;
}

interface SearchResults {
    users: Array<{
        id: string;
        name: string;
        email: string;
        role: string;
        status: string;
    }>;
    conversations: Array<{
        id: string;
        title: string;
        userName: string;
        userEmail: string;
        updatedAt: string;
    }>;
}


// Feedback (like / dislike on AI replies)
export type FeedbackRating = 'like' | 'dislike';
export type FeedbackStatus = 'new' | 'reviewed' | 'approved' | 'excluded';

export interface FeedbackItem {
    id: string;
    message_id: string | null;
    conversation_id: string | null;
    user_id: string | null;
    rating: FeedbackRating;
    reasons: string[];
    comment: string | null;
    prompt: string | null;
    response: string;
    message_version: number | null;
    model: string | null;
    source: string;
    review_status: FeedbackStatus;
    admin_notes: string | null;
    reviewed_at: string | null;
    created_at: string;
    user_email: string | null;
    user_name: string | null;
    conversation_title: string | null;
}

export interface FeedbackStats {
    likes: number;
    dislikes: number;
    total: number;
    satisfaction: number | null;
    pending_review: number;
    approved: number;
    last_7_days: number;
    raters: number;
    daily: Array<{ date: string; likes: number; dislikes: number }>;
    reasons: Array<{ reason: string; label: string; count: number }>;
    sources: Array<{ source: string; likes: number; dislikes: number }>;
    topDislikedUsers: Array<{ email: string; dislikes: number }>;
}

export interface FeedbackFilters {
    rating?: FeedbackRating | '';
    status?: FeedbackStatus | '';
    source?: string;
    search?: string;
    from?: string;
    to?: string;
}

const toQuery = (params: Record<string, string | number | undefined>) =>
    new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)])
    ).toString();

class AdminApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private getToken(): string | null {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('token');
        }
        return null;
    }

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            ...((options.headers as Record<string, string>) || {})
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers,
            credentials: 'include'
        });

        const data = await response.json();

        if (!response.ok) {
            const error = new Error(data.error || 'API Error') as Error & { status: number; code: string };
            error.status = response.status;
            error.code = data.code;
            throw error;
        }

        return data;
    }

    // Dashboard
    async getDashboardStats(): Promise<{ stats: DashboardStats }> {
        return this.request('/api/admin/dashboard');
    }

    // Users
    async getUsers(): Promise<{ users: AdminUser[] }> {
        return this.request('/api/admin/users');
    }

    async getUser(id: string): Promise<{ user: AdminUserDetails; stats: any; conversations: any[] }> {
        return this.request(`/api/admin/users/${id}`);
    }

    async createUser(data: {
        email: string;
        password: string;
        name?: string;
        role?: string;
        status?: string;
    }): Promise<{ success: boolean; user: { id: string; email: string } }> {
        return this.request('/api/admin/users', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async updateUser(id: string, data: {
        name?: string;
        role?: string;
        status?: string;
    }): Promise<{ success: boolean; user: AdminUser }> {
        return this.request(`/api/admin/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async deleteUser(id: string): Promise<{ success: boolean; message: string }> {
        return this.request(`/api/admin/users/${id}`, {
            method: 'DELETE'
        });
    }

    // Conversations
    async getConversations(limit = 100, offset = 0): Promise<{ conversations: AdminConversation[] }> {
        return this.request(`/api/admin/conversations?limit=${limit}&offset=${offset}`);
    }

    async getConversation(id: string): Promise<{ conversation: ConversationDetails }> {
        return this.request(`/api/admin/conversations/${id}`);
    }

    async deleteConversation(id: string): Promise<{ success: boolean; message: string }> {
        return this.request(`/api/admin/conversations/${id}`, {
            method: 'DELETE'
        });
    }

    // Activity
    async getActivity(limit = 50): Promise<{ activity: ActivityItem[] }> {
        return this.request(`/api/admin/activity?limit=${limit}`);
    }

    // System
    async getSystemStatus(): Promise<SystemStatus> {
        return this.request('/api/admin/system-status');
    }

    // Settings
    async getSettings(): Promise<{ success: boolean; settings: any }> {
        return this.request('/api/admin/settings');
    }

    async updateSettings(settings: any): Promise<{ success: boolean; message: string; settings: any; warning?: string }> {
        return this.request('/api/admin/settings', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
    }

    // Search
    async search(query: string): Promise<SearchResults> {
        return this.request(`/api/admin/search?q=${encodeURIComponent(query)}`);
    }

    // Activity Logs
    async getActivityLogs(limit = 100, offset = 0, action?: string, userId?: string): Promise<{
        logs: Array<{
            id: number;
            userId?: string;
            userName?: string;
            userEmail?: string;
            action: string;
            entityType?: string;
            entityId?: string;
            details?: any;
            ipAddress?: string;
            userAgent?: string;
            timestamp: string;
        }>;
        total: number;
        limit: number;
        offset: number;
    }> {
        const params = new URLSearchParams();
        params.append('limit', limit.toString());
        params.append('offset', offset.toString());
        if (action) params.append('action', action);
        if (userId) params.append('userId', userId);
        return this.request(`/api/admin/logs/activity?${params.toString()}`);
    }

    // API Request Logs
    async getApiRequestLogs(limit = 100, offset = 0, status?: string, userId?: string): Promise<{
        logs: Array<{
            id: string;
            timestamp: string;
            apiKeyId?: string;
            userId?: string;
            userName?: string;
            userEmail?: string;
            sessionId?: string;
            requestType?: string;
            endpoint?: string;
            method?: string;
            model?: string;
            status: string;
            responseTime?: number;
            tokensUsed?: number;
            statusCode?: number;
            errorMessage?: string;
            ipAddress?: string;
            userAgent?: string;
            country?: string;
            completedAt?: string;
        }>;
        total: number;
        limit: number;
        offset: number;
    }> {
        const params = new URLSearchParams();
        params.append('limit', limit.toString());
        params.append('offset', offset.toString());
        if (status) params.append('status', status);
        if (userId) params.append('userId', userId);
        return this.request(`/api/admin/logs/api-requests?${params.toString()}`);
    }
    // Feedback
    async getFeedbackStats(): Promise<{ stats: FeedbackStats }> {
        return this.request('/api/admin/feedback/stats');
    }

    async getFeedback(filters: FeedbackFilters = {}, limit = 25, offset = 0): Promise<{ items: FeedbackItem[]; total: number }> {
        return this.request(`/api/admin/feedback?${toQuery({ ...filters, limit, offset })}`);
    }

    async reviewFeedback(id: string, data: { status?: FeedbackStatus; notes?: string }): Promise<{ item: FeedbackItem }> {
        return this.request(`/api/admin/feedback/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    }

    /** Downloads the matching feedback as a JSONL (training) or CSV file. */
    async downloadFeedback(format: 'jsonl' | 'csv', filters: FeedbackFilters = {}): Promise<void> {
        const token = this.getToken();
        const response = await fetch(`${this.baseUrl}/api/admin/feedback/export?${toQuery({ ...filters, format })}`, {
            headers: {
                'ngrok-skip-browser-warning': 'true',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            credentials: 'include'
        });
        if (!response.ok) throw new Error('Export failed');

        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement('a');
        link.href = url;
        link.download = `judicialgpt-feedback-${new Date().toISOString().slice(0, 10)}.${format}`;
        link.click();
        URL.revokeObjectURL(url);
    }
}

export const adminApi = new AdminApiClient(API_BASE_URL);
export type {
    AdminUser,
    AdminUserDetails,
    DashboardStats,
    AdminConversation,
    ConversationDetails,
    ActivityItem,
    SystemStatus,
    SearchResults
};
