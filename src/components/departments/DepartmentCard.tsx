import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard, Toggle, ProgressBar, Chip, Modal } from '../ui';
import type { GlassVariant } from '../ui/GlassCard';
import type { Department, Stage, TaskItem } from '../../types';
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Layers,
  ArrowUpRight,
  MoreVertical,
  Pencil,
  Palette,
  RotateCcw,
  Trash2,
  BookOpen,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useUpdateRecord,
  useBatchDeleteRecord,
  useBatchUpdateRecord,
  useCreateRecord,
  useTableData,
} from '../../hooks/useData';
import { useToast } from '../common/Toast';

export interface DepartmentCardProps {
  projectId: string;
  department: Department;
  subDepartments: Department[];
  stages: Stage[];
  tasks: TaskItem[];
  onToggleDepartment: (deptId: string, enabled: boolean) => void;
  onToggleSubDepartment: (subDeptId: string, enabled: boolean) => void;
  onAddSubDepartment: (parentDept: Department) => void;
  variant?: GlassVariant;
}

const DEPT_COLORS = ['#5B5BF0', '#3BA7F5', '#2DBE8C', '#F5A524', '#F25F5C', '#8B5CF6', '#10B981', '#E9B494'];

function getDeptVariant(name: string, color?: string): GlassVariant {
  const n = name.toLowerCase();
  if (n.includes('tech') || n.includes('dev') || color === '#CDD6A6') return 'sage';
  if (n.includes('market') || n.includes('sales') || color === '#BFD3E6') return 'sky';
  if (n.includes('hr') || n.includes('people') || color === '#F2D5C4') return 'peach';
  if (n.includes('fin') || color === '#F5A524') return 'peach';
  return 'default';
}

