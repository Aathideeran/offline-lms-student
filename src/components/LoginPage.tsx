/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SietLogo } from './SietLogo';
import { UserSession } from '../types/lms';

interface LoginPageProps {
  onLoginSuccess: (session: UserSession) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('AATHIDEERAN');
  const [password, setPassword] = useState('siet2029');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [recoveryRollNo, setRecoveryRollNo] = useState('');
  const [recoverySubmitted, setRecoverySubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser) {
      setErrorMsg('Please enter your SIET-LMS username or roll number.');
      return;
    }
    if (!trimmedPass) {
      setErrorMsg('Please enter your password to unlock your local LMS workspace.');
      return;
    }

    setErrorMsg(null);
    const cleanName = trimmedUser.toUpperCase();
    const words = cleanName.split(/\s+/).filter(Boolean);
    const initials =
      words.length >= 2
        ? `${words[0][0]}${words[1][0]}`
        : cleanName === 'AATHIDEERAN'
        ? 'AV'
        : cleanName.slice(0, 2);

    onLoginSuccess({
      username: trimmedUser,
      displayName: cleanName,
      initials,
      department: 'B.E. Computer Science & Engineering',
      batchYear: '2029',
      loggedInAt: new Date().toISOString(),
    });
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row">
      {/* Left Column: Dark Green (#015303) with Yellow (#f6e01c) typography */}
      <section
        aria-label="SIET-LMS Welcome Information"
        className="w-full md:w-[50.8%] bg-[#015303] text-[#f6e01c] px-8 sm:px-12 lg:px-14 py-12 md:py-24 flex flex-col justify-center"
      >
        <div className="max-w-[660px]">
          <h1 className="text-[32px] sm:text-[42px] font-bold tracking-tight leading-tight mb-7 text-[#f6e01c]">
            Welcome to SIET-LMS
          </h1>

          <p className="text-[16px] sm:text-[18.5px] leading-[1.68] text-justify mb-8 text-[#f6e01c]/95 font-normal">
            The{' '}
            <strong className="font-bold text-[#f6e01c]">
              Sri Shakthi Institute of Engineering and Technology Learning Management System
              (SIET-LMS)
            </strong>{' '}
            is your dedicated online platform designed to elevate your programming skills and
            academic journey. SIET-LMS offers a comprehensive, user-friendly environment tailored
            to support your growth.
          </p>

          <h2 className="text-[17px] sm:text-[18.5px] font-bold mb-5 text-[#f6e01c]">
            SIET - LMS Provides
          </h2>

          <ul className="list-disc pl-8 space-y-3.5 text-[15.5px] sm:text-[17px] leading-[1.62] text-[#f6e01c]/95">
            <li>
              A vast collection of carefully curated coding challenges and problems spanning
              various difficulty levels.
            </li>
            <li>
              Real-time code compilation and execution to instantly test and validate your
              solutions.
            </li>
            <li>
              Detailed progress tracking and personalized feedback to help you identify strengths
              and areas for improvement.
            </li>
            <li>
              Resources and tools aligned with competitive programming and industry-relevant
              software development practices.
            </li>
          </ul>
        </div>
      </section>

      {/* Right Column: Bright Yellow (#f6e01c) with centered Mint-White Card (#e4f9ec) */}
      <main
        aria-label="Student Login Form"
        className="w-full md:w-[49.2%] bg-[#f6e01c] px-6 py-14 md:py-24 flex items-center justify-center"
      >
        <div className="w-full max-w-[356px] bg-[#e4f9ec] rounded-[16px] shadow-[0_8px_28px_rgba(0,0,0,0.16)] px-7 pt-8 pb-9 flex flex-col items-center">
          {/* College Crest Logo */}
          <div className="mb-6">
            <SietLogo size="lg" />
          </div>

          <form onSubmit={handleSubmit} className="w-full space-y-4" noValidate>
            <div>
              <label htmlFor="siet-username" className="sr-only">
                Username
              </label>
              <input
                id="siet-username"
                name="username"
                type="text"
                autoComplete="username"
                placeholder="Username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                className="w-full h-[46px] px-3.5 rounded-[7px] bg-white border border-[#84a98c] text-[15px] text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1b6d2e] focus:border-transparent transition"
              />
            </div>

            <div>
              <label htmlFor="siet-password" className="sr-only">
                Password
              </label>
              <input
                id="siet-password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                className="w-full h-[46px] px-3.5 rounded-[7px] bg-white border border-[#84a98c] text-[15px] text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1b6d2e] focus:border-transparent transition"
              />
              <div className="flex justify-end mt-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setRecoverySubmitted(false);
                    setShowForgotModal(true);
                  }}
                  className="text-[12.5px] font-medium text-[#1b6d2e] hover:underline focus:outline-none focus-visible:underline"
                >
                  Forgot Password?
                </button>
              </div>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="text-[12.5px] text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2"
              >
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              className="w-full h-[44px] mt-1 rounded-[7px] bg-[#439c47] hover:bg-[#38873c] active:bg-[#2f7332] text-white font-medium text-[15px] shadow-xs transition cursor-pointer"
            >
              Login
            </button>
          </form>

          <div className="mt-5 pt-3.5 border-t border-[#cce6d4] w-full text-center text-[11.5px] text-[#1b6d2e]/85">
            Offline-First Local Session · IndexedDB Ready
          </div>
        </div>
      </main>

      {/* Forgot Password Modal (Functional Offline Recovery Guidance) */}
      {showForgotModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-password-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-slate-200">
            <h3 id="forgot-password-title" className="text-lg font-bold text-slate-900">
              SIET-LMS Password Recovery (Offline Mode)
            </h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Because SIET-LMS Offline operates independently on your Windows or Android device
              without requiring live campus intranet connectivity, remote password resets must be
              processed by the SIET Centre for Academic Computing when you reconnect to the campus
              network.
            </p>

            {!recoverySubmitted ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (recoveryRollNo.trim()) {
                    setRecoverySubmitted(true);
                  }
                }}
                className="mt-4 space-y-3"
              >
                <div>
                  <label
                    htmlFor="recovery-roll-input"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Queue Local Password Reset Request (Roll Number / Email)
                  </label>
                  <input
                    id="recovery-roll-input"
                    type="text"
                    required
                    placeholder="e.g., 714025104001 or aathideeran@siet.ac.in"
                    value={recoveryRollNo}
                    onChange={(e) => setRecoveryRollNo(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#015303]"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-medium text-white bg-[#015303] hover:bg-[#0f6b3e] rounded-lg"
                  >
                    Save Local Recovery Note
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 space-y-2">
                <p className="font-semibold">
                  Recovery reminder saved locally for {recoveryRollNo}.
                </p>
                <p>
                  For immediate offline study access on this device, you can sign in with your
                  cached student profile (e.g., username <strong>AATHIDEERAN</strong>).
                </p>
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-1.5 bg-[#015303] text-white rounded-md font-medium"
                  >
                    Return to Login
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
