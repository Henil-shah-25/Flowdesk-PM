import React, { useState, useEffect, useMemo } from 'react';
import { GlassCard, Button, Chip, Toggle, Modal } from '../components/ui';
import { api, subscribeConnection, getConnectionInfo, type ConnectionInfo } from '../lib/api';
import { queryClient } from '../lib/queryClient';
import { repairEmptyProjects, restoreDefaultDepartments } from '../lib/projectAutoSetup';
import { useToast } from '../components/common/Toast';
import {
  useTableData,
  useCreateRecord,
  useUpdateRecord,
  useDeleteRecord,
} from '../hooks/useData';
import type { Template } from '../types';
import {
  Database,
  Smartphone,
  Trash2,
  Check,
  RefreshCw,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Info,
  Wrench,
  BookOpen,
  Plus,
  Pencil,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const [offlineSync, setOfflineSync] = useState(true);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [conn, setConn] = useState<ConnectionInfo>(getConnectionInfo);
  const { showToast } = useToast();

  // Template Manager State
  const { data: templates = [] } = useTableData('Templates');
  const createTemplate = useCreateRecord('Templates');
  const updateTemplate = useUpdateRecord('Templates');
  const deleteTemplate = useDeleteRecord('Templates');

  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('All');
  const [selectedSubFilter, setSelectedSubFilter] = useState<string>('All');
  const [tmplSearchQuery, setTmplSearchQuery] = useState('');
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  const [tmplTitle, setTmplTitle] = useState('');
  const [tmplDescription, setTmplDescription] = useState('');
  const [tmplDept, setTmplDept] = useState('Tech');
  const [tmplSub, setTmplSub] = useState('');
  const [tmplGroup, setTmplGroup] = useState('General');
  const [tmplPriority, setTmplPriority] = useState<Template['priority']>('medium');
  const [tmplEstimate, setTmplEstimate] = useState(45);
  const [tmplSubtasks, setTmplSubtasks] = useState('');

  useEffect(() => {
    return subscribeConnection(setConn);
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const res = await api.ping();
      if (res.ok) {
        showToast('Connected successfully to Google Sheets backend!');
      } else {
        showToast(`Connection test: ${res.reason || 'Check .env settings'}`);
      }
    } catch (err: unknown) {
      showToast(`Connection error: ${(err as Error)?.message || 'Failed'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleUploadLocalData = async () => {
    if (!api.isConfigured) {
      alert('Cannot upload to Sheets: Live API is not configured in .env. Please set VITE_API_URL and VITE_API_TOKEN first.');
      return;
    }

    const confirmed = window.confirm(
      'Upload all local workspace data (Projects, Departments, Stages, Tasks, Ideas, Templates) to your connected Google Sheet tabs? This is intended for initial setup when your sheet is empty.'
    );

    if (!confirmed) return;

    setIsUploading(true);
    try {
      const res = await api.uploadLocalDataToSheets();
      if (res.ok) {
        showToast(`Successfully uploaded ${res.count} records to Google Sheets!`);
      }
    } catch (err: unknown) {
      showToast(`Upload error: ${(err as Error)?.message || 'Failed to upload'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRepairProjects = () => {
    setIsRepairing(true);
    try {
      const res = repairEmptyProjects();
      queryClient.invalidateQueries();
      showToast(
        `Repaired: ${res.repairedProjectsCount} project(s) updated with ${res.totalNewDepartments} departments and ${res.totalNewStages} stages.`
      );
    } catch (err) {
      console.error(err);
      showToast('Failed to run project repair.');
    } finally {
      setIsRepairing(false);
    }
  };

  const handleRestoreDepartments = () => {
    setIsRestoring(true);
    try {
      const res = restoreDefaultDepartments();
      queryClient.invalidateQueries();
      showToast(
        `Restored ${res.restoredDepartmentsCount} missing departments and ${res.restoredStagesCount} stages.`
      );
    } catch (err) {
      console.error(err);
      showToast('Failed to restore default departments.');
    } finally {
      setIsRestoring(false);
    }
  };

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

  // Template Handlers
  const handleOpenAddTemplate = () => {
    setEditingTemplate(null);
    setTmplTitle('');
    setTmplDescription('');
    setTmplDept(selectedDeptFilter !== 'All' ? selectedDeptFilter : 'Tech');
    setTmplSub(selectedSubFilter !== 'All' ? selectedSubFilter : '');
    setTmplGroup('General');
    setTmplPriority('medium');
    setTmplEstimate(45);
    setTmplSubtasks('');
    setTemplateModalOpen(true);
  };

  const handleOpenEditTemplate = (tmpl: Template) => {
    setEditingTemplate(tmpl);
    setTmplTitle(tmpl.task_title);
    setTmplDescription(tmpl.description || '');
    setTmplDept(tmpl.department_name);
    setTmplSub(tmpl.sub_name || '');
    setTmplGroup(tmpl.group_name || 'General');
    setTmplPriority(tmpl.priority || 'medium');
    setTmplEstimate(tmpl.estimate_min || 45);
    setTmplSubtasks(tmpl.subtasks || '');
    setTemplateModalOpen(true);
  };

  const handleSaveTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tmplTitle.trim()) return;

    if (editingTemplate) {
      updateTemplate.mutate({
        id: editingTemplate.id,
        patch: {
          task_title: tmplTitle.trim(),
          description: tmplDescription.trim(),
          department_name: tmplDept.trim(),
          sub_name: tmplSub.trim(),
          group_name: tmplGroup.trim() || 'General',
          priority: tmplPriority,
          estimate_min: tmplEstimate,
          subtasks: tmplSubtasks.trim(),
        },
      });
      showToast('Template updated');
    } else {
      createTemplate.mutate({
        task_title: tmplTitle.trim(),
        description: tmplDescription.trim(),
        department_name: tmplDept.trim(),
        sub_name: tmplSub.trim(),
        group_name: tmplGroup.trim() || 'General',
        priority: tmplPriority,
        estimate_min: tmplEstimate,
        subtasks: tmplSubtasks.trim(),
        order: templates.length + 1,
      });
      showToast('Template added');
    }

    setTemplateModalOpen(false);
  };

  const handleDeleteTemplate = (tmplId: string) => {
    deleteTemplate.mutate(tmplId);
    showToast('Template deleted');
  };

  // Available departments from templates
  const availableDepts = useMemo(() => {
    const set = new Set<string>();
    templates.forEach((t) => {
      if (t.department_name) set.add(t.department_name);
    });
    return Array.from(set).sort();
  }, [templates]);

  // Available sub-departments for current department filter
  const availableSubDepts = useMemo(() => {
    if (selectedDeptFilter === 'All') return [];
    const set = new Set<string>();
    templates
      .filter((t) => t.department_name === selectedDeptFilter)
      .forEach((t) => {
        if (t.sub_name) set.add(t.sub_name);
      });
    return Array.from(set).sort();
  }, [templates, selectedDeptFilter]);

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      // Dept filter
      if (selectedDeptFilter !== 'All' && t.department_name !== selectedDeptFilter) {
        return false;
      }
      // Sub-dept filter
      if (selectedSubFilter !== 'All') {
        if (selectedSubFilter === '(General)') {
          if (t.sub_name && t.sub_name.trim() !== '') return false;
        } else if (t.sub_name !== selectedSubFilter) {
          return false;
        }
      }
      // Search query
      if (tmplSearchQuery.trim()) {
        const q = tmplSearchQuery.toLowerCase();
        const titleMatch = (t.task_title || '').toLowerCase().includes(q);
        const descMatch = (t.description || '').toLowerCase().includes(q);
        const groupMatch = (t.group_name || '').toLowerCase().includes(q);
        const subtasksMatch = (t.subtasks || '').toLowerCase().includes(q);
        return titleMatch || descMatch || groupMatch || subtasksMatch;
      }
      return true;
    });
  }, [templates, selectedDeptFilter, selectedSubFilter, tmplSearchQuery]);

  const statusChipConfig = {
    local: { label: 'Local Mode', accent: 'amber' as const, icon: <Database size={13} /> },
    connecting: { label: 'Connecting...', accent: 'sky' as const, icon: <RefreshCw size={13} className="animate-spin" /> },
    synced: { label: 'Synced', accent: 'lime' as const, icon: <CheckCircle2 size={13} /> },
    error: { label: 'Connection Error', accent: 'coral' as const, icon: <AlertTriangle size={13} /> },
  }[conn.status] || { label: 'Local Mode', accent: 'amber' as const, icon: <Database size={13} /> };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      {/* Title */}
      <div>
        <h1 className="text-[clamp(40px,4.5vw,56px)] font-light tracking-[-0.02em] text-graphite leading-[1.08]">
          Settings
        </h1>
        <p className="text-sm sm:text-base text-secondary mt-2 font-normal">
          Google Sheets connection, template library, and workspace provisioning.
        </p>
      </div>

      {/* Connection Card */}
      <GlassCard className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center text-graphite border ${
                conn.status === 'synced'
                  ? 'bg-lime/25 border-lime/50 text-lime-900'
                  : conn.status === 'error'
                  ? 'bg-coral/20 border-coral/40 text-coral'
                  : 'bg-white/60 border-white/70'
              }`}
            >
              <Database size={20} />
            </div>
            <div>
              <h3 className="font-normal text-lg sm:text-xl text-graphite tracking-tight">
                Backend Connection
              </h3>
              <p className="text-xs text-secondary mt-0.5">
                Google Apps Script & Google Sheets REST layer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Chip
              label={statusChipConfig.label}
              accent={statusChipConfig.accent}
              size="md"
            />
          </div>
        </div>

        {/* Status Explanation Box */}
        <div className="p-4 rounded-2xl bg-white/45 border border-white/65 space-y-2 text-xs sm:text-sm">
          <div className="flex items-start gap-2.5">
            <Info size={16} className="text-secondary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-graphite">
                Current Status:{' '}
                <span className="font-normal capitalize">{conn.status}</span>
              </p>
              <p className="text-secondary text-xs">{conn.reason}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={14} className={isTesting ? 'animate-spin' : ''} />}
            onClick={handleTestConnection}
            disabled={isTesting}
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<UploadCloud size={14} className={isUploading ? 'animate-bounce' : ''} />}
            onClick={handleUploadLocalData}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : 'Upload Local Data to Sheets'}
          </Button>
        </div>
      </GlassCard>

      {/* Provisioning & Restore Departments Card */}
      <GlassCard className="space-y-4">
        <h3 className="font-normal text-base text-graphite">Workspace Provisioning</h3>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/40 border border-white/60">
          <div>
            <h4 className="font-medium text-sm text-graphite">Restore Default Departments</h4>
            <p className="text-xs text-secondary mt-0.5">
              Re-adds missing default departments (Tech, Marketing, HR, Finance, Design, Operations, Research) and their 4 stages without duplicating existing ones or auto-loading tasks.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            icon={<RotateCcw size={14} className={isRestoring ? 'animate-spin' : ''} />}
            onClick={handleRestoreDepartments}
            disabled={isRestoring}
          >
            {isRestoring ? 'Restoring...' : 'Restore defaults'}
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/40 border border-white/60">
          <div>
            <h4 className="font-medium text-sm text-graphite">Repair Empty Projects</h4>
            <p className="text-xs text-secondary mt-0.5">
              Ensures every active project has standard 4-stage pipelines (Started, Middle, Ended, Blockade).
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={<Wrench size={14} className={isRepairing ? 'animate-spin' : ''} />}
            onClick={handleRepairProjects}
            disabled={isRepairing}
          >
            {isRepairing ? 'Repairing...' : 'Repair projects'}
          </Button>
        </div>
      </GlassCard>

      {/* Template Library Manager */}
      <GlassCard className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/60 border border-black/[0.07] flex items-center justify-center text-graphite">
              <BookOpen size={18} />
            </div>
            <div>
              <h3 className="font-normal text-lg sm:text-xl text-graphite tracking-tight">
                Template Library Manager
              </h3>
              <p className="text-xs text-secondary mt-0.5">
                Manage reusable task templates across departments ({templates.length} templates)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenAddTemplate}
              className="h-9 px-4 rounded-full bg-lime text-nearblack text-xs font-medium hover:bg-[var(--accent-lime-hover)] transition-all shadow-xs flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Add template</span>
            </button>
          </div>
        </div>

        {/* Search & Department Filters */}
        <div className="space-y-2.5">
          {/* Search Box */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search templates by title, description, group or subtasks..."
              value={tmplSearchQuery}
              onChange={(e) => setTmplSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-full bg-white/60 border border-black/[0.07] text-graphite placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-nearblack/20"
            />
            {tmplSearchQuery && (
              <button
                type="button"
                onClick={() => setTmplSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-graphite"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Department Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <span className="text-[11px] text-secondary font-medium mr-1 shrink-0">Dept:</span>
            {['All', ...availableDepts].map((dept) => (
              <button
                key={dept}
                type="button"
                onClick={() => {
                  setSelectedDeptFilter(dept);
                  setSelectedSubFilter('All');
                }}
                className={`px-3 py-1 rounded-full text-xs font-normal transition-all border whitespace-nowrap ${
                  selectedDeptFilter === dept
                    ? 'bg-nearblack text-white border-nearblack font-medium'
                    : 'bg-white/50 text-secondary border-black/[0.06] hover:bg-white'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>

          {/* Sub-department Pills (if dept selected and has sub-depts) */}
          {availableSubDepts.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 pl-1">
              <span className="text-[11px] text-secondary font-medium mr-1 shrink-0">Sub:</span>
              {['All', '(General)', ...availableSubDepts].map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSelectedSubFilter(sub)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] transition-all border whitespace-nowrap ${
                    selectedSubFilter === sub
                      ? 'bg-nearblack text-white border-nearblack font-medium'
                      : 'bg-white/40 text-secondary border-black/[0.05] hover:bg-white'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Template List: max-height scrollable */}
        <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
          {filteredTemplates.length === 0 ? (
            <div className="py-8 text-center text-secondary text-xs">No templates found.</div>
          ) : (
            filteredTemplates.map((tmpl) => {
              const subtaskList = (tmpl.subtasks || '')
                .split('|')
                .map((s) => s.trim())
                .filter(Boolean);

              return (
                <div
                  key={tmpl.id}
                  className="group p-3 rounded-2xl bg-white/55 hover:bg-white border border-black/[0.05] transition-all flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-black/[0.05] text-graphite font-medium">
                        {tmpl.department_name}
                        {tmpl.sub_name ? ` / ${tmpl.sub_name}` : ''}
                      </span>
                      {tmpl.group_name && (
                        <span className="text-[10px] text-muted">
                          [{tmpl.group_name}]
                        </span>
                      )}
                      {subtaskList.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-800">
                          {subtaskList.length} subtasks
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-graphite truncate mt-1">
                      {tmpl.task_title}
                    </p>
                    {tmpl.description && (
                      <p className="text-xs text-secondary line-clamp-1 mt-0.5">
                        {tmpl.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    <span className="text-xs text-muted">
                      {tmpl.estimate_min}m
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenEditTemplate(tmpl)}
                      className="p-1.5 rounded-lg text-secondary hover:text-graphite hover:bg-black/5"
                      title="Edit template"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(tmpl.id)}
                      className="p-1.5 rounded-lg text-secondary hover:text-coral hover:bg-coral/10"
                      title="Delete template"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
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

      {/* Add / Edit Template Modal */}
      <Modal
        isOpen={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        title={editingTemplate ? 'Edit Template Task' : 'Add Template Task'}
        description="Configure template task parameters."
      >
        <form onSubmit={handleSaveTemplateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-secondary mb-1">Task Title</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Conduct usability testing"
              value={tmplTitle}
              onChange={(e) => setTmplTitle(e.target.value)}
              className="w-full px-4 py-2 text-xs sm:text-sm rounded-full bg-white/60 border border-black/[0.08] text-graphite focus:outline-none focus:ring-2 focus:ring-nearblack/20"
            />
          </div>

          <div>
            <label className="block text-xs text-secondary mb-1">Description (Optional)</label>
            <textarea
              rows={2}
              placeholder="Brief summary of template task goals or guidelines..."
              value={tmplDescription}
              onChange={(e) => setTmplDescription(e.target.value)}
              className="w-full px-4 py-2 text-xs rounded-2xl bg-white/60 border border-black/[0.08] text-graphite focus:outline-none focus:ring-2 focus:ring-nearblack/20 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-secondary mb-1">Department</label>
              <input
                type="text"
                required
                value={tmplDept}
                onChange={(e) => setTmplDept(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-full bg-white/60 border border-black/[0.08] text-graphite focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">Sub-department (Optional)</label>
              <input
                type="text"
                placeholder="e.g. SEO, Frontend"
                value={tmplSub}
                onChange={(e) => setTmplSub(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-full bg-white/60 border border-black/[0.08] text-graphite focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-secondary mb-1">Group / Section</label>
              <input
                type="text"
                placeholder="e.g. On-page, Creative"
                value={tmplGroup}
                onChange={(e) => setTmplGroup(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-full bg-white/60 border border-black/[0.08] text-graphite focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1">Estimate (Minutes)</label>
              <input
                type="number"
                min={5}
                step={5}
                value={tmplEstimate}
                onChange={(e) => setTmplEstimate(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs rounded-full bg-white/60 border border-black/[0.08] text-graphite focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-secondary mb-1">Subtasks (separated by " | ")</label>
            <input
              type="text"
              placeholder="e.g. Initial audit | Content review | Stakeholder sign-off"
              value={tmplSubtasks}
              onChange={(e) => setTmplSubtasks(e.target.value)}
              className="w-full px-4 py-2 text-xs rounded-full bg-white/60 border border-black/[0.08] text-graphite focus:outline-none focus:ring-2 focus:ring-nearblack/20"
            />
          </div>

          <div>
            <label className="block text-xs text-secondary mb-1">Priority</label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high', 'urgent'] as const).map((pri) => (
                <button
                  key={pri}
                  type="button"
                  onClick={() => setTmplPriority(pri)}
                  className={`flex-1 py-1.5 text-xs rounded-full capitalize transition-all border ${
                    tmplPriority === pri
                      ? 'bg-nearblack text-white border-nearblack font-medium'
                      : 'bg-white/40 text-secondary border-black/[0.07] hover:bg-white/70'
                  }`}
                >
                  {pri}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-black/[0.06]">
            <button
              type="button"
              onClick={() => setTemplateModalOpen(false)}
              className="h-10 px-4 rounded-full text-xs text-secondary hover:text-graphite bg-white/40 border border-black/[0.07]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-5 rounded-full text-xs font-medium bg-lime text-nearblack hover:bg-[var(--accent-lime-hover)] shadow-xs"
            >
              {editingTemplate ? 'Save Changes' : 'Add Template'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
