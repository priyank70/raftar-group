'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail, Zap, TrendingUp, Shield, Users, ArrowRight, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

/* ─── static data ─── */
const features = [
  { icon: TrendingUp, title: 'Smart Analytics', desc: 'Real-time financial insights & dashboards' },
  { icon: Shield, title: 'Secure & Trusted', desc: 'Bank-grade encryption for every transaction' },
  { icon: Users, title: 'Member Management', desc: 'Complete group control at your fingertips' },
  { icon: Zap, title: 'Instant Updates', desc: 'Live notifications & activity feeds' },
];

const stats = [
  { value: '100%', label: 'Transparent' },
  { value: 'Live', label: 'Updates' },
  { value: '24/7', label: 'Access' },
];

/* ─── Floating orb configuration ─── */
const orbs = [
  { size: 340, x: '12%', y: '18%', color: 'rgba(20,184,166,0.18)', dur: 18 },
  { size: 260, x: '78%', y: '72%', color: 'rgba(45,212,191,0.14)', dur: 22 },
  { size: 180, x: '65%', y: '15%', color: 'rgba(13,148,136,0.12)', dur: 15 },
  { size: 120, x: '25%', y: '80%', color: 'rgba(20,184,166,0.10)', dur: 20 },
];

/* ─── animation presets ─── */
const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } } },
  item: { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' as const } } },
};

const fadeSlide = (delay = 0) => ({
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.65, delay, ease: 'easeOut' as const },
});

/* ─────────────────────────────────────────────
   Floating Orb Component
   ───────────────────────────────────────────── */