export const DepartmentCard: React.FC<DepartmentCardProps> = ({
  projectId,
  department,
  subDepartments,
  stages,
  tasks,
  onToggleDepartment,
  onToggleSubDepartment,
  onAddSubDepartment,
  variant,
}) => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const updateDept = useUpdateRecord('Departments');
  const batchDeleteDepts = useBatchDeleteRecord('Departments');
  const batchDeleteStages = useBatchDeleteRecord('Stages');
  const batchDeleteTasks = useBatchDeleteRecord('Tasks');
  const batchUpdateDepts = useBatchUpdateRecord('Departments');
  const batchUpdateStages = useBatchUpdateRecord('Stages');
  const batchUpdateTasks = useBatchUpdateRecord('Tasks');
  const createTemplate = useCreateRecord('Templates');

  const { data: allDepartments = [] } = useTableData('Departments');
  const { data: allSubtasks = [] } = useTableData('Subtasks');

  const isEnabled = Boolean(
    department.enabled === true ||
    department.enabled === 'true' ||
    department.enabled === 1 ||
    department.enabled === '1'
  );

  const [isExpanded, setIsExpanded] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [subDeptMenuOpen, setSubDeptMenuOpen] = useState<string | null>(null);

  // Modals state
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [targetDeptForAction, setTargetDeptForAction] = useState<Department>(department);
  const [newName, setNewName] = useState(department.name);

  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  const [clearTasksModalOpen, setClearTasksModalOpen] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteOption, setDeleteOption] = useState<'everything' | 'move'>('everything');
  const [moveToDeptId, setMoveToDeptId] = useState<string>('');

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setSubDeptMenuOpen(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // ONLY this department's own stages, in order
  const deptStages = stages
    .filter((s) => s.department_id === department.id)
    .sort((a, b) => a.order - b.order);

  const displayStages = deptStages.length > 0 ? deptStages : [
    { id: `stg_${department.id}_started`, department_id: department.id, name: 'Started', kind: 'normal' as const, order: 1 },
    { id: `stg_${department.id}_middle`, department_id: department.id, name: 'Middle', kind: 'normal' as const, order: 2 },
    { id: `stg_${department.id}_ended`, department_id: department.id, name: 'Ended', kind: 'done' as const, order: 3 },
    { id: `stg_${department.id}_blockade`, department_id: department.id, name: 'Blockade', kind: 'blocked' as const, order: 4 },
  ];

  // Tasks belonging directly to this department
  const deptTasks = tasks.filter((t) => t.department_id === department.id);
  const totalTasks = deptTasks.length;

  const doneStageIds = new Set(displayStages.filter((s) => s.kind === 'done').map((s) => s.id));
  const completedTasks = deptTasks.filter((t) => (t.stage_id && doneStageIds.has(t.stage_id)) || Boolean(t.done_at)).length;
  const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const stageCounts = displayStages.map((stg) => {
    const count = deptTasks.filter((t) => t.stage_id === stg.id).length;
    return { name: stg.name, count, kind: stg.kind };
  });

  const cardVariant = variant || getDeptVariant(department.name, department.color);

  const handleCardClick = () => {
    navigate(`/projects/${projectId}/d/${department.id}`);
  };

  const handleSubCardClick = (subId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/projects/${projectId}/d/${subId}`);
  };

  // Other available departments in this project to move tasks to
  const availableMoveTargets = useMemo(() => {
    return allDepartments.filter(
      (d) => d.project_id === projectId && d.id !== targetDeptForAction.id && d.parent_id !== targetDeptForAction.id
    );
  }, [allDepartments, projectId, targetDeptForAction.id]);

  // Rename action
  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    updateDept.mutate({ id: targetDeptForAction.id, patch: { name: newName.trim() } });
    showToast(`Renamed to "${newName.trim()}"`);
    setRenameModalOpen(false);
  };

  // Change color action
  const handleColorSelect = (c: string) => {
    updateDept.mutate({ id: targetDeptForAction.id, patch: { color: c } });
    setColorPickerOpen(false);
    showToast(`Updated color`);
  };

  // Clear tasks action
  const handleClearTasks = async () => {
    const targetDept = targetDeptForAction;
    const tasksToClear = tasks.filter((t) => t.department_id === targetDept.id);
    if (tasksToClear.length === 0) {
      setClearTasksModalOpen(false);
      showToast('No tasks to clear');
      return;
    }

    const taskIds = tasksToClear.map((t) => t.id);
    await batchDeleteTasks.mutateAsync(taskIds);
    setClearTasksModalOpen(false);

    showToast({
      message: `Cleared ${tasksToClear.length} tasks from ${targetDept.name}`,
      actionLabel: 'Undo',
      duration: 10000,
      onAction: () => {
        batchUpdateTasks.mutate(tasksToClear);
      },
    });
  };

  // Save tasks as template
  const handleSaveTasksAsTemplate = async (targetDept: Department) => {
    const targetTasks = tasks.filter((t) => t.department_id === targetDept.id);
    if (targetTasks.length === 0) {
      showToast('No tasks to save as template');
      return;
    }

    const isSub = Boolean(targetDept.parent_id);
    const parentDept = isSub ? allDepartments.find((d) => d.id === targetDept.parent_id) : targetDept;
    const deptName = parentDept?.name || targetDept.name;
    const subName = isSub ? targetDept.name : '';

    for (let i = 0; i < targetTasks.length; i++) {
      const t = targetTasks[i];
      const taskSubtasks = allSubtasks
        .filter((s) => s.task_id === t.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((s) => s.title.trim())
        .filter(Boolean);
      const subtaskStr = taskSubtasks.join(' | ');

      await createTemplate.mutateAsync({
        department_name: deptName,
        sub_name: subName,
        group_name: 'Custom',
        task_title: t.title,
        description: t.description || '',
        priority: t.priority,
        estimate_min: t.estimate_min || 45,
        subtasks: subtaskStr,
        order: i + 1,
      });
    }

    showToast(`Saved ${targetTasks.length} task${targetTasks.length > 1 ? 's' : ''} as template`);
  };

  // Delete department action
  const handleDeleteDepartment = async () => {
    const targetDept = targetDeptForAction;
    const isParent = !targetDept.parent_id;

    // Sub-departments to remove if parent
    const subDeptsToDelete = isParent
      ? allDepartments.filter((d) => d.parent_id === targetDept.id)
      : [];
    const allDeptIds = [targetDept.id, ...subDeptsToDelete.map((d) => d.id)];

    // Stages to delete
    const stagesToDelete = stages.filter((s) => allDeptIds.includes(s.department_id));
    const stageIds = stagesToDelete.map((s) => s.id);

    // Tasks
    const tasksAffected = tasks.filter((t) => allDeptIds.includes(t.department_id));
    const taskIds = tasksAffected.map((t) => t.id);

    // Backup for undo
    const backupDepts = [targetDept, ...subDeptsToDelete];
    const backupStages = stagesToDelete;
    const backupTasks = tasksAffected;

    if (deleteOption === 'move' && moveToDeptId) {
      // Reassign tasks to moveToDeptId
      const movedTasks = tasksAffected.map((t) => ({ ...t, department_id: moveToDeptId }));
      await batchUpdateTasks.mutateAsync(movedTasks);
      await batchDeleteStages.mutateAsync(stageIds);
      await batchDeleteDepts.mutateAsync(allDeptIds);
    } else {
      // Delete everything
      if (taskIds.length > 0) await batchDeleteTasks.mutateAsync(taskIds);
      if (stageIds.length > 0) await batchDeleteStages.mutateAsync(stageIds);
      await batchDeleteDepts.mutateAsync(allDeptIds);
    }

    setDeleteModalOpen(false);

    showToast({
      message: `Deleted "${targetDept.name}"`,
      actionLabel: 'Undo',
      duration: 10000,
      onAction: () => {
        batchUpdateDepts.mutate(backupDepts);
        if (backupStages.length > 0) batchUpdateStages.mutate(backupStages);
        if (backupTasks.length > 0) batchUpdateTasks.mutate(backupTasks);
      },
    });
  };

  // Count metrics for delete dialog
  const isTargetParent = !targetDeptForAction.parent_id;
  const targetSubDepts = isTargetParent
    ? allDepartments.filter((d) => d.parent_id === targetDeptForAction.id)
    : [];
  const targetAllDeptIds = [targetDeptForAction.id, ...targetSubDepts.map((d) => d.id)];
  const targetStagesCount = stages.filter((s) => targetAllDeptIds.includes(s.department_id)).length;
  const targetTasksCount = tasks.filter((t) => targetAllDeptIds.includes(t.department_id)).length;

  return (
    <>
      <GlassCard
        variant={isEnabled ? cardVariant : 'default'}
        onClick={handleCardClick}
        interactive
        className={`group transition-all duration-300 relative ${
          !isEnabled ? 'opacity-50 grayscale-[15%]' : ''
        }`}
      >
        {/* Header: Name, Badge, "Open pipeline" arrow hint, Menu, and Toggle */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{
                backgroundColor: isEnabled ? '#BBD85A' : 'rgba(27, 29, 31, 0.3)',
              }}
            />
            <h3 className="font-normal text-lg sm:text-xl truncate text-graphite tracking-tight group-hover:text-black transition-colors">
              {department.name}
            </h3>
            <Chip
              label={isEnabled ? `${totalTasks} tasks` : 'OFF'}
              accent="neutral"
              size="sm"
              dot={false}
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            {/* Visible "Open pipeline" arrow button */}
            <button
              type="button"
              onClick={handleCardClick}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/50 hover:bg-white text-[11px] text-graphite border border-white/70 shadow-sm transition-all"
              title="Open pipeline board"
            >
              <span>Pipeline</span>
              <ArrowUpRight size={13} />
            </button>

            {isEnabled && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-full text-secondary hover:text-graphite hover:bg-black/5 transition-colors"
                aria-label={isExpanded ? 'Collapse department' : 'Expand department'}
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            )}

            {/* Department Actions "..." Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setTargetDeptForAction(department);
                  setNewName(department.name);
                  setMenuOpen(!menuOpen);
                }}
                className="p-1.5 rounded-full text-secondary hover:text-graphite hover:bg-black/5 transition-colors"
                aria-label="Department actions"
              >
                <MoreVertical size={16} />
              </button>

              {menuOpen && (
                <div
                  ref={menuRef}
                  className="absolute right-0 top-full mt-1.5 w-48 p-1.5 rounded-2xl bg-white border border-black/[0.08] shadow-lg z-30 flex flex-col gap-0.5 text-xs text-graphite"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setRenameModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-black/[0.05] transition-colors text-left"
                  >
                    <Pencil size={13} className="text-secondary" />
                    <span>Rename</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setColorPickerOpen(true);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-black/[0.05] transition-colors text-left"
                  >
                    <Palette size={13} className="text-secondary" />
                    <span>Change color</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      handleSaveTasksAsTemplate(department);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-black/[0.05] transition-colors text-left"
                  >
                    <BookOpen size={13} className="text-secondary" />
                    <span>Save tasks as template</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setClearTasksModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-black/[0.05] transition-colors text-left"
                  >
                    <RotateCcw size={13} className="text-secondary" />
                    <span>Clear tasks</span>
                  </button>

                  <div className="h-px bg-black/[0.06] my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setDeleteModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-coral/10 text-coral transition-colors text-left font-medium"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>

            {/* Compact Pill ON/OFF Switch */}
            <Toggle
              checked={isEnabled}
              onChange={(checked) => onToggleDepartment(department.id, checked)}
              size="sm"
            />
          </div>
        </div>

        {/* Collapsible Content */}
        <AnimatePresence initial={false}>
          {isEnabled && isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="overflow-hidden"
            >
              {/* Mini Progress Board showing ONLY this department's stages */}
              <div className="mt-5 p-3 rounded-2xl bg-white/50 border border-white/60 space-y-2">
                <div className="flex items-center justify-between text-xs text-secondary px-1">
                  <span>Department Pipeline</span>
                  <span className="font-medium text-graphite">{Math.round(progressPercent)}%</span>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {stageCounts.map((sc, i) => (
                    <div
                      key={i}
                      className="flex-1 min-w-[70px] p-2 rounded-xl bg-white/70 border border-black/[0.04] text-center"
                    >
                      <div className="text-[10px] text-secondary truncate">{sc.name}</div>
                      <div className="text-sm font-semibold text-graphite mt-0.5">{sc.count}</div>
                    </div>
                  ))}
                </div>

                <ProgressBar value={progressPercent} accent="lime" size="sm" />
              </div>

              {/* Sub-departments Section */}
              <div className="mt-4 pt-3 border-t border-black/[0.05]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs text-secondary font-normal">
                    <Layers size={13} className="text-secondary" />
                    <span>Sub-departments ({subDepartments.length})</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddSubDepartment(department);
                    }}
                    className="inline-flex items-center gap-1 text-xs text-graphite hover:underline font-medium"
                  >
                    <Plus size={12} />
                    <span>Add Sub-dept</span>
                  </button>
                </div>

                {subDepartments.length === 0 ? (
                  <p className="text-xs text-secondary/70 italic py-1">
                    No sub-departments configured yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2">
                    {subDepartments.map((sub) => {
                      const isSubEnabled = Boolean(
                        sub.enabled === true ||
                        sub.enabled === 'true' ||
                        sub.enabled === 1 ||
                        sub.enabled === '1'
                      );

                      const subTasksCount = tasks.filter((t) => t.department_id === sub.id).length;

                      return (
                        <div
                          key={sub.id}
                          onClick={(e) => handleSubCardClick(sub.id, e)}
                          className={`relative px-3.5 py-2.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer group/sub ${
                            isSubEnabled && isEnabled
                              ? 'bg-white/55 hover:bg-white/80 border-white/60 shadow-sm'
                              : 'bg-white/20 border-black/[0.03] opacity-40'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-1">
                              <p className="text-xs text-graphite truncate font-normal group-hover/sub:text-black">
                                {sub.name}
                              </p>
                              <ArrowUpRight size={11} className="text-secondary group-hover/sub:text-graphite shrink-0" />
                            </div>
                            <span className="text-[11px] text-secondary">
                              {subTasksCount} task{subTasksCount !== 1 ? 's' : ''}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {/* Sub-department "..." Menu button */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => {
                                  setTargetDeptForAction(sub);
                                  setNewName(sub.name);
                                  setSubDeptMenuOpen(subDeptMenuOpen === sub.id ? null : sub.id);
                                }}
                                className="p-1 rounded-full text-secondary hover:text-graphite hover:bg-black/5"
                              >
                                <MoreVertical size={13} />
                              </button>

                              {subDeptMenuOpen === sub.id && (
                                <div className="absolute right-0 top-full mt-1 w-44 p-1.5 rounded-2xl bg-white border border-black/[0.08] shadow-lg z-30 flex flex-col gap-0.5 text-xs text-graphite">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSubDeptMenuOpen(null);
                                      setRenameModalOpen(true);
                                    }}
                                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-black/[0.05] text-left"
                                  >
                                    <Pencil size={12} className="text-secondary" />
                                    <span>Rename</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSubDeptMenuOpen(null);
                                      handleSaveTasksAsTemplate(sub);
                                    }}
                                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-black/[0.05] text-left"
                                  >
                                    <BookOpen size={12} className="text-secondary" />
                                    <span>Save as template</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSubDeptMenuOpen(null);
                                      setClearTasksModalOpen(true);
                                    }}
                                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-black/[0.05] text-left"
                                  >
                                    <RotateCcw size={12} className="text-secondary" />
                                    <span>Clear tasks</span>
                                  </button>
                                  <div className="h-px bg-black/[0.06] my-0.5" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSubDeptMenuOpen(null);
                                      setDeleteModalOpen(true);
                                    }}
                                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-coral/10 text-coral text-left font-medium"
                                  >
                                    <Trash2 size={12} />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              )}
                            </div>

                            <Toggle
                              checked={isSubEnabled}
                              disabled={!isEnabled}
                              onChange={(checked) => onToggleSubDepartment(sub.id, checked)}
                              size="sm"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>

      {/* Rename Modal */}
      <Modal
        isOpen={renameModalOpen}
        onClose={() => setRenameModalOpen(false)}
        title={`Rename ${targetDeptForAction.parent_id ? 'Sub-department' : 'Department'}`}
        description="Enter a new name."
      >
        <form onSubmit={handleRenameSubmit} className="space-y-4">
          <input
            type="text"
            required
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full px-4 py-2.5 text-sm rounded-full bg-white/60 border border-black/[0.08] text-graphite focus:outline-none focus:ring-2 focus:ring-nearblack/20"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setRenameModalOpen(false)}
              className="h-10 px-4 rounded-full text-xs text-secondary hover:text-graphite bg-white/40 border border-black/[0.07]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-5 rounded-full text-xs font-medium bg-lime text-nearblack hover:bg-[var(--accent-lime-hover)]"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>

      {/* Change Color Modal */}
      <Modal
        isOpen={colorPickerOpen}
        onClose={() => setColorPickerOpen(false)}
        title="Department Color"
        description="Choose a theme color."
      >
        <div className="flex items-center justify-between gap-2 py-4">
          {DEPT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => handleColorSelect(c)}
              style={{ backgroundColor: c }}
              className="w-9 h-9 rounded-full border border-black/10 hover:scale-110 transition-transform shadow-xs"
            />
          ))}
        </div>
      </Modal>

      {/* Clear Tasks Confirmation Modal */}
      <Modal
        isOpen={clearTasksModalOpen}
        onClose={() => setClearTasksModalOpen(false)}
        title={`Clear tasks from ${targetDeptForAction.name}?`}
        description={`This will delete all tasks in "${targetDeptForAction.name}". You will have 10 seconds to undo.`}
      >
        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={() => setClearTasksModalOpen(false)}
            className="h-10 px-4 rounded-full text-xs text-secondary hover:text-graphite bg-white/40 border border-black/[0.07]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleClearTasks}
            className="h-10 px-5 rounded-full text-xs font-medium bg-coral text-white hover:bg-coral/90 shadow-sm"
          >
            Clear tasks
          </button>
        </div>
      </Modal>

      {/* Delete Department Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title={`Delete "${targetDeptForAction.name}"?`}
        description={`This will remove: ${
          isTargetParent && targetSubDepts.length > 0 ? `${targetSubDepts.length} sub-departments, ` : ''
        }${targetStagesCount} stages, and ${targetTasksCount} tasks.`}
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-xs font-medium text-secondary">Choose how to handle tasks:</label>
            <div className="space-y-2">
              <label
                className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                  deleteOption === 'everything'
                    ? 'bg-white border-nearblack/30 shadow-xs'
                    : 'bg-white/40 border-black/[0.06]'
                }`}
              >
                <input
                  type="radio"
                  name="deleteOption"
                  checked={deleteOption === 'everything'}
                  onChange={() => setDeleteOption('everything')}
                  className="accent-nearblack"
                />
                <div className="text-xs">
                  <p className="font-medium text-graphite">Delete everything</p>
                  <p className="text-secondary text-[11px]">Permanently remove department and all its tasks</p>
                </div>
              </label>

              {availableMoveTargets.length > 0 && targetTasksCount > 0 && (
                <label
                  className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                    deleteOption === 'move'
                      ? 'bg-white border-nearblack/30 shadow-xs'
                      : 'bg-white/40 border-black/[0.06]'
                  }`}
                >
                  <input
                    type="radio"
                    name="deleteOption"
                    checked={deleteOption === 'move'}
                    onChange={() => setDeleteOption('move')}
                    className="accent-nearblack mt-0.5"
                  />
                  <div className="text-xs flex-1">
                    <p className="font-medium text-graphite">Move tasks to another department</p>
                    <p className="text-secondary text-[11px] mb-2">Preserve the {targetTasksCount} tasks</p>
                    {deleteOption === 'move' && (
                      <select
                        value={moveToDeptId}
                        onChange={(e) => setMoveToDeptId(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-black/[0.1] text-graphite focus:outline-none"
                      >
                        <option value="">Select destination department...</option>
                        {availableMoveTargets.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} {d.parent_id ? '(Sub-dept)' : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </label>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-black/[0.06]">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="h-10 px-4 rounded-full text-xs text-secondary hover:text-graphite bg-white/40 border border-black/[0.07]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteOption === 'move' && !moveToDeptId}
              onClick={handleDeleteDepartment}
              className="h-10 px-5 rounded-full text-xs font-medium bg-coral text-white hover:bg-coral/90 disabled:opacity-40 shadow-sm"
            >
              Delete department
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
