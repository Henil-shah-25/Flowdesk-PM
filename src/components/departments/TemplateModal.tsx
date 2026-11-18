import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Check,
  BookOpen,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useTableData,
  useBatchUpdateRecord,
  useBatchDeleteRecord,
  useUpdateRecord
} from '../../hooks/useData';
import { useToast } from '../common/Toast';
import type { Template, TaskItem, Subtask } from '../../types';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  departmentId: string;
  departmentName: string;
  subName?: string;
  startedStageId?: string;
}

interface ParsedTemplate {
  raw: Template;
  id: string;
  department_name: string;
  sub_name: string;
  group_name: string;
  task_title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimate_min: number;
  subtasks: string[];
}

export const TemplateModal: React.FC<TemplateModalProps> = ({
  isOpen,
  onClose,
  projectId,
  departmentId,
  departmentName,
  subName = '',
  startedStageId,
}) => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: allTemplates = [], isFetching: isRefreshing } = useTableData('Templates');
  const { data: allTasks = [] } = useTableData('Tasks');
  const { data: allDepartments = [] } = useTableData('Departments');
  const { data: allStages = [] } = useTableData('Stages');

  // Mutations
  const batchUpdateTasks = useBatchUpdateRecord('Tasks');
  const batchUpdateSubtasks = useBatchUpdateRecord('Subtasks');
  const batchDeleteTasks = useBatchDeleteRecord('Tasks');
  const batchDeleteSubtasks = useBatchDeleteRecord('Subtasks');
  const updateDepartment = useUpdateRecord('Departments');

  // Modal State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  // Mapping of templateId -> Set of ticked subtask indices
  const [selectedSubtasks, setSelectedSubtasks] = useState<Map<string, Set<number>>>(new Map());
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [turnOnTargetDept, setTurnOnTargetDept] = useState(true);

  // Tab State for Parent Departments
  const [activeTab, setActiveTab] = useState<string>('General');
  // "Browse other departments" override
  const [customBrowseSource, setCustomBrowseSource] = useState<string>('');

  // Identify current department & its sub-departments
  const currentDept = useMemo(() => {
    return allDepartments.find((d) => d.id === departmentId);
  }, [allDepartments, departmentId]);

  const isSubDeptView = Boolean(subName || currentDept?.parent_id);

  // Child sub-departments if currently on parent department
  const subDepartments = useMemo(() => {
    if (isSubDeptView || !currentDept) return [];
    return allDepartments.filter((d) => d.parent_id === currentDept.id);
  }, [isSubDeptView, currentDept, allDepartments]);

  // Target department ID based on view and active tab
  const targetDepartment = useMemo(() => {
    if (isSubDeptView || !currentDept) return currentDept;
    if (activeTab === 'General') return currentDept;
    const matchedSub = subDepartments.find(
      (sub) => sub.name.toLowerCase().trim() === activeTab.toLowerCase().trim()
    );
    return matchedSub || currentDept;
  }, [isSubDeptView, currentDept, activeTab, subDepartments]);

  const isTargetDeptEnabled = useMemo(() => {
    if (!targetDepartment) return true;
    return (
      targetDepartment.enabled !== false &&
      targetDepartment.enabled !== 'false' &&
      targetDepartment.enabled !== 0
    );
  }, [targetDepartment]);

  // Target stages for the destination stage dropdown
  const targetStages = useMemo(() => {
    if (!targetDepartment) return [];
    const stages = allStages
      .filter((s) => s.department_id === targetDepartment.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    return stages;
  }, [targetDepartment, allStages]);

  // Reset or initialize default destination stage
  useEffect(() => {
    if (targetStages.length > 0) {
      if (!selectedStageId || !targetStages.some((s) => s.id === selectedStageId)) {
        const defaultStage =
          (startedStageId && targetStages.find((s) => s.id === startedStageId)) ||
          targetStages.find((s) => s.name.toLowerCase() === 'started' || s.kind === 'normal') ||
          targetStages[0];
        setSelectedStageId(defaultStage?.id || targetStages[0].id);
      }
    } else {
      setSelectedStageId('');
    }
  }, [targetStages, startedStageId, selectedStageId]);

  // Existing task titles for target department pipeline (duplicate detection)
  const existingTargetTitles = useMemo(() => {
    if (!targetDepartment) return new Set<string>();
    return new Set(
      allTasks
        .filter((t) => t.department_id === targetDepartment.id)
        .map((t) => t.title.toLowerCase().trim())
    );
  }, [allTasks, targetDepartment]);

  // Parse, sanitize and handle bad data in templates
  const { parsedTemplates, malformedCount } = useMemo(() => {
    let malformed = 0;
    const parsed: ParsedTemplate[] = [];

    allTemplates.forEach((t) => {
      if (!t || typeof t !== 'object') {
        malformed++;
        return;
      }
      const rawTitle = t.task_title || ((t as unknown) as Record<string, unknown>).title;
      if (!rawTitle || typeof rawTitle !== 'string' || !rawTitle.trim()) {
        malformed++;
        return;
      }

      // Priority fallback to 'medium'
      const rawPri = String(t.priority || '').toLowerCase().trim();
      const priority: 'low' | 'medium' | 'high' | 'urgent' =
        rawPri === 'low' || rawPri === 'high' || rawPri === 'urgent' ? rawPri : 'medium';

      // Estimate fallback to 30
      const estNum = Number(t.estimate_min);
      const estimate_min = !isNaN(estNum) && estNum > 0 ? estNum : 30;

      // Subtasks: split on "|" and trim
      const subtaskStr = typeof t.subtasks === 'string' ? t.subtasks : '';
      const subtasks = subtaskStr
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean);

      let effectiveGroup = String(t.group_name || '').trim();
      let displayTitle = rawTitle.trim();

      if (!effectiveGroup || effectiveGroup.toLowerCase() === 'general') {
        const bracketMatch = rawTitle.match(/^\[([^\]]+)\]\s*(.*)$/);
        const colonMatch = rawTitle.match(/^([^:\n]{2,20}):\s+(.*)$/);
        const dashMatch = rawTitle.match(/^([^-–—\n]{2,20})\s+[-–—]\s+(.*)$/);

        if (bracketMatch) {
          effectiveGroup = bracketMatch[1].trim();
          displayTitle = bracketMatch[2].trim() || rawTitle.trim();
        } else if (colonMatch) {
          effectiveGroup = colonMatch[1].trim();
          displayTitle = colonMatch[2].trim() || rawTitle.trim();
        } else if (dashMatch) {
          effectiveGroup = dashMatch[1].trim();
          displayTitle = dashMatch[2].trim() || rawTitle.trim();
        } else {
          effectiveGroup = 'General';
        }
      }

      parsed.push({
        raw: t,
        id: String(t.id || `tmpl_${parsed.length + 1}`),
        department_name: String(t.department_name || '').trim(),
        sub_name: String(t.sub_name || '').trim(),
        group_name: effectiveGroup,
        task_title: displayTitle,
        description: String(t.description || '').trim(),
        priority,
        estimate_min,
        subtasks,
      });
    });

    return { parsedTemplates: parsed, malformedCount: malformed };
  }, [allTemplates]);

  // Available departments & sub-departments for "Browse other departments" picker
  const availableBrowseSources = useMemo(() => {
    const set = new Set<string>();
    parsedTemplates.forEach((t) => {
      if (t.department_name) {
        if (t.sub_name) {
          set.add(`${t.department_name} / ${t.sub_name}`);
        } else {
          set.add(`${t.department_name} (General)`);
        }
      }
    });
    return Array.from(set).sort();
  }, [parsedTemplates]);

  // Filter templates matching current view / tab / browse override
  const matchingTemplates = useMemo(() => {
    if (parsedTemplates.length === 0) return [];

    // Custom browse override
    if (customBrowseSource) {
      if (customBrowseSource.includes(' / ')) {
        const [dName, sName] = customBrowseSource.split(' / ').map((s) => s.trim().toLowerCase());
        return parsedTemplates.filter(
          (t) =>
            t.department_name.toLowerCase() === dName &&
            t.sub_name.toLowerCase() === sName
        );
      }
      if (customBrowseSource.includes(' (General)')) {
        const dName = customBrowseSource.replace(' (General)', '').trim().toLowerCase();
        return parsedTemplates.filter(
          (t) =>
            t.department_name.toLowerCase() === dName &&
            (!t.sub_name || t.sub_name.toLowerCase() === 'general')
        );
      }
    }

    const curDeptName = departmentName.toLowerCase().trim();
    const curSubName = (subName || '').toLowerCase().trim();

    if (isSubDeptView) {
      // Inside a sub-department board: match that sub-department
      return parsedTemplates.filter((t) => {
        const td = t.department_name.toLowerCase();
        const ts = t.sub_name.toLowerCase();
        return ts === curSubName || (td === curDeptName && ts === curSubName);
      });
    }

    // Inside a parent department board:
    if (activeTab === 'General') {
      return parsedTemplates.filter(
        (t) =>
          t.department_name.toLowerCase() === curDeptName &&
          (!t.sub_name || t.sub_name.toLowerCase() === 'general')
      );
    }

    // A specific sub-department tab inside parent board
    const tabLower = activeTab.toLowerCase().trim();
    return parsedTemplates.filter(
      (t) =>
        t.sub_name.toLowerCase() === tabLower ||
        (t.department_name.toLowerCase() === curDeptName && t.sub_name.toLowerCase() === tabLower)
    );
  }, [parsedTemplates, customBrowseSource, departmentName, subName, isSubDeptView, activeTab]);

  // Filtered by Search query
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return matchingTemplates;
    const q = searchQuery.toLowerCase().trim();
    return matchingTemplates.filter((t) => {
      return (
        t.task_title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.group_name.toLowerCase().includes(q) ||
        t.subtasks.some((st) => st.toLowerCase().includes(q))
      );
    });
  }, [matchingTemplates, searchQuery]);

  // Grouped by group_name
  const groupedTemplates = useMemo(() => {
    const map = new Map<string, ParsedTemplate[]>();
    filteredTemplates.forEach((t) => {
      const grp = t.group_name || 'General';
      if (!map.has(grp)) map.set(grp, []);
      map.get(grp)!.push(t);
    });
    return map;
  }, [filteredTemplates]);

  // Initialize all subtasks as checked for any newly selected task
  const toggleTaskSelection = (tmpl: ParsedTemplate) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(tmpl.id)) {
        next.delete(tmpl.id);
      } else {
        next.add(tmpl.id);
        // Default: all subtasks checked
        setSelectedSubtasks((stMap) => {
          const nextMap = new Map(stMap);
          if (tmpl.subtasks.length > 0) {
            nextMap.set(tmpl.id, new Set(tmpl.subtasks.map((_, i) => i)));
          }
          return nextMap;
        });
      }
      return next;
    });
  };

  const toggleSubtaskCheck = (tmplId: string, subtaskIndex: number) => {
    setSelectedSubtasks((prev) => {
      const nextMap = new Map(prev);
      const currentSet = new Set(nextMap.get(tmplId) || []);
      if (currentSet.has(subtaskIndex)) {
        currentSet.delete(subtaskIndex);
      } else {
        currentSet.add(subtaskIndex);
      }
      nextMap.set(tmplId, currentSet);
      return nextMap;
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGroupCollapse = (groupName: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  };

  const selectGroup = (tmpls: ParsedTemplate[]) => {
    const selectable = tmpls.filter(
      (t) => allowDuplicates || !existingTargetTitles.has(t.task_title.toLowerCase().trim())
    );
    const allSelected = selectable.every((t) => selectedTaskIds.has(t.id));

    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      selectable.forEach((t) => {
        if (allSelected) {
          next.delete(t.id);
        } else {
          next.add(t.id);
          // Set all subtasks checked
          setSelectedSubtasks((stMap) => {
            const nextMap = new Map(stMap);
            if (t.subtasks.length > 0) {
              nextMap.set(t.id, new Set(t.subtasks.map((_, i) => i)));
            }
            return nextMap;
          });
        }
      });
      return next;
    });
  };

  const selectAll = () => {
    const selectable = filteredTemplates.filter(
      (t) => allowDuplicates || !existingTargetTitles.has(t.task_title.toLowerCase().trim())
    );
    setSelectedTaskIds(new Set(selectable.map((t) => t.id)));
    // Check all subtasks
    const stMap = new Map<string, Set<number>>();
    selectable.forEach((t) => {
      if (t.subtasks.length > 0) {
        stMap.set(t.id, new Set(t.subtasks.map((_, i) => i)));
      }
    });
    setSelectedSubtasks(stMap);
  };

  const clearSelection = () => {
    setSelectedTaskIds(new Set());
    setSelectedSubtasks(new Map());
  };

  // Total estimate calculation
  const totalMinutes = useMemo(() => {
    let mins = 0;
    parsedTemplates.forEach((t) => {
      if (selectedTaskIds.has(t.id)) {
        mins += t.estimate_min;
      }
    });
    return mins;
  }, [selectedTaskIds, parsedTemplates]);

  const totalTimeFormatted = useMemo(() => {
    const hrs = Math.floor(totalMinutes / 60);
    const remaining = totalMinutes % 60;
    if (hrs > 0 && remaining > 0) return `${hrs}h ${remaining}m`;
    if (hrs > 0) return `${hrs}h`;
    return `${remaining}m`;
  }, [totalMinutes]);

  // Refresh from sheet handler
  const handleRefreshTemplates = async () => {
    await queryClient.invalidateQueries({ queryKey: ['Templates'] });
    showToast('Templates refreshed from Sheet');
  };

  // Perform Import
  const handleImport = async () => {
    if (selectedTaskIds.size === 0 || !targetDepartment) return;

    const toImport = parsedTemplates.filter((t) => selectedTaskIds.has(t.id));
    if (toImport.length === 0) return;

    const destStageId = selectedStageId || targetStages[0]?.id;
    if (!destStageId) {
      showToast('Please add at least one stage before importing.');
      return;
    }

    // If target sub-department was OFF and user confirmed turn on
    if (!isTargetDeptEnabled && turnOnTargetDept) {
      updateDepartment.mutate({
        id: targetDepartment.id,
        patch: { enabled: true },
      });
    }

    const targetDeptId = targetDepartment.id;
    const existingCount = allTasks.filter((t) => t.department_id === targetDeptId).length;
    const nowIso = new Date().toISOString();

    const newTasks: TaskItem[] = [];
    const newSubtasks: Subtask[] = [];

    toImport.forEach((tmpl, idx) => {
      const taskId = `task_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`;
      newTasks.push({
        id: taskId,
        project_id: projectId,
        department_id: targetDeptId,
        stage_id: destStageId,
        title: tmpl.task_title,
        description: tmpl.description || '',
        priority: tmpl.priority,
        estimate_min: tmpl.estimate_min,
        actual_min: 0,
        order: existingCount + idx + 1,
        source: 'template',
        template_id: tmpl.id,
        created_at: nowIso,
      });

      // Ticked subtasks
      const checkedSet = selectedSubtasks.get(tmpl.id) || new Set(tmpl.subtasks.map((_, i) => i));
      tmpl.subtasks.forEach((stTitle, stIdx) => {
        if (checkedSet.has(stIdx)) {
          newSubtasks.push({
            id: `sub_${Date.now()}_${idx}_${stIdx}_${Math.random().toString(36).substring(2, 6)}`,
            task_id: taskId,
            title: stTitle,
            done: false,
            order: stIdx + 1,
            created_at: nowIso,
          });
        }
      });
    });

    try {
      // Batch write tasks
      await batchUpdateTasks.mutateAsync(newTasks);

      // Batch write subtasks if any
      if (newSubtasks.length > 0) {
        await batchUpdateSubtasks.mutateAsync(newSubtasks);
      }

      onClose();

      // Toast with 10s undo action
      const taskCount = newTasks.length;
      showToast({
        message: `Imported ${taskCount} task${taskCount > 1 ? 's' : ''}`,
        actionLabel: 'Undo',
        duration: 10000,
        onAction: async () => {
          try {
            await batchDeleteTasks.mutateAsync(newTasks.map((t) => t.id));
            if (newSubtasks.length > 0) {
              await batchDeleteSubtasks.mutateAsync(newSubtasks.map((st) => st.id));
            }
            showToast('Import undone');
          } catch (err) {
            console.error('Failed to undo import', err);
            showToast('Failed to undo import');
          }
        },
      });
    } catch (err) {
      console.error('Import failed', err);
      showToast('Failed to import template tasks');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-[24px]"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 12 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="relative w-full max-w-[760px] max-h-[90vh] bg-[#F2F3EF] rounded-[30px] border border-black/[0.08] shadow-[0_20px_40px_-22px_rgba(20,25,30,0.28)] flex flex-col overflow-hidden text-graphite z-10"
        >
          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b border-black/[0.06] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-white/70 border border-black/[0.07] flex items-center justify-center text-graphite shrink-0 shadow-xs">
                <BookOpen size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-medium text-graphite leading-tight truncate">
                    Templates
                  </h2>
                  {malformedCount > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-coral/15 text-coral font-medium">
                      {malformedCount} skipped
                    </span>
                  )}
                </div>
                <p className="text-xs text-secondary truncate mt-0.5">
                  Importing to: <span className="font-medium text-graphite">{targetDepartment?.name || departmentName}</span>
                  {!isTargetDeptEnabled && (
                    <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-md bg-black/10 text-secondary font-semibold">
                      OFF
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleRefreshTemplates}
                disabled={isRefreshing}
                title="Refresh templates from Google Sheet"
                className="h-9 px-3 rounded-full bg-white/60 hover:bg-white border border-black/[0.07] flex items-center gap-1.5 text-xs text-secondary hover:text-graphite transition-all shadow-xs disabled:opacity-50"
              >
                <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white/60 hover:bg-white border border-black/[0.07] flex items-center justify-center text-graphite transition-all shadow-xs"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Sub-department Tabs (Parent Department View) */}
          {!isSubDeptView && subDepartments.length > 0 && (
            <div className="px-6 pt-3 pb-2 border-b border-black/[0.05] bg-[#EAECE6] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-xs text-secondary font-medium mr-1 shrink-0">Tab:</span>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('General');
                  setCustomBrowseSource('');
                }}
                className={`h-8 px-3.5 rounded-full text-xs font-normal transition-all border shrink-0 ${
                  activeTab === 'General' && !customBrowseSource
                    ? 'bg-nearblack text-white border-nearblack font-medium'
                    : 'bg-white/60 text-secondary border-black/[0.06] hover:bg-white'
                }`}
              >
                General
              </button>

              {subDepartments.map((sub) => {
                const isSubOff = sub.enabled === false || sub.enabled === 'false' || sub.enabled === 0;
                const isTabActive = activeTab.toLowerCase() === sub.name.toLowerCase() && !customBrowseSource;

                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(sub.name);
                      setCustomBrowseSource('');
                    }}
                    className={`h-8 px-3.5 rounded-full text-xs transition-all border flex items-center gap-1.5 shrink-0 ${
                      isTabActive
                        ? 'bg-nearblack text-white border-nearblack font-medium'
                        : 'bg-white/60 text-secondary border-black/[0.06] hover:bg-white'
                    }`}
                  >
                    <span>{sub.name}</span>
                    {isSubOff && (
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider ${
                          isTabActive
                            ? 'bg-white/20 text-white'
                            : 'bg-black/10 text-secondary'
                        }`}
                      >
                        OFF
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Sub-department OFF Warning Banner */}
          {!isTargetDeptEnabled && (
            <div className="px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/15 flex items-center justify-between gap-3 text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} className="text-amber-600 shrink-0" />
                <span>
                  <strong>{targetDepartment?.name}</strong> is currently turned OFF.
                </span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer font-medium select-none">
                <input
                  type="checkbox"
                  checked={turnOnTargetDept}
                  onChange={(e) => setTurnOnTargetDept(e.target.checked)}
                  className="rounded border-black/30 text-lime focus:ring-lime"
                />
                <span>Turn on and import</span>
              </label>
            </div>
          )}

          {/* Filter Bar: Search, Select All, Clear, & Browse Other Departments */}
          <div className="px-6 py-3 border-b border-black/[0.06] bg-white/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search templates or subtasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-full bg-white/80 border border-black/[0.07] text-graphite placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-nearblack/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-graphite"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Actions: Browse other + Select All / Clear */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Browse Other Departments Dropdown */}
              <select
                value={customBrowseSource}
                onChange={(e) => setCustomBrowseSource(e.target.value)}
                className="h-8 px-2.5 py-1 text-xs rounded-full bg-white/80 border border-black/[0.08] text-graphite focus:outline-none focus:ring-2 focus:ring-nearblack/20 max-w-[170px] truncate"
                title="Browse templates from other departments"
              >
                <option value="">Browse other...</option>
                {availableBrowseSources.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={selectAll}
                className="h-8 px-3 rounded-full bg-white/70 hover:bg-white border border-black/[0.07] text-xs font-normal text-secondary hover:text-graphite transition-colors"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="h-8 px-3 rounded-full bg-white/70 hover:bg-white border border-black/[0.07] text-xs font-normal text-secondary hover:text-graphite transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Modal Body: Empty State or Grouped Template List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            {allTemplates.length === 0 ? (
              // Empty Sheet State: Never auto-seed
              <div className="py-14 text-center max-w-sm mx-auto space-y-3">
                <div className="w-12 h-12 rounded-full bg-black/[0.04] border border-black/[0.06] flex items-center justify-center mx-auto text-secondary">
                  <BookOpen size={24} />
                </div>
                <h3 className="text-base font-medium text-graphite">
                  No templates in your Sheet yet
                </h3>
                <p className="text-xs text-secondary leading-relaxed">
                  Flowdesk reads task templates directly from your connected Google Sheet's <strong>Templates</strong> tab.
                  Fill rows in your spreadsheet or save tasks as a template from a department board.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleRefreshTemplates}
                    className="h-9 px-4 rounded-full bg-white border border-black/[0.08] text-xs font-medium text-graphite hover:bg-black/5 transition-all shadow-xs inline-flex items-center gap-1.5"
                  >
                    <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
                    <span>Refresh templates</span>
                  </button>
                </div>
              </div>
            ) : filteredTemplates.length === 0 ? (
              // No matching templates for this department/tab/search
              <div className="py-12 text-center max-w-sm mx-auto space-y-3">
                <AlertCircle size={28} className="text-secondary mx-auto opacity-50" />
                <p className="text-sm font-medium text-graphite">
                  No matching templates found
                </p>
                <p className="text-xs text-secondary">
                  {searchQuery
                    ? `No templates matching "${searchQuery}".`
                    : `No pre-made templates found for ${departmentName}${subName ? ` / ${subName}` : ''}.`}
                </p>
                <div className="pt-1">
                  <span className="text-xs text-secondary block mb-2">
                    Use the "Browse other..." dropdown above to pull templates from any department.
                  </span>
                </div>
              </div>
            ) : (
              // Render Grouped Templates
              Array.from(groupedTemplates.entries()).map(([groupName, tmpls]) => {
                const isCollapsed = collapsedGroups.has(groupName);
                const selectable = tmpls.filter(
                  (t) => allowDuplicates || !existingTargetTitles.has(t.task_title.toLowerCase().trim())
                );
                const allSelected =
                  selectable.length > 0 && selectable.every((t) => selectedTaskIds.has(t.id));

                return (
                  <div
                    key={groupName}
                    className="rounded-2xl border border-black/[0.06] bg-white/50 overflow-hidden"
                  >
                    {/* Collapsible Group Header */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-black/[0.02] border-b border-black/[0.04]">
                      <button
                        type="button"
                        onClick={() => toggleGroupCollapse(groupName)}
                        className="flex items-center gap-2 text-xs font-medium text-graphite hover:text-black transition-colors"
                      >
                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                        <span className="uppercase tracking-wider text-[11px] font-semibold text-secondary">
                          {groupName}
                        </span>
                        <span className="text-[11px] text-muted">
                          ({tmpls.length})
                        </span>
                      </button>

                      {selectable.length > 0 && (
                        <button
                          type="button"
                          onClick={() => selectGroup(tmpls)}
                          className="text-xs text-secondary hover:text-graphite font-normal px-2 py-0.5 rounded-md hover:bg-black/5 transition-colors"
                        >
                          {allSelected ? 'Deselect group' : 'Select group'}
                        </button>
                      )}
                    </div>

                    {/* Group Items */}
                    {!isCollapsed && (
                      <div className="p-2 space-y-1.5">
                        {tmpls.map((tmpl) => {
                          const isAlreadyAdded = existingTargetTitles.has(
                            tmpl.task_title.toLowerCase().trim()
                          );
                          const isDisabled = isAlreadyAdded && !allowDuplicates;
                          const isChecked = selectedTaskIds.has(tmpl.id);
                          const isExpanded = expandedTaskIds.has(tmpl.id);
                          const hasSubtasks = tmpl.subtasks.length > 0;
                          const hasDescription = Boolean(tmpl.description);
                          const checkedSubtaskIndices =
                            selectedSubtasks.get(tmpl.id) ||
                            new Set(tmpl.subtasks.map((_, i) => i));

                          return (
                            <div
                              key={tmpl.id}
                              className={`rounded-xl border transition-all ${
                                isDisabled
                                  ? 'bg-white/30 border-black/[0.04] opacity-55'
                                  : isChecked
                                  ? 'bg-white border-nearblack/25 shadow-xs'
                                  : 'bg-white/70 hover:bg-white border-black/[0.06]'
                              }`}
                            >
                              {/* Main Task Item Row */}
                              <div className="flex items-center justify-between gap-3 p-3">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  {/* Task Checkbox */}
                                  <button
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={() => !isDisabled && toggleTaskSelection(tmpl)}
                                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                                      isDisabled
                                        ? 'bg-black/10 border-transparent cursor-not-allowed'
                                        : isChecked
                                        ? 'bg-nearblack border-nearblack text-white cursor-pointer'
                                        : 'border-black/25 bg-white hover:border-black/40 cursor-pointer'
                                    }`}
                                  >
                                    {isDisabled ? (
                                      <Check size={11} className="text-muted" />
                                    ) : isChecked ? (
                                      <Check size={11} />
                                    ) : null}
                                  </button>

                                  {/* Task Title & Details */}
                                  <div
                                    className="min-w-0 flex-1 cursor-pointer"
                                    onClick={() => !isDisabled && toggleTaskSelection(tmpl)}
                                  >
                                    <p
                                      className={`text-sm font-normal text-graphite leading-snug truncate ${
                                        isDisabled ? 'line-through text-muted' : ''
                                      }`}
                                    >
                                      {tmpl.task_title}
                                    </p>
                                  </div>
                                </div>

                                {/* Badges & Expand Arrow */}
                                <div className="flex items-center gap-2 shrink-0">
                                  {isAlreadyAdded && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/[0.06] text-muted">
                                      Already added
                                    </span>
                                  )}

                                  {hasSubtasks && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/[0.05] text-secondary font-medium">
                                      {tmpl.subtasks.length} subtasks
                                    </span>
                                  )}

                                  <span className="text-xs text-muted flex items-center gap-1">
                                    <Clock size={11} /> {tmpl.estimate_min}m
                                  </span>

                                  {/* Priority Chip */}
                                  <span
                                    className="text-[10px] px-2 py-0.5 rounded-full font-medium capitalize"
                                    style={{
                                      backgroundColor:
                                        tmpl.priority === 'urgent'
                                          ? 'rgba(238, 141, 114, 0.2)'
                                          : tmpl.priority === 'high'
                                          ? 'rgba(245, 165, 36, 0.2)'
                                          : 'rgba(187, 216, 90, 0.25)',
                                      color:
                                        tmpl.priority === 'urgent'
                                          ? '#EE8D72'
                                          : tmpl.priority === 'high'
                                          ? '#B45309'
                                          : '#4D6B10',
                                    }}
                                  >
                                    {tmpl.priority}
                                  </span>

                                  {/* Expand Button for Subtasks / Description */}
                                  {(hasSubtasks || hasDescription) && (
                                    <button
                                      type="button"
                                      onClick={() => toggleExpand(tmpl.id)}
                                      className="p-1 rounded-md text-secondary hover:text-graphite hover:bg-black/5 transition-colors"
                                      title={isExpanded ? 'Collapse details' : 'Expand details'}
                                    >
                                      {isExpanded ? (
                                        <ChevronDown size={14} />
                                      ) : (
                                        <ChevronRight size={14} />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Expanded Description & Subtasks */}
                              {isExpanded && (hasSubtasks || hasDescription) && (
                                <div className="px-10 pb-3 pt-1 space-y-2 border-t border-black/[0.04] bg-black/[0.01]">
                                  {hasDescription && (
                                    <p className="text-xs text-secondary leading-relaxed">
                                      {tmpl.description}
                                    </p>
                                  )}

                                  {hasSubtasks && (
                                    <div className="space-y-1.5 pt-1">
                                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                                        Subtasks ({checkedSubtaskIndices.size} of {tmpl.subtasks.length} selected)
                                      </p>
                                      <div className="space-y-1">
                                        {tmpl.subtasks.map((stTitle, stIdx) => {
                                          const isSubChecked = checkedSubtaskIndices.has(stIdx);
                                          return (
                                            <div
                                              key={stIdx}
                                              onClick={() => !isDisabled && toggleSubtaskCheck(tmpl.id, stIdx)}
                                              className="flex items-center gap-2.5 py-1 px-2 rounded-lg hover:bg-black/[0.03] cursor-pointer text-xs text-graphite transition-colors select-none"
                                            >
                                              <input
                                                type="checkbox"
                                                checked={isSubChecked}
                                                disabled={isDisabled}
                                                readOnly
                                                className="w-3.5 h-3.5 rounded border-black/30 text-lime focus:ring-lime pointer-events-none"
                                              />
                                              <span className={isSubChecked ? '' : 'text-muted line-through'}>
                                                {stTitle}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-black/[0.07] bg-[#EDEFEA] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Stats & Allow Duplicates Toggle */}
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-xs text-secondary font-medium">
                {selectedTaskIds.size} task{selectedTaskIds.size === 1 ? '' : 's'} selected
                {selectedTaskIds.size > 0 && ` (${totalTimeFormatted} total)`}
              </span>

              <label className="flex items-center gap-1.5 text-xs text-secondary hover:text-graphite cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allowDuplicates}
                  onChange={(e) => setAllowDuplicates(e.target.checked)}
                  className="rounded border-black/30 text-lime focus:ring-lime"
                />
                <span>Allow duplicates</span>
              </label>
            </div>

            {/* Destination Stage & Action Buttons */}
            <div className="flex items-center gap-2.5 justify-end">
              {targetStages.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-secondary hidden md:inline">To:</span>
                  <select
                    value={selectedStageId}
                    onChange={(e) => setSelectedStageId(e.target.value)}
                    className="h-9 px-3 text-xs rounded-full bg-white/80 border border-black/[0.08] text-graphite focus:outline-none focus:ring-2 focus:ring-nearblack/20"
                  >
                    {targetStages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="h-9 px-4 rounded-full border border-black/[0.08] bg-white/60 text-xs font-normal text-secondary hover:text-graphite transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={selectedTaskIds.size === 0}
                onClick={handleImport}
                className="h-9 px-5 rounded-full bg-lime text-nearblack text-xs font-medium hover:bg-[var(--accent-lime-hover)] disabled:opacity-40 transition-all shadow-xs flex items-center gap-1.5"
              >
                <span>Import {selectedTaskIds.size > 0 ? selectedTaskIds.size : ''} tasks</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
