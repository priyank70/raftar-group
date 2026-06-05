'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail, Zap, TrendingUp, Shield, Users } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

const features = [
  { icon: TrendingUp, title: 'Smart Analytics', desc: 'Real-time financial insights' },
  { icon: Shield, title: 'Secure & Trusted', desc: 'Bank-grade encryption' },
  { icon: Users, title: 'Member Management', desc: 'Complete group control' },
  { icon: Zap, title: 'Instant Updates', desc: 'Live notification system' },
];

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
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary-900 flex-col justify-between p-12">
        {/* Background elements */}
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-accent-light flex items-center justify-center shadow-glow">
              <span className="text-white font-bold text-2xl">R</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-xl tracking-tight">Raftar Group</h1>
              <p className="text-accent-light text-xs font-medium">Digital Mandal System</p>
            </div>
          </div>
        </motion.div>

        {/* Hero Content */}
        <div className="relative z-10 space-y-8">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <h2 className="text-4xl font-bold text-white leading-tight">
              Manage Your Mandal{' '}
              <span className="text-gradient bg-gradient-to-r from-accent to-accent-light">
                Smartly
              </span>
            </h2>
            <p className="mt-4 text-slate-400 text-lg leading-relaxed">
              Transform your traditional committee into a premium digital experience. 
              Track installments, manage investments, and stay connected in real-time.
            </p>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="grid grid-cols-2 gap-4"
          >
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300"
              >
                <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center mb-3">
                  <feature.icon className="w-4 h-4 text-accent-light" />
                </div>
                <p className="text-white font-semibold text-sm">{feature.title}</p>
                <p className="text-slate-400 text-xs mt-0.5">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex items-center gap-8 pt-4"
          >
            {[
              { value: '100%', label: 'Transparent' },
              { value: 'Live', label: 'Updates' },
              { value: '24/7', label: 'Access' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold text-accent-light">{stat.value}</p>
                <p className="text-slate-400 text-xs">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Bottom text */}
        <p className="relative z-10 text-slate-600 text-xs">
          © 2024 Raftar Group. Internal use only.
        </p>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-light flex items-center justify-center">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <div>
              <h1 className="text-gray-900 font-bold text-lg">Raftar Group</h1>
              <p className="text-muted text-xs">Digital Mandal System</p>
            </div>
          </div>

          {/* Form header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-muted mt-2">Sign in to your account to continue</p>
          </div>

          {/* Error alert */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-4 bg-danger-bg border border-danger/20 rounded-xl"
              >
                <p className="text-danger text-sm font-medium">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" suppressHydrationWarning>
            {/* Email */}
            <div>
              <label htmlFor="email" className="label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input !pl-12"
                  placeholder="you@raftar.com"
                  autoComplete="email"
                  required
                  suppressHydrationWarning
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input !pl-12 pr-10"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  suppressHydrationWarning
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-gray-700 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              className="btn-primary btn-lg w-full mt-2"
              whileTap={{ scale: 0.98 }}
              whileHover={{ scale: 1.01 }}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </motion.button>
          </form>

          {/* Demo credentials */}
          <div className="mt-8 p-4 bg-accent/5 rounded-xl border border-accent/20">
            <p className="text-xs font-semibold text-accent mb-2">Demo Credentials</p>
            <div className="space-y-1.5">
              <p className="text-xs text-muted">
                <span className="font-medium text-gray-700">Admin:</span> admin@raftar.com / Admin@123
              </p>
              <p className="text-xs text-muted">
                <span className="font-medium text-gray-700">Member:</span> rahul@raftar.com / Member@123
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-muted">
            Internal use only. Contact admin if you need access.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
