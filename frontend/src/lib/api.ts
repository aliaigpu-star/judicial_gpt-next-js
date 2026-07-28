/**
 * API Client
 * Centralized API communication with the Express backend
 */

const getBaseUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
};

const API_BASE_URL = getBaseUrl();

interface FetchOptions extends RequestInit {
    token?: string;
}

/**
 * Convert relative avatar URL to full URL
 * Handles both relative paths (/uploads/...) and full URLs
 */
export function getFullAvatarUrl(avatarUrl: string | null | undefined): string | null {
    if (!avatarUrl) return null;

    // Handle IP-based backend URLs to prevent Mixed Content errors on HTTPS
    if (avatarUrl.includes('76.13.179.250:3001')) {
        return avatarUrl.replace(/http:\/\/76\.13\.179\.250:3001/g, '');
    }

    // Handle legacy database entries that saved localhost URLs directly
    if (avatarUrl.includes('localhost:3001')) {
        return avatarUrl.replace(/http:\/\/localhost:3001/g, '');
    }

    // If it's already a full URL, return as is (only if it matches the current protocol or is secure)
    if (avatarUrl.startsWith('https://')) {
        return avatarUrl;
    }

    // For relative paths, let them stay relative so the Next.js proxy catches them!
    if (avatarUrl.startsWith('/')) {
        return avatarUrl;
    }

    return `/${avatarUrl}`;
}

export const API_URL = API_BASE_URL;

