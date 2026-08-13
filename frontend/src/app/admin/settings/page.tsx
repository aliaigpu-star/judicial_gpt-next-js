'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Settings,
    Shield,
    Database,
    Key,
    Bell,
    Mail,
    Globe,
    RefreshCw,
    CheckCircle,
    Save,
    Download,
    Upload,
    AlertTriangle,
    Info
} from 'lucide-react';
import { adminApi, type SystemStatus as SystemStatusType } from '@/lib/adminApi';
import { useAuth } from '@/context/AuthContext';

interface SettingsSectionProps {
    title: string;
    description: string;
    icon: React.ElementType;
    children: React.ReactNode;
    delay?: number;
}

function SettingsSection({ title, description, icon: Icon, children, delay = 0 }: SettingsSectionProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6"
        >
            <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-[#0c9344]/10 rounded-xl">
                    <Icon className="h-6 w-6 text-[#0c9344]" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    <p className="text-gray-400 text-sm mt-1">{description}</p>
                </div>
            </div>
            {children}
        </motion.div>
    );
}

interface ToggleSettingProps {
    label: string;
    description: string;
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    disabled?: boolean;
}

function ToggleSetting({ label, description, enabled, onChange, disabled }: ToggleSettingProps) {
    return (
        <div className="flex items-center justify-between py-4 border-b border-gray-800 last:border-0">
            <div>
                <p className="text-white font-medium">{label}</p>
                <p className="text-gray-500 text-sm">{description}</p>
            </div>
            <button
                onClick={() => onChange(!enabled)}
                disabled={disabled}
                className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-[#0c9344]' : 'bg-gray-700'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
                <div
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${enabled ? 'translate-x-7' : 'translate-x-1'
                        }`}
                />
            </button>
        </div>
    );
}

interface SystemSettings {
    smtp_enabled: boolean;
    smtp_host?: string;
    smtp_port?: number;
    smtp_secure?: boolean;
    smtp_user?: string;
    smtp_password?: string;
    smtp_from_email?: string;
    smtp_from_name?: string;
    require_email_verification?: boolean;
}

export default function SettingsPage() {
    const { user } = useAuth();
    const [systemStatus, setSystemStatus] = useState<SystemStatusType | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Settings state
    const [settings, setSettings] = useState({
        emailNotifications: true,
        securityAlerts: true,
        maintenanceMode: false,
        debugMode: false,
        rateLimiting: true,
        autoBackup: true
    });

    // SMTP Settings state
    const [smtpSettings, setSmtpSettings] = useState<SystemSettings>({
        smtp_enabled: true,
        smtp_host: 'smtp.gmail.com',
        smtp_port: 465,
        smtp_secure: true,
        smtp_user: '',
        smtp_password: '',
        smtp_from_email: '',
        smtp_from_name: 'Judicial GPT',
        require_email_verification: false
    });

    const loadSystemStatus = useCallback(async () => {
        try {
            const [status, settingsData] = await Promise.all([
                adminApi.getSystemStatus(),
                adminApi.getSettings().catch(() => null)
            ]);
            setSystemStatus(status);
            if (settingsData?.settings) {
                // Properly merge settings, handling null/undefined values
                setSmtpSettings({
                    smtp_enabled: settingsData.settings.smtp_enabled ?? true,
                    smtp_host: settingsData.settings.smtp_host || 'smtp.gmail.com',
                    smtp_port: settingsData.settings.smtp_port || 587,
                    smtp_secure: settingsData.settings.smtp_secure ?? true,
                    smtp_user: settingsData.settings.smtp_user || '',
                    smtp_password: settingsData.settings.smtp_password || '',
                    smtp_from_email: settingsData.settings.smtp_from_email || '',
                    smtp_from_name: settingsData.settings.smtp_from_name || 'Judicial GPT',
                    require_email_verification: settingsData.settings.require_email_verification ?? false
                });
            }
        } catch (err) {
            console.error('Failed to load system status:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSystemStatus();
    }, [loadSystemStatus]);

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSaveSuccess(false);
        try {
            // Prepare settings object with all fields
            const settingsToSave: SystemSettings = {
                smtp_enabled: smtpSettings.smtp_enabled,
                smtp_host: smtpSettings.smtp_host || '',
                smtp_port: smtpSettings.smtp_port || 587,
                smtp_secure: smtpSettings.smtp_secure ?? true,
                smtp_user: smtpSettings.smtp_user || '',
                smtp_password: smtpSettings.smtp_password || '',
                smtp_from_email: smtpSettings.smtp_from_email || '',
                smtp_from_name: smtpSettings.smtp_from_name || 'Judicial GPT',
                require_email_verification: smtpSettings.require_email_verification ?? false
            };

            // Don't send password if it's empty or masked (to keep existing password)
            if (!settingsToSave.smtp_password || settingsToSave.smtp_password === '••••••••') {
                delete settingsToSave.smtp_password;
            }

            const result = await adminApi.updateSettings(settingsToSave);

            // Check for warnings
            if (result.warning) {
                console.warn('Settings saved with warning:', result.warning);
                setError(result.warning);
            }

            // Reload settings to get updated values from server
            const updatedSettings = await adminApi.getSettings();
            if (updatedSettings?.settings) {
                setSmtpSettings({
                    smtp_enabled: updatedSettings.settings.smtp_enabled ?? true,
                    smtp_host: updatedSettings.settings.smtp_host || 'smtp.gmail.com',
                    smtp_port: updatedSettings.settings.smtp_port || 587,
                    smtp_secure: updatedSettings.settings.smtp_secure ?? true,
                    smtp_user: updatedSettings.settings.smtp_user || '',
                    smtp_password: updatedSettings.settings.smtp_password || '',
                    smtp_from_email: updatedSettings.settings.smtp_from_email || '',
                    smtp_from_name: updatedSettings.settings.smtp_from_name || 'Judicial GPT',
                    require_email_verification: updatedSettings.settings.require_email_verification ?? false
                });
            }

            if (!result.warning) {
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
            }
        } catch (err: any) {
            console.error('Error saving settings:', err);
            setError(err.message || 'Failed to save settings. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleExportData = () => {
        // Export data functionality placeholder
        alert('Data export functionality coming soon');
    };

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <motion.h1
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-2xl font-bold text-white"
                    >
                        Settings
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-gray-400 mt-1"
                    >
                        Configure system settings and preferences
                    </motion.p>
                </div>
                <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3"
                >
                    {saveSuccess && (
                        <motion.div
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-2 text-[#0c9344]"
                        >
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-sm">Saved</span>
                        </motion.div>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#0c9344] hover:bg-[#0c9344] text-white rounded-xl transition-all disabled:opacity-50"
                    >
                        {saving ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        Save Changes
                    </button>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* System Status */}
                <SettingsSection
                    title="System Status"
                    description="Current health status of all system components"
                    icon={Shield}
                    delay={0}
                >
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl">
                            <div className="flex items-center gap-3">
                                <Database className="h-5 w-5 text-blue-400" />
                                <span className="text-white">Database</span>
                            </div>
                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${systemStatus?.checks.database
                                ? 'bg-[#0c9344]/10 text-[#0c9344]'
                                : 'bg-red-500/10 text-red-400'
                                }`}>
                                <span className={`w-2 h-2 rounded-full ${systemStatus?.checks.database ? 'bg-[#0c9344]' : 'bg-red-400'
                                    }`} />
                                {systemStatus?.checks.database ? 'Connected' : 'Disconnected'}
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl">
                            <div className="flex items-center gap-3">
                                <Globe className="h-5 w-5 text-purple-400" />
                                <span className="text-white">API Server</span>
                            </div>
                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${systemStatus?.checks.api
                                ? 'bg-[#0c9344]/10 text-[#0c9344]'
                                : 'bg-red-500/10 text-red-400'
                                }`}>
                                <span className={`w-2 h-2 rounded-full ${systemStatus?.checks.api ? 'bg-[#0c9344]' : 'bg-red-400'
                                    }`} />
                                {systemStatus?.checks.api ? 'Running' : 'Offline'}
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl">
                            <div className="flex items-center gap-3">
                                <Key className="h-5 w-5 text-orange-400" />
                                <span className="text-white">AI Service</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-[#0c9344]/10 text-[#0c9344]">
                                <span className="w-2 h-2 rounded-full bg-[#0c9344]" />
                                Active
                            </div>
                        </div>
                    </div>

                    {systemStatus?.timestamp && (
                        <p className="text-gray-500 text-sm mt-4 text-center">
                            Last checked: {new Date(systemStatus.timestamp).toLocaleString()}
                        </p>
                    )}
                </SettingsSection>

                {/* Notifications */}
                <SettingsSection
                    title="Notifications"
                    description="Configure email and alert settings"
                    icon={Bell}
                    delay={0.1}
                >
                    <ToggleSetting
                        label="Email Notifications"
                        description="Send email notifications for important events"
                        enabled={settings.emailNotifications}
                        onChange={(v) => setSettings({ ...settings, emailNotifications: v })}
                    />
                    <ToggleSetting
                        label="Security Alerts"
                        description="Receive alerts for security-related events"
                        enabled={settings.securityAlerts}
                        onChange={(v) => setSettings({ ...settings, securityAlerts: v })}
                    />
                </SettingsSection>

                {/* Security */}
                <SettingsSection
                    title="Security"
                    description="Security and access control settings"
                    icon={Shield}
                    delay={0.2}
                >
                    <ToggleSetting
                        label="Rate Limiting"
                        description="Limit API requests to prevent abuse"
                        enabled={settings.rateLimiting}
                        onChange={(v) => setSettings({ ...settings, rateLimiting: v })}
                    />
                    <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                        <div className="flex items-start gap-3">
                            <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-blue-400 font-medium">Rate Limit Configuration</p>
                                <p className="text-gray-400 text-sm mt-1">
                                    Current limit: 100 requests per minute per user
                                </p>
                            </div>
                        </div>
                    </div>
                </SettingsSection>

                {/* System */}
                <SettingsSection
                    title="System"
                    description="General system configuration"
                    icon={Settings}
                    delay={0.3}
                >
                    <ToggleSetting
                        label="Maintenance Mode"
                        description="Disable access for non-admin users"
                        enabled={settings.maintenanceMode}
                        onChange={(v) => setSettings({ ...settings, maintenanceMode: v })}
                    />
                    <ToggleSetting
                        label="Debug Mode"
                        description="Enable verbose logging for debugging"
                        enabled={settings.debugMode}
                        onChange={(v) => setSettings({ ...settings, debugMode: v })}
                    />
                    <ToggleSetting
                        label="Auto Backup"
                        description="Automatically backup data daily"
                        enabled={settings.autoBackup}
                        onChange={(v) => setSettings({ ...settings, autoBackup: v })}
                    />
                </SettingsSection>

                {/* Data Management */}
                <SettingsSection
                    title="Data Management"
                    description="Export and manage system data"
                    icon={Database}
                    delay={0.4}
                >
                    <div className="space-y-4">
                        <button
                            onClick={handleExportData}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-xl transition-all"
                        >
                            <Download className="h-4 w-4" />
                            Export All Data
                        </button>
                        <button
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-xl transition-all"
                        >
                            <Upload className="h-4 w-4" />
                            Import Data
                        </button>
                    </div>

                    <div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-orange-400 font-medium">Caution</p>
                                <p className="text-gray-400 text-sm mt-1">
                                    Importing data will merge with existing records. Make sure to backup first.
                                </p>
                            </div>
                        </div>
                    </div>
                </SettingsSection>

                {/* SMTP Email Configuration */}
                <SettingsSection
                    title="SMTP Email Configuration"
                    description="Configure email service for verification and password reset"
                    icon={Mail}
                    delay={0.5}
                >
                    <div className="space-y-4">
                        <ToggleSetting
                            label="Enable SMTP"
                            description="Enable email sending for verification and password reset"
                            enabled={smtpSettings.smtp_enabled}
                            onChange={(v) => setSmtpSettings({ ...smtpSettings, smtp_enabled: v })}
                        />

                        {smtpSettings.smtp_enabled && (
                            <>
                                <div className="pt-2 space-y-4 border-t border-gray-800">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">
                                            SMTP Host
                                        </label>
                                        <input
                                            type="text"
                                            value={smtpSettings.smtp_host || ''}
                                            onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_host: e.target.value })}
                                            placeholder="smtp.gmail.com"
                                            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#0c9344]/50 focus:border-[#0c9344]/50 outline-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                                Port
                                            </label>
                                            <input
                                                type="number"
                                                value={smtpSettings.smtp_port || 587}
                                                onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_port: parseInt(e.target.value) })}
                                                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-[#0c9344]/50 focus:border-[#0c9344]/50 outline-none"
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <ToggleSetting
                                                label="Secure (SSL/TLS)"
                                                description=""
                                                enabled={smtpSettings.smtp_secure || false}
                                                onChange={(v) => setSmtpSettings({ ...smtpSettings, smtp_secure: v })}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">
                                            SMTP User (Email)
                                        </label>
                                        <input
                                            type="email"
                                            value={smtpSettings.smtp_user || ''}
                                            onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_user: e.target.value })}
                                            placeholder="your-email@gmail.com"
                                            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#0c9344]/50 focus:border-[#0c9344]/50 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">
                                            SMTP Password
                                        </label>
                                        <input
                                            type="password"
                                            value={smtpSettings.smtp_password || ''}
                                            onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_password: e.target.value })}
                                            placeholder={smtpSettings.smtp_password === '••••••••' ? 'Password saved - enter new to change' : 'Enter SMTP password'}
                                            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#0c9344]/50 focus:border-[#0c9344]/50 outline-none"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">
                                            For Gmail, use an App Password, not your regular password. Leave empty to keep current password.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">
                                            From Email
                                        </label>
                                        <input
                                            type="email"
                                            value={smtpSettings.smtp_from_email || ''}
                                            onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_from_email: e.target.value })}
                                            placeholder="noreply@judicialgpt.com"
                                            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#0c9344]/50 focus:border-[#0c9344]/50 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">
                                            From Name
                                        </label>
                                        <input
                                            type="text"
                                            value={smtpSettings.smtp_from_name || ''}
                                            onChange={(e) => setSmtpSettings({ ...smtpSettings, smtp_from_name: e.target.value })}
                                            placeholder="Judicial GPT"
                                            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#0c9344]/50 focus:border-[#0c9344]/50 outline-none"
                                        />
                                    </div>

                                    <ToggleSetting
                                        label="Require Email Verification"
                                        description="Users must verify their email before accessing the system"
                                        enabled={smtpSettings.require_email_verification || false}
                                        onChange={(v) => setSmtpSettings({ ...smtpSettings, require_email_verification: v })}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </SettingsSection>
            </div>

            {/* Error/Warning Display */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-6 px-4 py-3 rounded-xl ${error.includes('successfully') || error.includes('saved')
                        ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
                        : 'bg-red-500/10 border border-red-500/30 text-red-400'
                        }`}
                >
                    <div className="flex items-start gap-2">
                        {error.includes('successfully') || error.includes('saved') ? (
                            <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        ) : (
                            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        )}
                        <div>
                            <p className="font-medium">{error.includes('successfully') || error.includes('saved') ? 'Warning' : 'Error'}</p>
                            <p className="text-sm mt-1">{error}</p>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
