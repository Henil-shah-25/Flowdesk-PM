import React, { useState } from 'react';
import { GlassCard, Button, Chip, Toggle } from '../components/ui';
import { api } from '../lib/api';
import { queryClient } from '../lib/queryClient';
import {
  User,
  Database,
  ExternalLink,
  Smartphone,
  Trash2,
  Check,
} from 'lucide-react';

export const Account: React.FC = () => {
  const [offlineSync, setOfflineSync] = useState(true);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleResetCache = () => {
    if (window.confirm('Reset local offline database cache to default mock data?')) {
      localStorage.clear();
      queryClient.clear();
      setResetSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  return (
    <div className="space-y-8 pt-4 max-w-3xl mx-auto">
      <div>
        <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-light tracking-[-0.02em] text-graphite leading-[1.08]">
          Account & Workspace
        </h1>
        <p className="text-xs sm:text-[13px] text-secondary mt-2 font-normal">
          Manage your Google Sheets database connection, sync preferences, and app foundation.
        </p>
      </div>

      {/* User Profile Card */}
      <GlassCard className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-lime flex items-center justify-center text-nearblack font-semibold text-sm shadow-sm">
            <User size={20} />
          </div>
          <div>
            <h3 className="font-normal text-xl text-graphite tracking-tight">Personal Workspace</h3>
            <p className="text-xs text-secondary mt-0.5 font-normal">Single-user local & cloud sync</p>
          </div>
        </div>
        <Chip label="Owner" accent="lime" size="md" dot={false} />
      </GlassCard>

      {/* Data Layer Status */}
      <GlassCard className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Database size={18} className={api.isConfigured ? 'text-lime' : 'text-amber'} />
            <h3 className="font-normal text-base text-graphite">Google Sheets Backend Connection</h3>
          </div>
          <Chip
            label={api.isConfigured ? 'Connected (Apps Script)' : 'Local Mock Database'}
            accent={api.isConfigured ? 'lime' : 'amber'}
            size="sm"
          />
        </div>

        <p className="text-xs text-secondary leading-relaxed font-normal">
          {api.isConfigured ? (
            <>
              Your client is connected to your Google Apps Script web app API endpoint using
              CORS-preflight-free <code className="bg-black/5 px-1 py-0.5 rounded text-graphite font-mono">text/plain</code> POST requests.
            </>
          ) : (
            <>
              Currently running in <strong>Local Mock Mode</strong> with optimistic updates and browser storage persistence. To connect your live Google Sheet, follow the instructions in <code className="bg-black/5 px-1 py-0.5 rounded text-graphite font-mono">SETUP.md</code>.
            </>
          )}
        </p>

        <div className="pt-2 flex flex-wrap items-center gap-2">
          <a
            href="https://sheets.new"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/50 hover:bg-white text-xs font-normal text-graphite border border-white/70 transition-colors shadow-sm"
          >
            <span>Google Sheets</span>
            <ExternalLink size={13} />
          </a>
          <a
            href="https://script.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/50 hover:bg-white text-xs font-normal text-graphite border border-white/70 transition-colors shadow-sm"
          >
            <span>Apps Script</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </GlassCard>

      {/* PWA & Cache Settings */}
      <GlassCard className="space-y-5">
        <h3 className="font-normal text-base text-graphite">Application Storage & PWA</h3>

        <div className="space-y-4 text-xs font-normal">
          <div className="flex items-center justify-between pb-3 border-b border-black/[0.04]">
            <div>
              <p className="font-normal text-graphite text-sm">Local Cache Persistence</p>
              <p className="text-secondary">Keep data available offline in TanStack cache</p>
            </div>
            <Toggle checked={offlineSync} onChange={setOfflineSync} size="sm" />
          </div>

          <div className="flex items-center justify-between pb-3 border-b border-black/[0.04]">
            <div>
              <p className="font-normal text-graphite text-sm">Installable PWA</p>
              <p className="text-secondary">Web app manifest configured with offline service worker</p>
            </div>
            <div className="flex items-center gap-1.5 text-lime-600 font-medium">
              <Smartphone size={14} className="text-lime" />
              <span>Active</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="font-normal text-graphite text-sm">Clear Local Mock Database</p>
              <p className="text-secondary">Reset all local storage records back to initial foundation data</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={resetSuccess ? <Check size={14} className="text-lime" /> : <Trash2 size={14} />}
              onClick={handleResetCache}
            >
              {resetSuccess ? 'Reset' : 'Clear Cache'}
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
