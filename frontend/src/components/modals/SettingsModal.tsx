'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Bell, Shield, Sparkles, Settings, Database, ChevronDown, Check, User, Camera, Loader2, Lock, Eye, EyeOff, Mail, Archive, Trash2, AlertTriangle
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useAccentColor, AccentColor, accentColorMap } from '@/context/AccentColorContext';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    showArchived?: boolean;
    onToggleArchived?: () => void;
    initialTab?: string;
}

// Custom Dropdown Component
interface DropdownOption {
    value: string;
    label: string;
}

interface CustomDropdownProps {
    value: string;
    options: DropdownOption[];
    onChange: (value: string) => void;
}

function CustomDropdown({ value, options, onChange }: CustomDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    const selectedLabel = options.find(opt => opt.value === value)?.label || value;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
                {selectedLabel}
                <ChevronDown className="w-4 h-4" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.1 }}
                        className="absolute right-0 top-full mt-2 min-w-[140px] bg-white dark:bg-[#2f2f2f] rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
                    >
                        {options.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
                            >
                                <span>{option.label}</span>
                                {value === option.value && (
                                    <Check className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                                )}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Color Dropdown with colored dots
interface ColorOption {
    value: AccentColor;
    label: string;
    displayDot: string; // Color for display in dropdown
}

const colorOptions: ColorOption[] = [
    { value: 'default', label: 'Default', displayDot: 'bg-gray-100' },
    { value: 'blue', label: 'Blue', displayDot: 'bg-blue-500' },
    { value: 'green', label: 'Green', displayDot: 'bg-green-500' },
    { value: 'yellow', label: 'Yellow', displayDot: 'bg-yellow-500' },
    { value: 'pink', label: 'Pink', displayDot: 'bg-pink-500' },
    { value: 'orange', label: 'Orange', displayDot: 'bg-orange-500' },
];

interface ColorDropdownProps {
    value: AccentColor;
    onChange: (value: AccentColor) => void;
}

function ColorDropdown({ value, onChange }: ColorDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    const selectedOption = colorOptions.find(opt => opt.value === value) || colorOptions[0];

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
                <span className={`w-2 h-2 rounded-full ${selectedOption.displayDot}`} />
                {selectedOption.label}
                <ChevronDown className="w-4 h-4" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.1 }}
                        className="absolute right-0 top-full mt-2 min-w-[140px] bg-white dark:bg-[#2f2f2f] rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
                    >
                        {colorOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${option.displayDot}`} />
                                    <span>{option.label}</span>
                                </div>
                                {value === option.value && (
                                    <Check className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                                )}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function SettingsModal({ isOpen, onClose, showArchived, onToggleArchived, initialTab = 'General' }: SettingsModalProps) {
    const { themeMode, setThemeMode } = useTheme();
    const { accentColor, setAccentColor } = useAccentColor();
    const { user, refreshUser } = useAuth();
    const [activeTab, setActiveTab] = useState('General');
    const [inactivityTimeout, setInactivityTimeout] = useState('60');
    const [notifications, setNotifications] = useState(true);
    const [customInstructions, setCustomInstructions] = useState('');
    const [originalInstructions, setOriginalInstructions] = useState('');
    const [isSavingInstructions, setIsSavingInstructions] = useState(false);
    const [instructionsMessage, setInstructionsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Account tab state
    const [displayName, setDisplayName] = useState('');
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Data controls state
    const [isArchivingAll, setIsArchivingAll] = useState(false);
    const [isUnarchivingAll, setIsUnarchivingAll] = useState(false);
    const [isDeletingAll, setIsDeletingAll] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [dataMessage, setDataMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            setActiveTab(initialTab);
            api.getProfile()
                .then(data => {
                    const instructions = data.profile?.preferences?.custom_instructions || '';
                    setCustomInstructions(instructions);
                    setOriginalInstructions(instructions);
                })
                .catch(err => console.error('Failed to load profile settings:', err));
        }
    }, [isOpen, initialTab]);

    useEffect(() => {
        if (user) {
            setDisplayName(user.name || '');
        }
    }, [user]);

    const saveCustomInstructions = async () => {
        setIsSavingInstructions(true);
        try {
            const { profile } = await api.getProfile();
            const currentPreferences = profile.preferences || {};
            await api.updateProfile({
                preferences: {
                    ...currentPreferences,
                    custom_instructions: customInstructions
                }
            });
            setOriginalInstructions(customInstructions);
            setInstructionsMessage({ type: 'success', text: 'Personalization saved' });
            setTimeout(() => setInstructionsMessage(null), 3000);
        } catch (error: any) {
            console.error('Failed to save personalization:', error);
            setInstructionsMessage({ type: 'error', text: error.message || 'Failed to save personalization' });
        } finally {
            setIsSavingInstructions(false);
        }
    };

    const handleSave = async () => {
        if (customInstructions !== originalInstructions) {
            await saveCustomInstructions();
        }
    };

    const hasInstructionChanges = customInstructions !== originalInstructions;

    const tabs = [
        { id: 'General', label: 'General', icon: Settings },
        { id: 'Notifications', label: 'Notifications', icon: Bell },
        { id: 'Personalization', label: 'Personalization', icon: Sparkles },
        { id: 'Data controls', label: 'Data controls', icon: Database },
        { id: 'Security', label: 'Security', icon: Shield },
        { id: 'Account', label: 'Account', icon: User },
    ];

    const themeOptions: DropdownOption[] = [
        { value: 'system', label: 'System' },
        { value: 'dark', label: 'Dark' },
        { value: 'light', label: 'Light' },
    ];

    const timeoutOptions: DropdownOption[] = [
        { value: '15', label: '15 minutes' },
        { value: '30', label: '30 minutes' },
        { value: '60', label: '1 hour' },
        { value: '120', label: '2 hours' },
        { value: '0', label: 'Never' },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'General':
                return (
                    <div className="space-y-1">
                        <div className="flex items-center justify-between py-3">
                            <span className="text-sm text-gray-900 dark:text-gray-100">Appearance</span>
                            <CustomDropdown
                                value={themeMode}
                                options={themeOptions}
                                onChange={(val) => setThemeMode(val as 'light' | 'dark' | 'system')}
                            />
                        </div>
                        <div className="flex items-center justify-between py-3">
                            <span className="text-sm text-gray-900 dark:text-gray-100">Accent color</span>
                            <ColorDropdown
                                value={accentColor}
                                onChange={setAccentColor}
                            />
                        </div>
                    </div>
                );
            case 'Notifications':
                return (
                    <div className="space-y-1">
                        <div className="flex items-center justify-between py-3">
                            <div>
                                <div className="text-sm text-gray-900 dark:text-gray-100">Browser Notifications</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Receive notifications for important updates
                                </div>
                            </div>
                            <button
                                onClick={() => setNotifications(!notifications)}
                                className={`relative w-10 h-6 rounded-full transition-colors ${notifications ? 'bg-[#00a859]' : 'bg-gray-200 dark:bg-gray-600'}`}
                            >
                                <span
                                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${notifications ? 'translate-x-4' : ''}`}
                                />
                            </button>
                        </div>
                    </div>
                );
            case 'Personalization':
                return (
                    <div className="space-y-4">
                        <div>
                            <div className="text-sm text-gray-900 dark:text-gray-100 mb-1">Custom Instructions</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                Add specific instructions or personal context you want the AI to always prioritize.
                            </div>
                            <textarea
                                value={customInstructions}
                                onChange={(e) => {
                                    setCustomInstructions(e.target.value);
                                    setInstructionsMessage(null);
                                }}
                                placeholder="e.g., 'I am a law student in California', 'Always cite specific case law'"
                                className="w-full h-28 p-3 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 outline-none text-gray-900 dark:text-white resize-none"
                            />
                            {instructionsMessage && (
                                <div className={`mt-3 p-2 text-sm rounded-lg ${instructionsMessage.type === 'success' ? 'bg-[#00a859]/10 text-[#00a859] dark:bg-[#00a859]/20' : 'bg-red-50 text-red-600 dark:bg-red-900/20'}`}>
                                    {instructionsMessage.text}
                                </div>
                            )}
                            {hasInstructionChanges && (
                                <div className="mt-3 flex items-center justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCustomInstructions(originalInstructions);
                                            setInstructionsMessage(null);
                                        }}
                                        disabled={isSavingInstructions}
                                        aria-label="Discard personalization changes"
                                        title="Discard changes"
                                        className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={saveCustomInstructions}
                                        disabled={isSavingInstructions}
                                        aria-label="Save personalization changes"
                                        title="Save changes"
                                        className="p-2 rounded-lg bg-[#00a859] text-white hover:bg-[#00a859] transition-colors disabled:opacity-50"
                                    >
                                        {isSavingInstructions ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'Data controls':
                return (
                    <div className="space-y-4">
                        {/* Show Archived Toggle */}
                        <div className="flex items-center justify-between py-3">
                            <div>
                                <div className="text-sm text-gray-900 dark:text-gray-100">Show Archived Chats</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Display archived conversations in the sidebar
                                </div>
                            </div>
                            <button
                                onClick={onToggleArchived}
                                className={`relative w-10 h-6 rounded-full transition-colors ${showArchived ? 'bg-[#00a859]' : 'bg-gray-200 dark:bg-gray-600'}`}
                            >
                                <span
                                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${showArchived ? 'translate-x-4' : ''}`}
                                />
                            </button>
                        </div>

                        {dataMessage && (
                            <div className={`p-2 text-sm rounded-lg ${dataMessage.type === 'success' ? 'bg-[#00a859]/10 text-[#00a859] dark:bg-[#00a859]/20' : 'bg-red-50 text-red-600 dark:bg-red-900/20'}`}>
                                {dataMessage.text}
                            </div>
                        )}

                        {/* Archive All Chats */}
                        <div className="flex items-center justify-between py-3 border-t border-gray-200 dark:border-gray-700">
                            <div>
                                <div className="text-sm text-gray-900 dark:text-gray-100">Archive All Chats</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Move all conversations to archive
                                </div>
                            </div>
                            <button
                                onClick={async () => {
                                    setIsArchivingAll(true);
                                    try {
                                        await api.archiveAllConversations();
                                        setDataMessage({ type: 'success', text: 'All chats archived successfully' });
                                        setTimeout(() => setDataMessage(null), 3000);
                                    } catch (err: any) {
                                        setDataMessage({ type: 'error', text: err.message || 'Failed to archive chats' });
                                    } finally {
                                        setIsArchivingAll(false);
                                    }
                                }}
                                disabled={isArchivingAll}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isArchivingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                                Archive All
                            </button>
                        </div>

                        {/* Unarchive All Chats */}
                        <div className="flex items-center justify-between py-3 border-t border-gray-200 dark:border-gray-700">
                            <div>
                                <div className="text-sm text-gray-900 dark:text-gray-100">Unarchive All Chats</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Restore all archived conversations
                                </div>
                            </div>
                            <button
                                onClick={async () => {
                                    setIsUnarchivingAll(true);
                                    try {
                                        await api.unarchiveAllConversations();
                                        setDataMessage({ type: 'success', text: 'All chats unarchived successfully' });
                                        setTimeout(() => setDataMessage(null), 3000);
                                    } catch (err: any) {
                                        setDataMessage({ type: 'error', text: err.message || 'Failed to unarchive chats' });
                                    } finally {
                                        setIsUnarchivingAll(false);
                                    }
                                }}
                                disabled={isUnarchivingAll}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isUnarchivingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                                Unarchive All
                            </button>
                        </div>

                        {/* Delete All Chats */}
                        <div className="flex items-center justify-between py-3 border-t border-gray-200 dark:border-gray-700">
                            <div>
                                <div className="text-sm text-red-600">Delete All Chats</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Permanently delete all conversations
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete All
                            </button>
                        </div>

                        {/* Delete Confirmation Modal */}
                        <AnimatePresence>
                            {showDeleteConfirm && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
                                    onClick={() => setShowDeleteConfirm(false)}
                                >
                                    <motion.div
                                        initial={{ scale: 0.95 }}
                                        animate={{ scale: 1 }}
                                        exit={{ scale: 0.95 }}
                                        className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm mx-4 shadow-xl"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                                                <AlertTriangle className="w-6 h-6 text-red-600" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete All Chats?</h3>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                                            This will permanently delete all your conversations. This action cannot be undone.
                                        </p>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setShowDeleteConfirm(false)}
                                                className="flex-1 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    setIsDeletingAll(true);
                                                    try {
                                                        await api.deleteAllConversations();
                                                        setDataMessage({ type: 'success', text: 'All chats deleted successfully' });
                                                        setShowDeleteConfirm(false);
                                                        setTimeout(() => setDataMessage(null), 3000);
                                                    } catch (err: any) {
                                                        setDataMessage({ type: 'error', text: err.message || 'Failed to delete chats' });
                                                    } finally {
                                                        setIsDeletingAll(false);
                                                    }
                                                }}
                                                disabled={isDeletingAll}
                                                className="flex-1 px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {isDeletingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                                Delete All
                                            </button>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            case 'Security':
                return (
                    <div className="space-y-1">
                        <div className="flex items-center justify-between py-3">
                            <div>
                                <div className="text-sm text-gray-900 dark:text-gray-100">Inactivity Timeout</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Automatically log out after inactivity
                                </div>
                            </div>
                            <CustomDropdown
                                value={inactivityTimeout}
                                options={timeoutOptions}
                                onChange={setInactivityTimeout}
                            />
                        </div>
                    </div>
                );
            case 'Account':
                return (
                    <div className="space-y-6">
                        {/* Avatar */}
                        <div className="flex items-center gap-4">
                            <div className="relative group">
                                <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                                    {user?.avatarUrl ? (
                                        <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-[#00a859] text-white text-xl font-bold">
                                            {user?.name?.[0] || user?.email?.[0] || 'U'}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploadingAvatar}
                                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    {isUploadingAvatar ? (
                                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                                    ) : (
                                        <Camera className="w-5 h-5 text-white" />
                                    )}
                                </button>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    setIsUploadingAvatar(true);
                                    try {
                                        await api.uploadAvatar(file);
                                        await refreshUser();
                                        setProfileMessage({ type: 'success', text: 'Avatar updated' });
                                    } catch (err: any) {
                                        setProfileMessage({ type: 'error', text: err.message || 'Upload failed' });
                                    } finally {
                                        setIsUploadingAvatar(false);
                                    }
                                }}
                                className="hidden"
                            />
                            <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{user?.name || 'User'}</div>
                                <div className="text-xs text-gray-500">{user?.email}</div>
                            </div>
                        </div>

                        {profileMessage && (
                            <div className={`p-2 text-sm rounded-lg ${profileMessage.type === 'success' ? 'bg-[#00a859]/10 text-[#00a859] dark:bg-[#00a859]/20' : 'bg-red-50 text-red-600 dark:bg-red-900/20'}`}>
                                {profileMessage.text}
                            </div>
                        )}

                        {/* Display Name */}
                        <div>
                            <div className="text-sm text-gray-900 dark:text-gray-100 mb-2">Display Name</div>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600 outline-none text-gray-900 dark:text-white"
                                placeholder="Your name"
                            />
                        </div>

                        {/* Email (read-only) */}
                        <div>
                            <div className="text-sm text-gray-900 dark:text-gray-100 mb-2">Email</div>
                            <input
                                type="email"
                                value={user?.email || ''}
                                disabled
                                className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400"
                            />
                            <div className="text-xs text-gray-500 mt-1">Email cannot be changed</div>
                        </div>

                        {/* Save Button */}
                        <button
                            onClick={async () => {
                                setIsSavingProfile(true);
                                try {
                                    await api.updateProfile({ name: displayName });
                                    await refreshUser();
                                    setProfileMessage({ type: 'success', text: 'Profile updated' });
                                    setTimeout(() => setProfileMessage(null), 3000);
                                } catch (err: any) {
                                    setProfileMessage({ type: 'error', text: err.message || 'Update failed' });
                                } finally {
                                    setIsSavingProfile(false);
                                }
                            }}
                            disabled={isSavingProfile}
                            className="px-4 py-2 bg-[#00a859] text-white text-sm rounded-lg hover:bg-[#00a859] transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            Save Changes
                        </button>
                    </div>
                );
            default:
                return null;
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                onClick={() => { handleSave(); onClose(); }}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white dark:bg-[#2f2f2f] rounded-2xl shadow-2xl w-full max-w-[720px] h-[520px] flex overflow-hidden border border-gray-200/50 dark:border-gray-700/30"
                >
                    {/* Sidebar */}
                    <div className="w-[220px] bg-gray-50/80 dark:bg-[#1a1a1a] flex flex-col border-r border-gray-200/50 dark:border-gray-700/30">
                        <div className="p-4 flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">Settings</span>
                            <button
                                onClick={() => { handleSave(); onClose(); }}
                                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500 dark:text-gray-400"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <nav className="flex-1 px-3 space-y-1">
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${isActive
                                            ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white font-medium shadow-sm'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                                            }`}
                                    >
                                        <Icon className={`w-4 h-4 ${isActive ? 'text-[#00a859]' : ''}`} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </nav>

                        <div className="p-3 border-t border-gray-200/50 dark:border-gray-700/30">
                            <div className="text-xs text-gray-400 dark:text-gray-500 text-center">JudicialGPT v2.0</div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 flex flex-col bg-white dark:bg-[#2f2f2f]">
                        <div className="px-6 pt-6 pb-4">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{activeTab}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                {activeTab === 'General' && 'Customize your experience'}
                                {activeTab === 'Notifications' && 'Manage your notifications'}
                                {activeTab === 'Personalization' && 'Add custom instructions for AI'}
                                {activeTab === 'Data controls' && 'Manage your data and privacy'}
                                {activeTab === 'Security' && 'Keep your account secure'}
                                {activeTab === 'Account' && 'Manage your profile'}
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 pb-6">
                            {renderContent()}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
