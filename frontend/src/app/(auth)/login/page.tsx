'use client';

import React, { useState, useMemo, useCallback, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Turnstile } from '@marsidev/react-turnstile';
import { Eye, EyeOff, FileText, X, AlertTriangle, CheckCircle, XCircle, ShieldCheck, Scale, Lock, ChevronRight, Sparkles } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

// Animated Video Background Component
const AnimatedVideoBackground = () => {
    return (
        <div className="absolute inset-0 overflow-hidden">
            {/* Video Background */}
            <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                    filter: 'brightness(0.9) contrast(1.1)',
                }}
            >
                <source src="/login_page_animatios.mp4" type="video/mp4" />
            </video>

            {/* Primary Gradient Overlay - Black/Green Theme */}
            <div
                className="absolute inset-0"
                style={{
                    background: `linear-gradient(
                        135deg,
                        rgba(0, 0, 0, 0.75) 0%,
                        rgba(0, 0, 0, 0.5) 25%,
                        rgba(4, 120, 87, 0.35) 50%,
                        rgba(0, 0, 0, 0.5) 75%,
                        rgba(0, 0, 0, 0.75) 100%
                    )`,
                }}
            />

            {/* Secondary Subtle Green Glow */}
            <div
                className="absolute inset-0 opacity-40"
                style={{
                    background: `radial-gradient(
                        ellipse at 70% 50%,
                        rgba(16, 185, 129, 0.25) 0%,
                        rgba(5, 150, 105, 0.15) 35%,
                        transparent 70%
                    )`,
                }}
            />

            {/* Bottom Dark Fade for Readability */}
            <div
                className="absolute inset-0"
                style={{
                    background: `linear-gradient(
                        to top,
                        rgba(0, 0, 0, 0.6) 0%,
                        transparent 30%,
                        transparent 70%,
                        rgba(0, 0, 0, 0.4) 100%
                    )`,
                }}
            />

            {/* Subtle Animated Grid Pattern Overlay */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: '50px 50px',
                }}
            />

            {/* Floating Particles Effect */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full animate-float"
                        style={{
                            width: `${Math.random() * 4 + 2}px`,
                            height: `${Math.random() * 4 + 2}px`,
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            background: `rgba(16, 185, 129, ${Math.random() * 0.3 + 0.1})`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${Math.random() * 10 + 10}s`,
                        }}
                    />
                ))}
            </div>

            {/* Animated Gradient Border Glow on Edges */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    boxShadow: 'inset 0 0 100px rgba(16, 185, 129, 0.1)',
                }}
            />

            <style>{`
                @keyframes float {
                    0%, 100% {
                        transform: translateY(0) translateX(0) scale(1);
                        opacity: 0.5;
                    }
                    25% {
                        transform: translateY(-30px) translateX(10px) scale(1.1);
                        opacity: 0.8;
                    }
                    50% {
                        transform: translateY(-20px) translateX(-15px) scale(0.9);
                        opacity: 0.6;
                    }
                    75% {
                        transform: translateY(-40px) translateX(5px) scale(1.05);
                        opacity: 0.7;
                    }
                }
                
                .animate-float {
                    animation: float 15s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

const NEGATIVE_KEYWORDS = [
    'password', 'admin', 'user', 'login', 'root', 'test', 'demo',
    '123456', '12345678', 'qwerty', 'abc123', 'letmein', 'welcome',
    'monkey', 'dragon', 'master', 'sunshine', 'princess', 'iloveyou'
];

function evaluatePassword(pw: string, email: string) {
    const pwLower = pw.toLowerCase();
    const hasNegativeKeyword = NEGATIVE_KEYWORDS.some(keyword => pwLower.includes(keyword));

    const rules = {
        length: pw.length >= 8,
        lower: /[a-z]/.test(pw),
        upper: /[A-Z]/.test(pw),
        number: /\d/.test(pw),
        special: /[^A-Za-z0-9]/.test(pw),
        nospace: !/\s/.test(pw),
        notEmailPart: email
            ? !pw.toLowerCase().includes((email.split("@")[0] || "").toLowerCase())
            : true,
        noCommonWords: !hasNegativeKeyword,
    };

    const passed = Object.values(rules).filter(Boolean).length;

    let strength = "weak";
    if (passed >= 6 && rules.length) strength = "medium";
    if (passed >= 8) strength = "strong";

    return { strength, rules, hasNegativeKeyword };
}

function LoginContent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { signIn, user } = useAuth();

    const [isLogin, setIsLogin] = useState(!pathname?.includes('signup'));
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [countryCode, setCountryCode] = useState('+92');
    const [passwordTouched, setPasswordTouched] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showAgreement, setShowAgreement] = useState(false);
    const [agreementAccepted, setAgreementAccepted] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [legalModalOpen, setLegalModalOpen] = useState(false);
    const [legalActiveTab, setLegalActiveTab] = useState<'privacy' | 'terms'>('privacy');

    const openLegalModal = (tab: 'privacy' | 'terms' = 'privacy') => {
        setLegalActiveTab(tab);
        setLegalModalOpen(true);
    };

    const passwordEval = useMemo(() => evaluatePassword(password, email), [password, email]);
    const { strength, rules, hasNegativeKeyword } = passwordEval;

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            router.push('/chat');
        }
    }, [user, router]);

    // Check for redirect messages
    useEffect(() => {
        const message = searchParams.get('message');
        if (message === 'verified') {
            setSuccess('Email verified successfully! You can now log in.');
        }
        if (searchParams.get('error') === 'account_deleted') {
            setError('This account has been deleted. To recover it, email the administrator.');
        }
    }, [searchParams]);

    // Google Sign In
    const handleGoogleSignIn = async () => {
        setIsGoogleLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        window.location.href = `${apiUrl}/api/auth/google`;
    };

    // Login
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!captchaToken && process.env.NODE_ENV !== 'development') {
            setError('Please complete the security check.');
            return;
        }

        setIsLoading(true);

        try {
            await signIn(email.trim().toLowerCase(), password, captchaToken || undefined);
            router.push('/chat');
        } catch (err: any) {
            setError(err.message || 'Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Show agreement dialog
    const handleSignupClick = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (strength !== "strong") {
            setPasswordTouched(true);
            setError("Password is weak. Please meet all requirements.");
            return;
        }

        if (hasNegativeKeyword) {
            setPasswordTouched(true);
            setError("Password contains common words. Please choose a more secure password.");
            return;
        }

        setShowAgreement(true);
    };

    // Signup after agreement
    const handleSignup = async () => {
        setShowAgreement(false);

        if (!captchaToken && process.env.NODE_ENV !== 'development') {
            setError('Please complete the security check.');
            return;
        }

        setIsLoading(true);

        if (!firstName.trim() || !lastName.trim()) {
            setError("Please enter your full name.");
            setIsLoading(false);
            return;
        }

        const fullName = `${firstName.trim()} ${lastName.trim()}`;

        try {
            await api.register(email.trim(), password, {
                name: fullName,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                phoneNumber: `${countryCode}${phoneNumber.trim()}`,
                countryCode: countryCode,
                captchaToken: captchaToken || undefined
            });
            setSuccess('Account created! Please check your email to verify your account.');
            setIsLogin(true);
        } catch (err: any) {
            setError(err.message || 'Signup failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const Rule = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => (
        <li className={`text-sm flex items-center gap-2 ${ok ? "text-gray-700" : "text-gray-400"}`}>
            {ok ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-gray-300" />}
            <span>{children}</span>
        </li>
    );

    return (
        <div className="min-h-screen w-full bg-black relative overflow-hidden">
            {/* Animated Video Background */}
            <AnimatedVideoBackground />

            {/* Auth Card Container */}
            <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-4">
                <AnimatePresence mode="wait">
                    {isLogin ? (
                        // ================== LOGIN CARD ==================
                        <motion.div
                            key="login"
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className="w-full max-w-sm bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-white/20"
                            style={{
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(16, 185, 129, 0.1)',
                            }}
                        >
                            {/* Title */}
                            <h1 className="text-xl font-bold text-center text-gray-900 mb-0.5">
                                Sign in to JudicialGPT
                            </h1>
                            <p className="text-xs text-gray-500 text-center mb-5">
                                Welcome back! Please sign in to continue
                            </p>

                            {/* Error/Success Messages */}
                            {error && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                                    {error}
                                </div>
                            )}
                            {success && (
                                <div className="mb-4 p-3 bg-[#00a859]/10 border border-[#00a859]/25 rounded-lg text-[#00a859] text-sm">
                                    {success}
                                </div>
                            )}

                            {/* Google Sign In */}
                            <button
                                type="button"
                                onClick={handleGoogleSignIn}
                                disabled={isGoogleLoading}
                                className="w-full py-2.5 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium transition-all hover:bg-gray-50 flex items-center justify-center gap-3 mb-4 text-sm"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                {isGoogleLoading ? 'Connecting...' : 'Continue with Google'}
                            </button>

                            {/* Divider */}
                            <div className="flex items-center gap-4 mb-4">
                                <div className="flex-1 h-px bg-gray-200"></div>
                                <span className="text-xs text-gray-400">or</span>
                                <div className="flex-1 h-px bg-gray-200"></div>
                            </div>

                            {/* Login Form */}
                            <form onSubmit={handleLogin} className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Email address or username
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400 text-sm"
                                        placeholder="Enter email or username"
                                        autoComplete="username"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400 text-sm"
                                            placeholder="Enter your password"
                                            autoComplete="current-password"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
                                    <div className="flex justify-center my-4">
                                        <Turnstile 
                                            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} 
                                            onSuccess={(token) => setCaptchaToken(token)}
                                            options={{ theme: 'light' }}
                                        />
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-sm bg-[#00a859] text-white border border-[#00a859] hover:bg-[#00a859] hover:border-[#00a859] disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? 'Signing in...' : 'Continue'}
                                    <span>→</span>
                                </button>
                            </form>

                            {/* Switch to Sign Up */}
                            <p className="text-xs text-center mt-4 text-gray-600">
                                Don&apos;t have an account?{" "}
                                <button
                                    onClick={() => { setIsLogin(false); setError(''); setSuccess(''); setCaptchaToken(null); }}
                                    className="text-[#00a859] hover:text-[#00a859] font-semibold hover:underline cursor-pointer"
                                >
                                    Sign up
                                </button>
                            </p>

                            {/* Privacy Policy | Terms & Conditions Links */}
                            <div className="mt-3.5 pt-3 border-t border-gray-100 flex items-center justify-center gap-2.5 text-xs text-gray-500">
                                <Link
                                    href="/privacy"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-[#00a859] hover:underline transition-colors cursor-pointer font-medium tracking-tight"
                                >
                                    Privacy Policy
                                </Link>
                                <span className="text-gray-300 font-light select-none">|</span>
                                <Link
                                    href="/terms"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-[#00a859] hover:underline transition-colors cursor-pointer font-medium tracking-tight"
                                >
                                    Terms & Conditions
                                </Link>
                            </div>
                        </motion.div>
                    ) : (
                        // ================== SIGNUP CARD ==================
                        <motion.div
                            key="signup"
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className="w-full max-w-sm bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-5 border border-white/20 max-h-[95vh] overflow-y-auto"
                            style={{
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(16, 185, 129, 0.1)',
                            }}
                        >
                            {/* Title */}
                            <h1 className="text-xl font-bold text-center text-gray-900 mb-0.5">
                                Create your account
                            </h1>
                            <p className="text-xs text-gray-500 text-center mb-4">
                                Welcome! Please fill in the details to get started.
                            </p>

                            {/* Error/Success Messages */}
                            {error && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Google Sign In */}
                            <button
                                type="button"
                                onClick={handleGoogleSignIn}
                                disabled={isGoogleLoading}
                                className="w-full py-2 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium transition-all hover:bg-gray-50 flex items-center justify-center gap-2 mb-3 text-sm"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                {isGoogleLoading ? 'Connecting...' : 'Continue with Google'}
                            </button>

                            {/* Divider */}
                            <div className="flex items-center gap-4 mb-3">
                                <div className="flex-1 h-px bg-gray-200"></div>
                                <span className="text-xs text-gray-400">or</span>
                                <div className="flex-1 h-px bg-gray-200"></div>
                            </div>

                            {/* Signup Form */}
                            <form onSubmit={handleSignupClick} className="space-y-2.5">
                                {/* Name Fields */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">First name</label>
                                        <input
                                            type="text"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-gray-900 placeholder-gray-400 text-sm"
                                            placeholder="First name"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Last name</label>
                                        <input
                                            type="text"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-gray-900 placeholder-gray-400 text-sm"
                                            placeholder="Last name"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Email address
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-gray-900 placeholder-gray-400 text-sm"
                                        placeholder="Enter your email address"
                                        required
                                    />
                                </div>

                                {/* Phone */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Phone number</label>
                                    <div className="flex gap-2">
                                        <div className="flex items-center gap-1 px-2 py-2 border border-gray-300 rounded-lg bg-gray-50 min-w-[80px]">
                                            <span className="text-sm">🇵🇰</span>
                                            <select
                                                value={countryCode}
                                                onChange={(e) => setCountryCode(e.target.value)}
                                                className="bg-transparent text-xs text-gray-700 outline-none cursor-pointer"
                                            >
                                                <option value="+92">+92</option>
                                                <option value="+1">+1</option>
                                                <option value="+44">+44</option>
                                                <option value="+91">+91</option>
                                                <option value="+971">+971</option>
                                            </select>
                                        </div>
                                        <input
                                            type="tel"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-gray-900 placeholder-gray-400 text-sm"
                                            placeholder="Enter your phone number"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            onBlur={() => setPasswordTouched(true)}
                                            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none text-gray-900 placeholder-gray-400 text-sm"
                                            placeholder="Enter your password"
                                            autoComplete="new-password"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Password Strength */}
                                {password && (
                                    <div className="bg-gray-50 rounded-lg p-2">
                                        <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden mb-1">
                                            <div
                                                className={`h-full rounded-full transition-all duration-300 ${strength === "strong" ? "bg-green-500 w-full" :
                                                    strength === "medium" ? "bg-yellow-500 w-2/3" :
                                                        "bg-red-400 w-1/3"
                                                    }`}
                                            />
                                        </div>
                                        <p className={`text-xs ${strength === "strong" ? "text-green-600" :
                                            strength === "medium" ? "text-yellow-600" :
                                                "text-red-500"
                                            }`}>
                                            {strength.charAt(0).toUpperCase() + strength.slice(1)} password
                                        </p>
                                    </div>
                                )}

                                {/* Password Requirements */}
                                {passwordTouched && strength !== "strong" && (
                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                        <p className="text-xs text-gray-600 font-medium mb-2">Password requirements:</p>
                                        <ul className="space-y-1 text-xs">
                                            <Rule ok={rules.length}>At least 8 characters</Rule>
                                            <Rule ok={rules.lower}>One lowercase letter</Rule>
                                            <Rule ok={rules.upper}>One uppercase letter</Rule>
                                            <Rule ok={rules.number}>One number</Rule>
                                            <Rule ok={rules.special}>One special character</Rule>
                                        </ul>
                                    </div>
                                )}

                                {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
                                    <div className="flex justify-center my-4">
                                        <Turnstile 
                                            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} 
                                            onSuccess={(token) => setCaptchaToken(token)}
                                            options={{ theme: 'light' }}
                                        />
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={strength !== "strong" || isLoading}
                                    className="w-full py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-sm bg-[#00a859] text-white border border-[#00a859] hover:bg-[#00a859] hover:border-[#00a859] disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? 'Creating account...' : 'Continue'}
                                    <span>→</span>
                                </button>
                            </form>

                            {/* Switch to Login */}
                            <p className="text-xs text-center mt-3 text-gray-600">
                                Already have an account?{" "}
                                <button
                                    onClick={() => { setIsLogin(true); setError(''); setCaptchaToken(null); }}
                                    className="text-[#00a859] hover:text-[#00a859] font-semibold hover:underline cursor-pointer"
                                >
                                    Sign in
                                </button>
                            </p>

                            {/* Privacy Policy | Terms & Conditions Links */}
                            <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-center gap-2.5 text-xs text-gray-500">
                                <Link
                                    href="/privacy"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-[#00a859] hover:underline transition-colors cursor-pointer font-medium tracking-tight"
                                >
                                    Privacy Policy
                                </Link>
                                <span className="text-gray-300 font-light select-none">|</span>
                                <Link
                                    href="/terms"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-[#00a859] hover:underline transition-colors cursor-pointer font-medium tracking-tight"
                                >
                                    Terms & Conditions
                                </Link>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* User Agreement Modal */}
            <AnimatePresence>
                {showAgreement && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowAgreement(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gray-900 flex items-center justify-center">
                                        <FileText className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">User Agreement</h3>
                                        <p className="text-sm text-gray-500">Please read and accept to continue</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowAgreement(false)}
                                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <X className="h-5 w-5 text-gray-500" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 overflow-y-auto max-h-[50vh]">
                                <div className="space-y-4 text-gray-700">
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                                        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm text-amber-800">
                                            By creating an account, you agree to comply with our terms of service and privacy policy.
                                        </p>
                                    </div>

                                    <div>
                                        <h4 className="font-semibold mb-2 text-gray-900">1. Acceptance of Terms</h4>
                                        <p className="text-sm leading-relaxed">
                                            By accessing and using this service, you accept and agree to be bound by the terms and provisions of this agreement.
                                        </p>
                                    </div>

                                    <div>
                                        <h4 className="font-semibold mb-2 text-gray-900">2. User Account</h4>
                                        <p className="text-sm leading-relaxed">
                                            You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.
                                        </p>
                                    </div>

                                    <div>
                                        <h4 className="font-semibold mb-2 text-gray-900">3. Privacy Policy</h4>
                                        <p className="text-sm leading-relaxed">
                                            We respect your privacy and are committed to protecting your personal data according to our privacy policy.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-gray-200 bg-gray-50">
                                <div className="flex items-start gap-3 mb-4">
                                    <input
                                        type="checkbox"
                                        id="accept-terms"
                                        checked={agreementAccepted}
                                        onChange={(e) => setAgreementAccepted(e.target.checked)}
                                        className="mt-1 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                                    />
                                    <label htmlFor="accept-terms" className="text-sm text-gray-700 cursor-pointer">
                                        I have read and agree to the terms of service and privacy policy
                                    </label>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setShowAgreement(false);
                                            setAgreementAccepted(false);
                                        }}
                                        className="flex-1 px-4 py-3 rounded-lg font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSignup}
                                        disabled={!agreementAccepted}
                                        className="flex-1 px-4 py-3 rounded-lg font-medium bg-gray-900 text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Accept & Continue
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Interactive Privacy & Terms Modal */}
            <AnimatePresence>
                {legalModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md"
                        onClick={() => setLegalModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.94, opacity: 0, y: 15 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.94, opacity: 0, y: 15 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-emerald-500/20"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="relative bg-gradient-to-r from-gray-950 via-gray-900 to-emerald-950 text-white p-5 sm:p-6 border-b border-emerald-500/20 overflow-hidden">
                                <div className="absolute -right-8 -top-8 w-36 h-36 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
                                
                                <div className="flex items-start justify-between relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-inner">
                                            {legalActiveTab === 'privacy' ? (
                                                <ShieldCheck className="h-5 w-5" />
                                            ) : (
                                                <Scale className="h-5 w-5" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                                                    JudicialGPT Legal &amp; Privacy
                                                </h3>
                                                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                    <Sparkles className="w-2.5 h-2.5" /> Verified
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-300 mt-0.5">
                                                Data protection &amp; operational governance for judicial professionals
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setLegalModalOpen(false)}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                        aria-label="Close"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                {/* Key Highlights Bar */}
                                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/10">
                                    <div className="bg-white/5 rounded-lg p-2 border border-white/5 flex items-center gap-2">
                                        <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                        <div className="truncate">
                                            <p className="text-[10px] text-gray-400">Security</p>
                                            <p className="text-xs font-semibold text-white truncate">256-Bit TLS</p>
                                        </div>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-2 border border-white/5 flex items-center gap-2">
                                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                        <div className="truncate">
                                            <p className="text-[10px] text-gray-400">Confidentiality</p>
                                            <p className="text-xs font-semibold text-white truncate">Zero AI Training</p>
                                        </div>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-2 border border-white/5 flex items-center gap-2">
                                        <Scale className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                        <div className="truncate">
                                            <p className="text-[10px] text-gray-400">Jurisdiction</p>
                                            <p className="text-xs font-semibold text-white truncate">Lawful Research</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tab Switcher */}
                            <div className="flex border-b border-gray-200 bg-gray-50/80 px-5 pt-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setLegalActiveTab('privacy')}
                                    className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold transition-all relative flex items-center gap-1.5 cursor-pointer ${
                                        legalActiveTab === 'privacy'
                                            ? 'text-[#00a859]'
                                            : 'text-gray-500 hover:text-gray-800'
                                    }`}
                                >
                                    <ShieldCheck className="w-4 h-4" />
                                    <span>Privacy Policy</span>
                                    {legalActiveTab === 'privacy' && (
                                        <motion.div
                                            layoutId="legalTabUnderline"
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00a859] rounded-full"
                                        />
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLegalActiveTab('terms')}
                                    className={`pb-2.5 px-3 text-xs sm:text-sm font-semibold transition-all relative flex items-center gap-1.5 cursor-pointer ${
                                        legalActiveTab === 'terms'
                                            ? 'text-[#00a859]'
                                            : 'text-gray-500 hover:text-gray-800'
                                    }`}
                                >
                                    <Scale className="w-4 h-4" />
                                    <span>Terms of Service</span>
                                    {legalActiveTab === 'terms' && (
                                        <motion.div
                                            layoutId="legalTabUnderline"
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00a859] rounded-full"
                                        />
                                    )}
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-5 sm:p-6 overflow-y-auto max-h-[50vh] text-gray-700 space-y-4 text-xs sm:text-sm leading-relaxed">
                                {legalActiveTab === 'privacy' ? (
                                    <div className="space-y-4">
                                        <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-start gap-3">
                                            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                            <div>
                                                <h4 className="font-semibold text-emerald-900 text-xs sm:text-sm">
                                                    Strict Legal Privilege &amp; Non-Disclosure
                                                </h4>
                                                <p className="text-emerald-800/90 text-xs mt-0.5">
                                                    All drafted judgments, case references, advocate notes, and client briefs entered into JudicialGPT are treated as strictly confidential professional work product.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="border border-gray-100 rounded-xl p-3.5 bg-gray-50/50">
                                            <h4 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-[#00a859] text-xs font-bold">1</span>
                                                Zero LLM Training Retention
                                            </h4>
                                            <p className="text-gray-600 text-xs sm:text-sm">
                                                Your case facts, judgments, and legal queries are processed ephemerally. None of your confidential data is ever used to train, fine-tune, or calibrate public AI models or shared with outside model vendors.
                                            </p>
                                        </div>

                                        <div className="border border-gray-100 rounded-xl p-3.5 bg-gray-50/50">
                                            <h4 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-[#00a859] text-xs font-bold">2</span>
                                                Enterprise Infrastructure &amp; Vault Encryption
                                            </h4>
                                            <p className="text-gray-600 text-xs sm:text-sm">
                                                Session tokens, API communications, and database connections are guarded through automated HashiCorp Vault key storage. Passwords are salted and hashed using multi-round bcrypt.
                                            </p>
                                        </div>

                                        <div className="border border-gray-100 rounded-xl p-3.5 bg-gray-50/50">
                                            <h4 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-[#00a859] text-xs font-bold">3</span>
                                                Authentication &amp; Cookies
                                            </h4>
                                            <p className="text-gray-600 text-xs sm:text-sm">
                                                We only employ strictly necessary, HTTP-only, SameSite cookies for authentication security, CSRF protection, and rate limiting. No commercial marketing or third-party tracking cookies are deployed.
                                            </p>
                                        </div>

                                        <div className="border border-gray-100 rounded-xl p-3.5 bg-gray-50/50">
                                            <h4 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-[#00a859] text-xs font-bold">4</span>
                                                Data Ownership &amp; Immediate Erasure
                                            </h4>
                                            <p className="text-gray-600 text-xs sm:text-sm">
                                                You maintain total control of your workspace. You can purge conversation logs or terminate your account at any time, which irrevocably removes all associated records from our servers.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-3">
                                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                            <div>
                                                <h4 className="font-semibold text-amber-900 text-xs sm:text-sm">
                                                    AI Advisory Scope &amp; Verification Disclaimer
                                                </h4>
                                                <p className="text-amber-800/90 text-xs mt-0.5">
                                                    JudicialGPT is an AI-assisted legal research and drafting system. Outputs provide guidance and accelerate research but do not constitute formal legal counsel or replace judicial discretion.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="border border-gray-100 rounded-xl p-3.5 bg-gray-50/50">
                                            <h4 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-[#00a859] text-xs font-bold">1</span>
                                                Permitted Use in Legal Research
                                            </h4>
                                            <p className="text-gray-600 text-xs sm:text-sm">
                                                JudicialGPT is authorized for advocates, judges, legal scholars, and students for case analysis, civil/criminal drafting, and statute research in accordance with law and court procedure.
                                            </p>
                                        </div>

                                        <div className="border border-gray-100 rounded-xl p-3.5 bg-gray-50/50">
                                            <h4 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-[#00a859] text-xs font-bold">2</span>
                                                100% Intellectual Property Ownership
                                            </h4>
                                            <p className="text-gray-600 text-xs sm:text-sm">
                                                All documents, written judgments, civil decrees, summaries, and legal texts generated using JudicialGPT are owned exclusively by you. JudicialGPT claims zero copyright or rights to your work product.
                                            </p>
                                        </div>

                                        <div className="border border-gray-100 rounded-xl p-3.5 bg-gray-50/50">
                                            <h4 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-[#00a859] text-xs font-bold">3</span>
                                                Account Security &amp; Fair Use
                                            </h4>
                                            <p className="text-gray-600 text-xs sm:text-sm">
                                                You agree to keep credentials secure and prevent unauthorized access. Automated scrapers, denial-of-service abuse, or malicious prompt injection are strictly prohibited and subject to account suspension.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 sm:p-5 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
                                <div className="text-xs text-gray-500 hidden sm:block">
                                    {legalActiveTab === 'privacy' ? (
                                        <span>Looking for Terms?{' '}
                                            <button
                                                type="button"
                                                onClick={() => setLegalActiveTab('terms')}
                                                className="text-[#00a859] font-medium hover:underline cursor-pointer"
                                            >
                                                Switch to Terms of Service
                                            </button>
                                        </span>
                                    ) : (
                                        <span>Looking for Privacy?{' '}
                                            <button
                                                type="button"
                                                onClick={() => setLegalActiveTab('privacy')}
                                                className="text-[#00a859] font-medium hover:underline cursor-pointer"
                                            >
                                                Switch to Privacy Policy
                                            </button>
                                        </span>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setLegalModalOpen(false)}
                                    className="w-full sm:w-auto px-5 py-2 rounded-lg font-semibold text-xs sm:text-sm bg-[#00a859] text-white hover:bg-[#00924d] transition-colors cursor-pointer shadow-xs"
                                >
                                    Understood &amp; Close
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen w-full bg-black" />}>
            <LoginContent />
        </Suspense>
    );
}