function FloatingOrb({ size, x, y, color, dur }: { size: number; x: string; y: string; color: string; dur: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        left: x,
        top: y,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        willChange: 'transform',
        filter: 'blur(1px)',
      }}
      animate={{
        x: [0, 30, -20, 15, 0],
        y: [0, -25, 15, -10, 0],
        scale: [1, 1.08, 0.95, 1.04, 1],
      }}
      transition={{
        duration: dur,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

/* ─────────────────────────────────────────────
   Logo Component with pulse glow
   ───────────────────────────────────────────── */
function LogoMark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'w-14 h-14' : size === 'md' ? 'w-12 h-12' : 'w-10 h-10';
  const text = size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-2xl' : 'text-lg';
  return (
    <div className="relative">
      {/* Pulse ring */}
      <motion.div
        className={`absolute inset-0 ${dim} rounded-2xl`}
        style={{ background: 'linear-gradient(135deg, #14B8A6, #2DD4BF)' }}
        animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div
        className={`${dim} rounded-2xl flex items-center justify-center relative z-10`}
        style={{ background: 'linear-gradient(135deg, #14B8A6, #2DD4BF)', boxShadow: '0 0 24px rgba(20,184,166,0.45)' }}
      >
        <span className={`text-white font-bold ${text}`}>R</span>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════
   LOGIN PAGE
   ═════════════════════════════════════════════ */
export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter your email and password');
      return;
    }
    try {
      await login(email, password);
      toast.success('Welcome back! 🎉');
      router.replace('/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Invalid credentials. Please try again.';
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <>
      {/* Inline keyframes for shimmer, float, orb-drift — works everywhere */}
      <style jsx global>{`
        @keyframes login-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes login-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-12px) rotate(1deg); }
          66% { transform: translateY(6px) rotate(-1deg); }
        }
        @keyframes login-pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(20,184,166,0.3); }
          50% { box-shadow: 0 0 40px rgba(20,184,166,0.55); }
        }
        .shimmer-btn {
          position: relative;
          overflow: hidden;
        }
        .shimmer-btn::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(
            105deg,
            transparent 40%,
            rgba(255,255,255,0.18) 45%,
            rgba(255,255,255,0.25) 50%,
            rgba(255,255,255,0.18) 55%,
            transparent 60%
          );
          background-size: 200% 100%;
          animation: login-shimmer 3s ease-in-out infinite;
          pointer-events: none;
          border-radius: inherit;
        }
        .shimmer-btn:disabled::after {
          animation: none;
          opacity: 0;
        }
        /* Dark-themed input overrides for mobile */
        .login-dark-input {
          background: rgba(255,255,255,0.06) !important;
          border: 1px solid rgba(255,255,255,0.12) !important;
          color: #f1f5f9 !important;
          -webkit-appearance: none;
          appearance: none;
        }
        .login-dark-input::placeholder {
          color: rgba(148,163,184,0.6) !important;
        }
        .login-dark-input:focus {
          border-color: #14B8A6 !important;
          box-shadow: 0 0 0 3px rgba(20,184,166,0.2), 0 0 20px rgba(20,184,166,0.1) !important;
          background: rgba(255,255,255,0.08) !important;
        }
        /* Desktop light input glow */
        .login-light-input:focus {
          border-color: #14B8A6 !important;
          box-shadow: 0 0 0 3px rgba(20,184,166,0.15), 0 0 16px rgba(20,184,166,0.08) !important;
        }
      `}</style>

      <div className="min-h-screen flex flex-col lg:flex-row">
        {/* ══════════════════════════════════════
           LEFT PANEL — Desktop branding
           ══════════════════════════════════════ */}
        <motion.div
          className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col justify-between p-12 xl:p-16"
          style={{ background: 'linear-gradient(160deg, #0F172A 0%, #0a1628 40%, #0c2420 100%)' }}
          initial={{ opacity: 0, x: -60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* Grid overlay */}
          <div className="absolute inset-0 bg-grid opacity-20" />

          {/* Floating orbs — desktop */}
          {orbs.map((o, i) => (
            <FloatingOrb key={i} {...o} />
          ))}

          {/* Decorative accent line at top */}
          <div
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, transparent, #14B8A6, #2DD4BF, transparent)' }}
          />

          {/* Logo */}
          <motion.div {...fadeSlide(0.1)} className="relative z-10">
            <div className="flex items-center gap-4">
              <LogoMark size="md" />
              <div>
                <h1 className="text-white font-bold text-xl tracking-tight">Raftar Group</h1>
                <p className="text-sm font-medium" style={{ color: '#2DD4BF' }}>Digital Mandal System</p>
              </div>
            </div>
          </motion.div>

          {/* Hero content */}
          <div className="relative z-10 space-y-10">
            <motion.div {...fadeSlide(0.3)}>
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-6"
                style={{ background: 'rgba(20,184,166,0.12)', border: '1px solid rgba(20,184,166,0.2)' }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <Sparkles className="w-3.5 h-3.5" style={{ color: '#2DD4BF' }} />
                <span className="text-xs font-semibold" style={{ color: '#2DD4BF' }}>Premium Platform</span>
              </motion.div>
              <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
                Manage Your
                <br />
                Mandal{' '}
                <span className="text-gradient">Smartly</span>
              </h2>
              <p className="mt-5 text-lg leading-relaxed" style={{ color: '#94A3B8' }}>
                Transform your traditional committee into a premium digital experience.
                Track installments, manage investments, and stay connected in real-time.
              </p>
            </motion.div>

            {/* Feature cards */}
            <motion.div
              className="grid grid-cols-2 gap-3"
              variants={stagger.container}
              initial="hidden"
              animate="visible"
            >
              {features.map((feature) => (
                <motion.div
                  key={feature.title}
                  variants={stagger.item}
                  className="group rounded-2xl p-4 transition-all duration-300 cursor-default"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    WebkitBackdropFilter: 'blur(8px)',
                    backdropFilter: 'blur(8px)',
                  }}
                  whileHover={{
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    borderColor: 'rgba(20,184,166,0.25)',
                    y: -2,
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: 'rgba(20,184,166,0.15)' }}
                  >
                    <feature.icon className="w-4 h-4" style={{ color: '#2DD4BF' }} />
                  </div>
                  <p className="text-white font-semibold text-sm">{feature.title}</p>
                  <p className="text-xs mt-1" style={{ color: '#64748B' }}>{feature.desc}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* Stats */}
            <motion.div
              className="flex items-center gap-10 pt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.6 }}
            >
              {stats.map((stat, i) => (
                <div key={stat.label}>
                  <p className="text-2xl font-bold" style={{ color: '#2DD4BF' }}>{stat.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Bottom */}
          <motion.p
            className="relative z-10 text-xs"
            style={{ color: '#334155' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            © 2026 Raftar Group. Internal use only.
          </motion.p>
        </motion.div>

        {/* ══════════════════════════════════════
           RIGHT PANEL — Desktop form (light)
           ══════════════════════════════════════ */}
        <motion.div
          className="hidden lg:flex flex-1 items-center justify-center p-8 xl:p-16 relative"
          style={{ background: '#F8FAFC' }}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* Subtle radial glow */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.04) 0%, transparent 70%)' }}
          />

          <div className="w-full max-w-md relative z-10">
            {/* Form header */}
            <motion.div className="mb-10" {...fadeSlide(0.3)}>
              <h2 className="text-3xl font-bold" style={{ color: '#0F172A' }}>Welcome back</h2>
              <p className="mt-2" style={{ color: '#64748B' }}>Sign in to your account to continue</p>
            </motion.div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="mb-5 overflow-hidden"
                >
                  <div
                    className="p-4 rounded-xl"
                    style={{
                      background: 'rgba(239,68,68,0.06)',
                      border: '1px solid rgba(239,68,68,0.15)',
                    }}
                  >
                    <p className="text-sm font-medium" style={{ color: '#EF4444' }}>{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <motion.form
              onSubmit={handleSubmit}
              className="space-y-5"
              suppressHydrationWarning
              variants={stagger.container}
              initial="hidden"
              animate="visible"
            >
              {/* Email */}
              <motion.div variants={stagger.item}>
                <label htmlFor="email-desktop" className="label">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94A3B8' }} />
                  <input
                    id="email-desktop"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input login-light-input"
                    style={{ paddingLeft: '2.75rem' }}
                    placeholder="you@raftar.com"
                    autoComplete="email"
                    required
                    suppressHydrationWarning
                  />
                </div>
              </motion.div>

              {/* Password */}
              <motion.div variants={stagger.item}>
                <label htmlFor="password-desktop" className="label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94A3B8' }} />
                  <input
                    id="password-desktop"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input login-light-input"
                    style={{ paddingLeft: '2.75rem', paddingRight: '2.75rem' }}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    suppressHydrationWarning
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: '#94A3B8' }}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </motion.div>

              {/* Submit */}
              <motion.div variants={stagger.item} className="pt-2">
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  className="shimmer-btn w-full flex items-center justify-center gap-2 text-white font-semibold rounded-xl"
                  style={{
                    padding: '0.875rem 1.5rem',
                    fontSize: '0.9375rem',
                    background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
                    border: 'none',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.6 : 1,
                    boxShadow: '0 4px 20px rgba(20,184,166,0.35)',
                    transition: 'all 0.25s ease',
                  }}
                  whileTap={!isLoading ? { scale: 0.97 } : {}}
                  whileHover={!isLoading ? { boxShadow: '0 6px 30px rgba(20,184,166,0.5)', y: -1 } : {}}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full animate-spin"
                        style={{ border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#ffffff' }}
                      />
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </motion.div>
            </motion.form>

            <motion.p
              className="mt-8 text-center text-xs"
              style={{ color: '#94A3B8' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              Internal use only. Contact admin if you need access.
            </motion.p>
          </div>
        </motion.div>

        {/* ══════════════════════════════════════
           MOBILE — Full-screen immersive login
           ══════════════════════════════════════ */}
        <div
          className="lg:hidden flex-1 relative overflow-hidden flex flex-col"
          style={{
            minHeight: '100vh',
            minHeight: '100dvh',
            background: 'linear-gradient(170deg, #0F172A 0%, #0a1628 35%, #091f1c 65%, #0c2420 100%)',
          }}
        >
          {/* Background grid */}
          <div className="absolute inset-0 bg-grid opacity-15" />

          {/* Floating orbs — mobile (smaller) */}
          {orbs.map((o, i) => (
            <FloatingOrb
              key={`m-${i}`}
              size={o.size * 0.6}
              x={o.x}
              y={o.y}
              color={o.color}
              dur={o.dur}
            />
          ))}

          {/* Decorative top accent */}
          <div
            className="absolute top-0 left-0 right-0 h-[2px] z-20"
            style={{ background: 'linear-gradient(90deg, transparent 10%, #14B8A6, #2DD4BF, transparent 90%)' }}
          />

          {/* Content wrapper */}
          <div className="relative z-10 flex-1 flex flex-col justify-center px-6 py-10 safe-top safe-bottom">
            {/* Logo + branding */}
            <motion.div
              className="flex items-center gap-3.5 mb-3"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <LogoMark size="sm" />
              <div>
                <h1 className="text-white font-bold text-lg tracking-tight">Raftar Group</h1>
                <p className="text-xs font-medium" style={{ color: '#2DD4BF' }}>Digital Mandal System</p>
              </div>
            </motion.div>

            {/* Heading */}
            <motion.div
              className="mb-8 mt-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
            >
              <h2 className="text-3xl font-bold text-white leading-snug">
                Welcome back
              </h2>
              <p className="mt-1.5 text-sm" style={{ color: '#64748B' }}>
                Sign in to your account to continue
              </p>
            </motion.div>

            {/* Glass card */}
            <motion.div
              className="rounded-2xl p-6 relative overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                backdropFilter: 'blur(20px) saturate(180%)',
                boxShadow: '0 8px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {/* Top accent border inside card */}
              <div
                className="absolute top-0 left-4 right-4 h-[2px] rounded-full"
                style={{ background: 'linear-gradient(90deg, transparent, #14B8A6, #2DD4BF, transparent)' }}
              />

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    className="mb-4 overflow-hidden"
                  >
                    <div
                      className="p-3.5 rounded-xl"
                      style={{
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.2)',
                      }}
                    >
                      <p className="text-sm font-medium" style={{ color: '#F87171' }}>{error}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4" suppressHydrationWarning>
                {/* Email */}
                <motion.div
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                >
                  <label
                    htmlFor="email-mobile"
                    className="block text-xs font-semibold mb-1.5 tracking-wide uppercase"
                    style={{ color: '#94A3B8' }}
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} />
                    <input
                      id="email-mobile"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="login-dark-input w-full rounded-xl text-sm"
                      style={{ padding: '0.8rem 1rem 0.8rem 2.75rem' }}
                      placeholder="you@raftar.com"
                      autoComplete="email"
                      required
                      suppressHydrationWarning
                    />
                  </div>
                </motion.div>

                {/* Password */}
                <motion.div
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                >
                  <label
                    htmlFor="password-mobile"
                    className="block text-xs font-semibold mb-1.5 tracking-wide uppercase"
                    style={{ color: '#94A3B8' }}
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#475569' }} />
                    <input
                      id="password-mobile"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="login-dark-input w-full rounded-xl text-sm"
                      style={{ padding: '0.8rem 2.75rem 0.8rem 2.75rem' }}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                      suppressHydrationWarning
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: '#475569' }}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </motion.div>

                {/* Submit */}
                <motion.div
                  className="pt-2"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                >
                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    className="shimmer-btn w-full flex items-center justify-center gap-2 text-white font-semibold rounded-xl"
                    style={{
                      padding: '0.875rem 1.5rem',
                      fontSize: '0.9375rem',
                      background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 50%, #14B8A6 100%)',
                      backgroundSize: '200% 200%',
                      border: 'none',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      opacity: isLoading ? 0.6 : 1,
                      boxShadow: '0 4px 24px rgba(20,184,166,0.4), 0 0 60px rgba(20,184,166,0.15)',
                      transition: 'all 0.25s ease',
                    }}
                    whileTap={!isLoading ? { scale: 0.97 } : {}}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full animate-spin"
                          style={{ border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#ffffff' }}
                        />
                        <span>Signing in...</span>
                      </div>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </motion.button>
                </motion.div>
              </form>
            </motion.div>

            {/* Bottom text */}
            <motion.p
              className="mt-6 text-center text-xs"
              style={{ color: '#334155' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              Internal use only. Contact admin if you need access.
            </motion.p>
          </div>
        </div>
      </div>
    </>
  );
}
