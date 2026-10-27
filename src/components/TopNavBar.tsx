/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Cpu,
  Database,
  Download,
  LogOut,
  RefreshCw,
  User,
} from 'lucide-react';
import { SietLogo } from './SietLogo';
import { SyncMetadata, UserSession } from '../types/lms';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export type TopNavTab =
  | 'home'
  | 'dashboard'
  | 'my_courses'
  | 'course_detail'
  | 'profile'
  | 'gemma_tutor'
  | 'documents_sync';

interface TopNavBarProps {
  activeTab: TopNavTab;
  onSelectTab: (tab: TopNavTab) => void;
  session: UserSession;
  syncMetadata: SyncMetadata;
  onTriggerSyncCheck: () => void;
  onLogout: () => void;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  activeTab,
  onSelectTab,
  session,
  syncMetadata,
  onTriggerSyncCheck,
  onLogout,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isOnline = useOnlineStatus();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Original SIET-LMS Moodle navigation bar items matching Screenshots 2 & 3
  const navItems: { id: TopNavTab; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'my_courses', label: 'My courses' },
  ];

  const lastSyncFormatted = syncMetadata.lastSuccessfulSyncAt
    ? new Date(syncMetadata.lastSuccessfulSyncAt).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Never';

  return (
    <header className="sticky top-0 z-40 h-[62px] w-full bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-6">
      <div className="flex items-center gap-3 sm:gap-7 h-full min-w-0 flex-1">
        {/* Zone 1: SIET Brand Crest */}
        <button
          type="button"
          onClick={() => onSelectTab('dashboard')}
          aria-label="SIET-LMS Home"
          className="flex items-center gap-2 shrink-0 whitespace-nowrap focus:outline-none cursor-pointer"
        >
          <SietLogo size="sm" showMotto />
        </button>

        {/* Zone 2: Primary Navigation Links (matching Moodle / SIET-LMS green active underline) */}
        <nav
          aria-label="Primary Navigation"
          className="flex items-center gap-1 sm:gap-4 h-full overflow-x-auto no-scrollbar min-w-0"
        >
          {navItems.map((item) => {
            const isActive =
              activeTab === item.id ||
              (item.id === 'my_courses' && activeTab === 'course_detail');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative h-full px-2.5 flex items-center text-[13.5px] sm:text-[14px] whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  isActive
                    ? 'text-slate-900 font-medium border-b-[3px] border-[#0f6b3e]'
                    : 'text-slate-600 hover:text-slate-900 border-b-[3px] border-transparent'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Zone 3: User Avatar & Account Dropdown ("AV v") */}
      <div className="relative shrink-0 flex items-center gap-3" ref={menuRef}>
        {!isInstalled && isInstallable && (
          <button
            type="button"
            onClick={install}
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-[#0f6b3e] border border-[#0f6b3e]/30 hover:bg-[#0f6b3e]/5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Install App
          </button>
        )}

        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-expanded={menuOpen}
          aria-label={`User account menu for ${session.displayName}`}
          className="flex items-center gap-1.5 py-1 px-1.5 rounded-full hover:bg-slate-100 transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6b3e]"
        >
          <span className="w-9 h-9 rounded-full bg-[#e2e6ea] text-slate-700 font-medium text-[13.5px] flex items-center justify-center select-none">
            {session.initials}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-[54px] w-72 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 text-sm"
          >
            <div className="px-4 py-2.5 border-b border-slate-100">
              <div className="font-semibold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-[#0f6b3e]" />
                {session.displayName}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {session.department} · Batch {session.batchYear}
              </div>
            </div>

            <div className="px-4 py-2.5 border-b border-slate-100 space-y-1 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>Network State:</span>
                <span className="font-medium text-slate-900">
                  {isOnline ? 'Browser Online' : 'Offline Mode (Cached)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Baseline Snapshot:</span>
                <span className="font-mono tabular-nums text-slate-800">{lastSyncFormatted}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Unsynced Local Edits:</span>
                <span className="font-mono tabular-nums font-semibold text-amber-700">
                  {syncMetadata.pendingMutationCount}
                </span>
              </div>
            </div>

            <div className="py-1">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onSelectTab('profile');
                }}
                className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-[#0f6b3e]" />
                Profile & Account Details
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onSelectTab('documents_sync');
                }}
                className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 text-[#0f6b3e]" />
                Course Material Manager & Sync Queue
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onSelectTab('gemma_tutor');
                }}
                className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <Cpu className="w-3.5 h-3.5 text-[#0f6b3e]" />
                Local Gemma 4 Tutor (Offline RAG)
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onTriggerSyncCheck();
                }}
                className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#0f6b3e]" />
                Check LMS Synchronization Now
              </button>

              {!isInstalled && isInstallable && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    install();
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-medium text-[#0f6b3e] hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Install SIET-LMS Offline App (PWA)
                </button>
              )}

              {!isInstalled && isIOS && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setShowIOSGuide(true);
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-medium text-[#0f6b3e] hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Install on iPhone / iPad
                </button>
              )}
            </div>

            <div className="border-t border-slate-100 pt-1">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onLogout();
                }}
                className="w-full px-4 py-2 text-left text-xs font-medium text-red-700 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Log out
              </button>
            </div>
          </div>
        )}
      </div>

      {showIOSGuide && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Install SIET-LMS Offline</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              1. Tap the <strong>Share</strong> button in your browser toolbar.
              <br />
              2. Select <strong>Add to Home Screen</strong> for full offline access.
            </p>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-4 w-full rounded-lg bg-slate-100 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