class ApiClient {
    private baseUrl: string;
    private token: string | null = null;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
        // Auto-load token from localStorage (client-side only)
        if (typeof window !== 'undefined') {
            this.token = localStorage.getItem('token');
        }
    }

    setToken(token: string | null) {
        this.token = token;
        // Also save to localStorage
        if (typeof window !== 'undefined') {
            if (token) {
                localStorage.setItem('token', token);
            } else {
                localStorage.removeItem('token');
            }
        }
    }

    getToken(): string | null {
        // Always check localStorage for the latest token
        if (typeof window !== 'undefined' && !this.token) {
            this.token = localStorage.getItem('token');
        }
        return this.token;
    }

    private async request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
        const { token, ...fetchOptions } = options;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            ...((options.headers as Record<string, string>) || {})
        };

        // Use provided token, or instance token, or check localStorage
        const authToken = token || this.getToken();
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        let response: Response;
        try {
            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...fetchOptions,
                headers,
                credentials: 'include',
                signal: controller.signal
            });

            clearTimeout(timeoutId);
        } catch (fetchError: any) {
            // Handle network errors (CORS, connection refused, timeout, etc.)
            let errorMessage = 'Network error. Please check your connection and try again.';

            if (fetchError.name === 'AbortError') {
                errorMessage = 'Request timeout. Please try again.';
            } else if (fetchError.message?.includes('Failed to fetch') || fetchError.message?.includes('NetworkError')) {
                errorMessage = 'Unable to connect to server. Please check your internet connection.';
            }

            const networkError = new Error(errorMessage) as Error & { status: number; code: string; originalError: any };
            networkError.status = 0;
            networkError.code = 'NETWORK_ERROR';
            networkError.originalError = fetchError;
            throw networkError;
        }

        let data: any;
        try {
            data = await response.json();
        } catch (jsonError) {
            // If response is not JSON, create a generic error
            const error = new Error(response.statusText || 'Server error') as Error & { status: number; code: string };
            error.status = response.status;
            error.code = 'INVALID_RESPONSE';
            throw error;
        }

        if (!response.ok) {
            const error = new Error(data.error || 'API Error') as Error & { status: number; code: string };
            error.status = response.status;
            error.code = data.code || 'API_ERROR';
            throw error;
        }

        return data;
    }

    // Auth endpoints
    async register(email: string, password: string, userData: { name?: string; firstName?: string; lastName?: string; phoneNumber?: string; countryCode?: string; captchaToken?: string }) {
        return this.request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, ...userData })
        });
    }

    async login(email: string, password: string, captchaToken?: string, retryCount = 0): Promise<{ token: string; user: any }> {
        const maxRetries = 2;
        try {
            const data = await this.request<{ token: string; user: any }>('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password, captchaToken })
            });
            this.setToken(data.token);
            return data;
        } catch (error: any) {
            // Retry on network errors
            if ((error.code === 'NETWORK_ERROR' || error.status === 0) && retryCount < maxRetries) {
                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                return this.login(email, password, captchaToken, retryCount + 1);
            }
            throw error;
        }
    }

    async logout() {
        const result = await this.request('/api/auth/logout', { method: 'POST' });
        this.setToken(null);
        return result;
    }

    async getSession() {
        return this.request<{ user: any }>('/api/auth/session');
    }

    async refreshToken() {
        const data = await this.request<{ token: string }>('/api/auth/refresh', { method: 'POST' });
        this.setToken(data.token);
        return data;
    }

    async changePassword(currentPassword: string, newPassword: string) {
        return this.request('/api/auth/change-password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword })
        });
    }

    async forgotPassword(email: string) {
        return this.request('/api/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    }

    async resetPassword(token: string, newPassword: string) {
        return this.request('/api/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, newPassword })
        });
    }

    async verifyEmail(token: string) {
        return this.request('/api/auth/verify-email', {
            method: 'POST',
            body: JSON.stringify({ token })
        });
    }

    async resendVerificationEmail(email: string) {
        return this.request('/api/auth/resend-verification', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    }

    // User endpoints
    async getProfile() {
        return this.request<{ profile: any; stats: any }>('/api/users/profile');
    }

    async updateProfile(updates: { name?: string; firstName?: string; lastName?: string; phoneNumber?: string; preferences?: any }) {
        return this.request('/api/users/profile', {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }

    async uploadAvatar(file: File) {
        const formData = new FormData();
        formData.append('avatar', file);

        const headers: Record<string, string> = {
            'ngrok-skip-browser-warning': 'true'
        };
        const authToken = this.getToken();
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(`${this.baseUrl}/api/users/avatar`, {
            method: 'POST',
            headers,
            body: formData,
            credentials: 'include'
        });

        return response.json();
    }

    async deleteAvatar() {
        return this.request('/api/users/avatar', { method: 'DELETE' });
    }

    // Conversation endpoints
    async getConversations(includeArchived = false) {
        const query = includeArchived ? '?archived=true' : '';
        return this.request<{ conversations: any[] }>(`/api/conversations${query}`);
    }

    async createConversation(title?: string) {
        return this.request<{ conversation: any }>('/api/conversations', {
            method: 'POST',
            body: JSON.stringify({ title })
        });
    }

    async getConversation(id: string) {
        return this.request<{ conversation: any }>(`/api/conversations/${id}`);
    }

    async updateConversation(id: string, updates: { title?: string; isPinned?: boolean; isArchived?: boolean }) {
        return this.request(`/api/conversations/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }

    async renameConversation(id: string, title: string) {
        return this.request(`/api/conversations/${id}/rename`, {
            method: 'PATCH',
            body: JSON.stringify({ title })
        });
    }

    async togglePin(id: string) {
        return this.request<{ isPinned: boolean }>(`/api/conversations/${id}/pin`, { method: 'PATCH' });
    }

    async toggleArchive(id: string) {
        return this.request<{ isArchived: boolean }>(`/api/conversations/${id}/archive`, { method: 'PATCH' });
    }

    async deleteConversation(id: string) {
        return this.request(`/api/conversations/${id}`, { method: 'DELETE' });
    }

    async deleteAllConversations() {
        return this.request('/api/conversations', { method: 'DELETE' });
    }

    async archiveAllConversations() {
        return this.request('/api/conversations/archive-all', { method: 'POST' });
    }

    async unarchiveAllConversations() {
        return this.request('/api/conversations/unarchive-all', { method: 'POST' });
    }

    // Message endpoints
    async getMessages(conversationId: string) {
        return this.request<{ messages: any[] }>(`/api/conversations/${conversationId}/messages`);
    }

    async createMessage(conversationId: string, role: string, content: string, responseTime?: number) {
        return this.request<{ message: any }>('/api/messages', {
            method: 'POST',
            body: JSON.stringify({ conversationId, role, content, responseTime })
        });
    }

    async updateMessage(id: string, content: string) {
        return this.request<{
            id: string;
            content: string;
            current_version: number;
            total_versions: number;
            [key: string]: any;
        }>(`/api/messages/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ content })
        });
    }

    async deleteMessage(id: string) {
        return this.request(`/api/messages/${id}`, { method: 'DELETE' });
    }

    async getMessageVersions(id: string) {
        return this.request<{ currentVersion: number; totalVersions: number; versions: any[] }>(`/api/messages/${id}/versions`);
    }

    async switchMessageVersion(id: string, version: number) {
        return this.request(`/api/messages/${id}/versions/${version}`, { method: 'PATCH' });
    }

    async setMessageFeedback(id: string, feedback: 'like' | 'dislike' | null) {
        return this.request<{ success: boolean; feedback: string | null }>(`/api/messages/${id}/feedback`, {
            method: 'POST',
            body: JSON.stringify({ feedback })
        });
    }

    // Share endpoints
    async createShareLink(conversationId: string) {
        return this.request<{
            success: boolean;
            shareUrl: string;
            shareToken: string;
            isActive: boolean;
            viewCount: number;
            createdAt: string;
        }>(`/api/share/${conversationId}`, { method: 'POST' });
    }

    async getShareStatus(conversationId: string) {
        return this.request<{
            isShared: boolean;
            shareUrl?: string;
            shareToken?: string;
            isActive?: boolean;
            viewCount?: number;
            createdAt?: string;
        }>(`/api/share/${conversationId}`);
    }

    async revokeShare(conversationId: string) {
        return this.request<{ success: boolean }>(`/api/share/${conversationId}`, { method: 'DELETE' });
    }

    async getSharedChat(token: string) {
        return this.requestPublic<{
            title: string;
            model: string;
            messages: Array<{
                id: string;
                role: string;
                content: string;
                responseTime?: number;
                createdAt: string;
            }>;
            viewCount: number;
            createdAt: string;
        }>(`/api/share/view/${token}`);
    }

    // Public request (no auth)
    private async requestPublic<T>(endpoint: string): Promise<T> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            headers: { 
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            }
        });
        if (!response.ok) {
            throw new Error('Failed to load shared chat');
        }
        return response.json();
    }

    // AI endpoints
    async sendChatMessage(messages: Array<{ role: string; content: string }>, options?: { model?: string; temperature?: number; stream?: boolean }) {
        return this.request<{ message: any; usage: any; responseTime: number }>('/api/ai/chat', {
            method: 'POST',
            body: JSON.stringify({ messages, ...options })
        });
    }

    // Streaming chat - returns a reader for real-time updates
    async sendChatMessageStream(
        messages: Array<{ role: string; content: string }>,
        onChunk: (content: string) => void,
        onComplete: (responseTime: number) => void,
        options?: { model?: string; temperature?: number }
    ) {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
        };
        const authToken = this.getToken();
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(`${this.baseUrl}/api/ai/chat`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ messages, stream: true, ...options }),
            credentials: 'include'
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Stream failed');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        if (reader) {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.content) {
                                fullContent += data.content;
                                onChunk(fullContent);
                            }
                            if (data.done) {
                                onComplete(data.responseTime || 0);
                            }
                        } catch (e) {
                            // Skip invalid JSON
                        }
                    }
                }
            }
        }

        return fullContent;
    }

    async webSearch(query: string) {
        return this.request<{ answer: string; sources: any[]; mode: string; responseTime?: number }>('/api/ai/web-search', {
            method: 'POST',
            body: JSON.stringify({ query })
        });
    }

    async generateTitle(message: string): Promise<{ success: boolean; title: string }> {
        return this.request<{ success: boolean; title: string }>('/api/ai/generate-title', {
            method: 'POST',
            body: JSON.stringify({ message })
        });
    }

    // Service endpoints
    async transcribeAudio(audioBlob: Blob) {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'audio.webm');

        const headers: Record<string, string> = {
            'ngrok-skip-browser-warning': 'true'
        };
        const authToken = this.getToken();
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(`${this.baseUrl}/api/services/transcribe`, {
            method: 'POST',
            headers,
            body: formData,
            credentials: 'include'
        });

        return response.json();
    }

    async ocrFile(file: File) {
        const formData = new FormData();
        formData.append('file', file);

        const headers: Record<string, string> = {
            'ngrok-skip-browser-warning': 'true'
        };
        const authToken2 = this.getToken();
        if (authToken2) {
            headers['Authorization'] = `Bearer ${authToken2}`;
        }

        const response = await fetch(`${this.baseUrl}/api/services/ocr`, {
            method: 'POST',
            headers,
            body: formData,
            credentials: 'include'
        });

        return response.json();
    }

    // PDF reading - extracts text from PDF, DOC, DOCX, TXT files
    async readPDFContent(file: File): Promise<{ success: boolean; text: string; filename: string }> {
        const formData = new FormData();
        formData.append('file', file);

        const headers: Record<string, string> = {
            'ngrok-skip-browser-warning': 'true'
        };
        const authToken3 = this.getToken();
        if (authToken3) {
            headers['Authorization'] = `Bearer ${authToken3}`;
        }

        const response = await fetch(`${this.baseUrl}/api/services/pdf-read`, {
            method: 'POST',
            headers,
            body: formData,
            credentials: 'include'
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'PDF reading failed');
        }
        return data;
    }

    // Image OCR - extracts text from images
    async readImageText(file: File): Promise<{ success: boolean; text: string }> {
        const formData = new FormData();
        formData.append('file', file);

        const headers: Record<string, string> = {
            'ngrok-skip-browser-warning': 'true'
        };
        const authToken4 = this.getToken();
        if (authToken4) {
            headers['Authorization'] = `Bearer ${authToken4}`;
        }

        const response = await fetch(`${this.baseUrl}/api/services/ocr`, {
            method: 'POST',
            headers,
            body: formData,
            credentials: 'include'
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Image OCR failed');
        }
        return data;
    }
    // TTS - Text to Speech
    async textToSpeech(text: string, voice?: string): Promise<Blob> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
        };
        const authToken = this.getToken();
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(`${this.baseUrl}/api/services/tts`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ text, voice: voice || 'en-US-JennyNeural' }),
            credentials: 'include'
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'TTS failed' }));
            throw new Error(error.error || 'Text-to-speech failed');
        }

        return response.blob();
    }

    // Document Summarization - Upload file for AI summarization
    async uploadForSummarization(file: File): Promise<{ success: boolean; jobId: string; message: string; filename: string }> {
        const formData = new FormData();
        formData.append('file', file);

        const headers: Record<string, string> = {
            'ngrok-skip-browser-warning': 'true'
        };
        const authToken = this.getToken();
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(`https://summarizationagent-judicial-gpt.in.ngrok.io/summarize`, {
            method: 'POST',
            headers,
            body: formData
        });

        const isJson = response.headers.get('content-type')?.includes('application/json');
        const data = isJson ? await response.json() : null;

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Your session has expired. Please log out and log back in.');
            }
            throw new Error(data?.error || data?.message || `Upload failed (${response.status})`);
        }
        // Python API returns snake_case (job_id), map to camelCase (jobId)
        return {
            success: true,
            jobId: data.job_id || data.jobId,
            message: data.message,
            filename: data.filename
        };
    }

    // Document Summarization - Poll job status
    async getSummarizationStatus(jobId: string): Promise<{
        success: boolean;
        jobId: string;
        filename: string;
        status: 'pending' | 'processing' | 'done' | 'failed';
        summary: string | null;
        error: string | null;
        createdAt: number;
        completedAt: number | null;
    }> {
        const data = await this.requestAgent<any>(`https://summarizationagent-judicial-gpt.in.ngrok.io/jobs/${jobId}`);
        // Python API returns snake_case, map to camelCase
        return {
            success: true,
            jobId: data.job_id || data.jobId || jobId,
            filename: data.filename,
            status: data.status,
            summary: data.summary || null,
            error: data.error || null,
            createdAt: data.created_at || data.createdAt,
            completedAt: data.completed_at || data.completedAt || null
        };
    }

    // Helper for public ngrok requests
    private async requestAgent<T>(url: string, options: any = {}): Promise<T> {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            }
        });
        return response.json();
    }

    // Document Summarization - Ask follow-up question
    async askSummarization(jobId: string, question: string): Promise<{
        success: boolean;
        jobId: string;
        question: string;
        answer: string;
    }> {
        return this.requestAgent('https://summarizationagent-judicial-gpt.in.ngrok.io/ask', {
            method: 'POST',
            body: JSON.stringify({ job_id: jobId, question })
        });
    }

    // Voice-to-Voice - Complete pipeline
    async voiceToVoice(audioBlob: Blob): Promise<{ success: boolean; transcription: string; aiResponse: string; audio: string | null }> {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'audio.webm');

        const headers: Record<string, string> = {
            'ngrok-skip-browser-warning': 'true'
        };
        const authToken = this.getToken();
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(`${this.baseUrl}/api/services/voice-to-voice`, {
            method: 'POST',
            headers,
            body: formData,
            credentials: 'include'
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Voice-to-voice failed' }));
            throw new Error(error.error || 'Voice-to-voice processing failed');
        }

        return response.json();
    }
}

export const api = new ApiClient(API_BASE_URL);
export default api;
