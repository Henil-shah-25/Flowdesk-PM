import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  X,
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  Layers,
  Building,
  Trash2,
  Zap,
  Check,
  Send,
  MessageSquare,
  ListTodo,
  User,
  ArrowLeft,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { useTaskDetail } from '../../hooks/useTaskDetail';
import {
  useTableData,
  useUpdateRecord,
  useDeleteRecord,
  useCreateRecord,
} from '../../hooks/useData';
import { useToast } from '../common/Toast';
import type { TaskItem, Subtask } from '../../types';
import { LinkedDevelopmentSection } from './LinkedDevelopmentSection';
import { ConnectSubProjectModal } from './ConnectSubProjectModal';

interface TaskDetailProps {
  taskId?: string | null;
  onClose?: () => void;
}

export const TaskDetail: React.FC<TaskDetailProps> = ({
  taskId: propTaskId,
  onClose: propOnClose,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { taskId: urlTaskId, closeTask: urlCloseTask } = useTaskDetail();
  const { showToast } = useToast();

  const [overrideTaskId, setOverrideTaskId] = useState<string | null>(null);
  const [parentMainTaskId, setParentMainTaskId] = useState<string | null>(null);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  const activeTaskId = overrideTaskId || propTaskId || urlTaskId;
  const handleClose = () => {
    setOverrideTaskId(null);
    setParentMainTaskId(null);
    if (propOnClose) propOnClose();
    if (urlCloseTask) urlCloseTask();
  };

  const { data: tasks = [] } = useTableData('Tasks');
  const { data: projects = [] } = useTableData('Projects');
  const { data: departments = [] } = useTableData('Departments');
  const { data: allStages = [] } = useTableData('Stages');
  const { data: allSubtasks = [] } = useTableData('Subtasks');
  const { data: allNotes = [] } = useTableData('Notes');
  const { data: members = [] } = useTableData('Members');

  const updateTask = useUpdateRecord('Tasks');
  const deleteTask = useDeleteRecord('Tasks');
  const createSubtask = useCreateRecord('Subtasks');
  const updateSubtask = useUpdateRecord('Subtasks');
  const deleteSubtask = useDeleteRecord('Subtasks');
  const createNote = useCreateRecord('Notes');
  const deleteNote = useDeleteRecord('Notes');

  const task = useMemo(() => {
    return tasks.find((t) => t.id === activeTaskId);
  }, [tasks, activeTaskId]);

  const project = useMemo(() => {
    return projects.find((p) => p.id === task?.project_id);
  }, [projects, task?.project_id]);

  const department = useMemo(() => {
    return departments.find((d) => d.id === task?.department_id);
  }, [departments, task?.department_id]);

  const stages = useMemo(() => {
    if (!task?.department_id) return [];
    return allStages
      .filter((s) => s.department_id === task.department_id)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [allStages, task?.department_id]);

  const subtasks = useMemo(() => {
    if (!activeTaskId) return [];
    return allSubtasks
      .filter((s) => s.task_id === activeTaskId)
      .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  }, [allSubtasks, activeTaskId]);

  const notes = useMemo(() => {
    if (!activeTaskId) return [];
    return allNotes
      .filter((n) => n.task_id === activeTaskId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [allNotes, activeTaskId]);

  // Local state for edits
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [estimateMin, setEstimateMin] = useState(45);
  const [isSaved, setIsSaved] = useState(true);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newNoteBody, setNewNoteBody] = useState('');
  const [isDoneAnimating, setIsDoneAnimating] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setEstimateMin(task.estimate_min || 45);
      setIsSaved(true);
    }
  }, [task?.id, task?.title, task?.description, task?.estimate_min]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeTaskId) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTaskId, handleClose]);

  // Autosave helper
  const triggerAutosave = (patch: Partial<TaskItem>) => {
    if (!activeTaskId) return;
    setIsSaved(false);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      updateTask.mutate(
        { id: activeTaskId, patch },
        {
          onSuccess: () => {
            setIsSaved(true);
          },
        }
      );
    }, 400);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    triggerAutosave({ title: val });
  };

  const handleDescriptionChange = (val: string) => {
    setDescription(val);
    triggerAutosave({ description: val });
  };

  const handleEstimateChange = (val: number) => {
    setEstimateMin(val);
    triggerAutosave({ estimate_min: val });
  };

  const handleStageChange = (stageId: string) => {
    if (!activeTaskId) return;
    const targetStage = stages.find((s) => s.id === stageId);
    const isDone = targetStage?.kind === 'done';
    updateTask.mutate({
      id: activeTaskId,
      patch: {
        stage_id: stageId,
        done_at: isDone ? new Date().toISOString() : '',
      },
    });
  };

  const handlePrioritySelect = (pri: TaskItem['priority']) => {
    if (!activeTaskId) return;
    updateTask.mutate({ id: activeTaskId, patch: { priority: pri } });
    setPriorityOpen(false);
  };

  const handleToggleDone = () => {
    if (!task) return;
    const isCurrentlyDone = Boolean(task.done_at);
    if (!isCurrentlyDone) {
      setIsDoneAnimating(true);
      const doneStage = stages.find((s) => s.kind === 'done');
      updateTask.mutate({
        id: task.id,
        patch: {
          done_at: new Date().toISOString(),
          stage_id: doneStage ? doneStage.id : task.stage_id,
        },
      });
      setTimeout(() => {
        setIsDoneAnimating(false);
        handleClose();
      }, 600);
    } else {
      const normalStage = stages.find((s) => s.kind === 'normal');
      updateTask.mutate({
        id: task.id,
        patch: {
          done_at: '',
          stage_id: normalStage ? normalStage.id : task.stage_id,
        },
      });
    }
  };

  // Subtask handlers
  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !activeTaskId) return;
    createSubtask.mutate({
      task_id: activeTaskId,
      title: newSubtaskTitle.trim(),
      done: false,
      order: subtasks.length + 1,
    });
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (subtask: Subtask) => {
    const isDone = Boolean(subtask.done);
    updateSubtask.mutate({
      id: subtask.id,
      patch: { done: !isDone },
    });
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    deleteSubtask.mutate(subtaskId);
  };

  // Notes handlers
  const handleAddNote = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newNoteBody.trim() || !activeTaskId) return;
    createNote.mutate({
      task_id: activeTaskId,
      body: newNoteBody.trim(),
    });
    setNewNoteBody('');
  };

  const handleDeleteNote = (noteId: string) => {
    deleteNote.mutate(noteId);
  };

  // Delete task with Undo Toast
  const handleDeleteTask = () => {
    if (!task) return;
    const deletedTask = { ...task };
    deleteTask.mutate(task.id, {
      onSuccess: () => {
        handleClose();
        showToast({
          message: `Deleted task "${deletedTask.title}"`,
          actionLabel: 'Undo',
          duration: 10000,
          onAction: () => {
            updateTask.mutate({ id: deletedTask.id, patch: deletedTask });
          },
        });
      },
    });
  };

  // Connected Sub-Project development handlers
  const handleConnectSubProject = (linkedProjectId: string, linkedTaskId?: string) => {
    if (!task) return;
    updateTask.mutate({
      id: task.id,
      patch: {
        linked_project_id: linkedProjectId,
        linked_task_id: linkedTaskId || '',
      },
    });
    showToast({ message: 'Connected to sub-project development pipeline.' });
  };

  const handleDisconnectSubProject = () => {
    if (!task) return;
    updateTask.mutate({
      id: task.id,
      patch: {
        linked_project_id: '',
        linked_task_id: '',
      },
    });
    showToast({ message: 'Disconnected linked sub-project.' });
  };

  const handleRefreshProgress = () => {
    queryClient.invalidateQueries({ queryKey: ['Tasks'] });
    queryClient.invalidateQueries({ queryKey: ['Projects'] });
    queryClient.invalidateQueries({ queryKey: ['Stages'] });
    queryClient.invalidateQueries({ queryKey: ['Settings'] });
    showToast({ message: 'Refreshed development progress.' });
  };

  const handleSelectPhase = (phaseTaskId: string) => {
    setParentMainTaskId(task?.id || null);
    setOverrideTaskId(phaseTaskId);
  };

  const handleMarkMainTaskDone = () => {
    if (!task) return;
    const doneStage = stages.find((s) => s.kind === 'done');
    updateTask.mutate({
      id: task.id,
      patch: {
        done_at: new Date().toISOString(),
        stage_id: doneStage ? doneStage.id : task.stage_id,
      },
    });
    showToast({ message: `Marked "${task.title}" as completed.` });
  };

  if (!activeTaskId || !task) return null;

  const isDone = Boolean(task.done_at);
  const currentStage = stages.find((s) => s.id === task.stage_id) || stages[0];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-[24px]"
        />

        {/* Modal Window: 560px on Desktop, Bottom Sheet on Mobile */}
        <motion.div
          ref={modalRef}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="relative w-full sm:max-w-[560px] max-h-[92vh] sm:max-h-[88vh] bg-[#F2F3EF] rounded-t-[32px] sm:rounded-[32px] border border-black/[0.08] shadow-[0_20px_40px_-22px_rgba(20,25,30,0.28)] flex flex-col overflow-hidden text-graphite z-10"
        >
          {/* Mobile Drag Handle */}
          <div className="sm:hidden flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-black/20" />
          </div>

          {/* Top Bar: Back button OR Project chip + Priority chip + Saved indicator + Close button */}
          <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-5 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              {parentMainTaskId && (
                <button
                  type="button"
                  onClick={() => {
                    setOverrideTaskId(null);
                    setParentMainTaskId(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-nearblack text-white text-xs font-medium hover:bg-charcoal transition-all shadow-sm mr-1"
                >
                  <ArrowLeft size={13} />
                  <span>Back to Main Task</span>
                </button>
              )}

              {project && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/60 border border-black/[0.06] text-xs font-normal">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: project.color || '#8DB3DE' }}
                  />
                  <span>{project.name}</span>
                </div>
              )}

              {/* Priority Selector Pill */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPriorityOpen(!priorityOpen)}
                  className="px-3 py-1 rounded-full text-xs font-medium capitalize border transition-all flex items-center gap-1"
                  style={{
                    backgroundColor:
                      task.priority === 'urgent'
                        ? 'rgba(238, 141, 114, 0.2)'
                        : task.priority === 'high'
                        ? 'rgba(245, 165, 36, 0.2)'
                        : 'rgba(187, 216, 90, 0.25)',
                    color:
                      task.priority === 'urgent'
                        ? '#EE8D72'
                        : task.priority === 'high'
                        ? '#B45309'
                        : '#4D6B10',
                    borderColor: 'rgba(27, 29, 31, 0.08)',
                  }}
                >
                  <span>{task.priority}</span>
                </button>

                {priorityOpen && (
                  <div className="absolute left-0 top-full mt-1.5 p-1 rounded-2xl bg-white border border-black/[0.08] shadow-lg z-20 flex flex-col gap-0.5 min-w-[110px]">
                    {(['low', 'medium', 'high', 'urgent'] as const).map((pri) => (
                      <button
                        key={pri}
                        type="button"
                        onClick={() => handlePrioritySelect(pri)}
                        className={`px-3 py-1.5 text-xs text-left rounded-xl capitalize transition-colors ${
                          task.priority === pri
                            ? 'bg-nearblack text-white font-medium'
                            : 'text-graphite hover:bg-black/[0.05]'
                        }`}
                      >
                        {pri}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Autosave Indicator */}
              <span className="text-[11px] text-muted ml-1 transition-opacity">
                {isSaved ? 'Saved' : 'Saving...'}
              </span>
            </div>

            {/* 44px Circular Close Button */}
            <button
              type="button"
              onClick={handleClose}
              className="w-11 h-11 rounded-full bg-white/60 hover:bg-white border border-black/[0.07] flex items-center justify-center text-graphite transition-all shadow-sm shrink-0"
              aria-label="Close task details"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-2 space-y-5 sm:space-y-6 pb-[calc(1.75rem+env(safe-area-inset-bottom,0px))]">
            {/* Title: 32px weight-500 */}
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Task title..."
                className="w-full text-[28px] sm:text-[32px] font-medium tracking-tight bg-transparent text-graphite placeholder:text-muted focus:outline-none border-b border-transparent focus:border-black/15 transition-colors leading-tight"
              />
            </div>

            {/* Description Textarea */}
            <div>
              <textarea
                value={description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="Add description or notes..."
                rows={2}
                className="w-full text-sm font-normal text-secondary placeholder:text-muted bg-transparent focus:bg-white/50 p-2.5 rounded-2xl border border-transparent focus:border-black/[0.08] focus:outline-none resize-none transition-all"
              />
            </div>

            {/* Stage Segmented Control with sliding pill */}
            {stages.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-secondary">Pipeline Stage</label>
                <div className="p-1 rounded-2xl bg-white/60 border border-black/[0.07] flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {stages.map((stg) => {
                    const isSelected = stg.id === currentStage?.id;
                    return (
                      <button
                        key={stg.id}
                        type="button"
                        onClick={() => handleStageChange(stg.id)}
                        className={`relative px-3.5 py-1.5 rounded-xl text-xs font-normal whitespace-nowrap transition-colors flex items-center gap-1.5 flex-1 justify-center ${
                          isSelected ? 'text-white font-medium' : 'text-secondary hover:text-graphite'
                        }`}
                      >
                        {isSelected && (
                          <motion.div
                            layoutId="task-stage-pill"
                            className="absolute inset-0 bg-nearblack rounded-xl shadow-sm"
                            transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                          />
                        )}
                        <span
                          className={`relative z-10 w-1.5 h-1.5 rounded-full ${
                            isSelected ? 'bg-lime' : 'bg-black/30'
                          }`}
                        />
                        <span className="relative z-10">{stg.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2x2 Info Tiles */}
            <div className="grid grid-cols-2 gap-3">
              {/* Tile 1: Department */}
              <div className="p-3.5 rounded-2xl bg-white/60 border border-black/[0.06] flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-black/[0.04] flex items-center justify-center shrink-0">
                  <Building size={16} className="text-secondary" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-muted">Department</div>
                  <div className="text-xs font-medium text-graphite truncate">
                    {department?.name || 'General'}
                  </div>
                </div>
              </div>

              {/* Tile 2: Due Date */}
              <div className="p-3.5 rounded-2xl bg-white/60 border border-black/[0.06] flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-black/[0.04] flex items-center justify-center shrink-0">
                  <Calendar size={16} className="text-secondary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] text-muted">Due Date</div>
                  <input
                    type="date"
                    value={task.due_date ? task.due_date.substring(0, 10) : ''}
                    onChange={(e) => triggerAutosave({ due_date: e.target.value })}
                    className="text-xs font-medium text-graphite bg-transparent focus:outline-none w-full cursor-pointer"
                  />
                </div>
              </div>

              {/* Tile 3: Estimate */}
              <div className="p-3.5 rounded-2xl bg-white/60 border border-black/[0.06] flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-black/[0.04] flex items-center justify-center shrink-0">
                  <Clock size={16} className="text-secondary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] text-muted">Estimate (min)</div>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    value={estimateMin}
                    onChange={(e) => handleEstimateChange(Number(e.target.value))}
                    className="text-xs font-medium text-graphite bg-transparent focus:outline-none w-16"
                  />
                </div>
              </div>

              {/* Tile 4: Project */}
              <div
                onClick={() => project && navigate(`/projects/${project.id}`)}
                className="p-3.5 rounded-2xl bg-white/60 border border-black/[0.06] flex items-center gap-3 cursor-pointer hover:bg-white/80 transition-colors"
              >
                <div className="w-8 h-8 rounded-xl bg-black/[0.04] flex items-center justify-center shrink-0">
                  <Layers size={16} className="text-secondary" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-muted">Project</div>
                  <div className="text-xs font-medium text-graphite truncate">
                    {project?.name || 'Workspace'}
                  </div>
                </div>
              </div>

              {/* Tile 5: Assignee */}
              <div className="p-3.5 rounded-2xl bg-white/60 border border-black/[0.06] flex items-center gap-3 col-span-2">
                <div className="w-8 h-8 rounded-xl bg-black/[0.04] flex items-center justify-center shrink-0">
                  <User size={16} className="text-secondary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] text-muted">Assignee</div>
                  <select
                    value={task.assignee_id || ''}
                    onChange={(e) => triggerAutosave({ assignee_id: e.target.value })}
                    className="text-xs font-medium text-graphite bg-transparent focus:outline-none w-full cursor-pointer truncate"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.role ? `(${m.role})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Linked Development Section (Connected Sub-Project Pipeline) */}
            <LinkedDevelopmentSection
              task={task}
              allProjects={projects}
              allTasks={tasks}
              allStages={allStages}
              allNotes={allNotes}
              onOpenConnectModal={() => setIsConnectModalOpen(true)}
              onDisconnect={handleDisconnectSubProject}
              onRefresh={handleRefreshProgress}
              onSelectPhase={handleSelectPhase}
              onMarkMainTaskDone={handleMarkMainTaskDone}
            />

            {/* Subtasks Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListTodo size={16} className="text-secondary" />
                  <h3 className="text-sm font-medium text-graphite">Subtasks</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-black/[0.05] text-secondary font-medium">
                    {subtasks.filter((s) => s.done).length}/{subtasks.length}
                  </span>
                </div>
              </div>

              {/* Subtask List */}
              <div className="space-y-1.5">
                {subtasks.map((st) => {
                  const done = Boolean(st.done);
                  return (
                    <div
                      key={st.id}
                      className="group flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-white/55 hover:bg-white border border-black/[0.05] transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleSubtask(st)}
                        className="shrink-0 focus:outline-none"
                      >
                        {done ? (
                          <CheckCircle2 size={20} className="text-lime" />
                        ) : (
                          <Circle size={20} className="text-secondary group-hover:text-graphite" />
                        )}
                      </button>

                      <span
                        className={`flex-1 text-sm text-graphite font-normal ${
                          done ? 'line-through text-secondary' : ''
                        }`}
                      >
                        {st.title}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleDeleteSubtask(st.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-coral transition-opacity"
                        aria-label="Delete subtask"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}

                {/* Add Subtask Input */}
                <form onSubmit={handleAddSubtask} className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Add a subtask..."
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    className="flex-1 px-4 py-2 text-xs sm:text-sm rounded-full bg-white/60 border border-black/[0.08] text-graphite placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-nearblack/20"
                  />
                  <button
                    type="submit"
                    disabled={!newSubtaskTitle.trim()}
                    className="px-4 py-2 rounded-full bg-nearblack text-white text-xs font-medium hover:bg-charcoal disabled:opacity-40 transition-all shrink-0"
                  >
                    Add
                  </button>
                </form>
              </div>
            </div>

            {/* Notes Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-secondary" />
                <h3 className="text-sm font-medium text-graphite">Notes & Updates</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-black/[0.05] text-secondary font-medium">
                  {notes.length}
                </span>
              </div>

              {/* Notes Timeline */}
              <div className="space-y-2">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="group p-3 rounded-2xl bg-white/55 border border-black/[0.05] space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] text-muted">
                      <span>{formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(note.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted hover:text-coral transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <p className="text-xs sm:text-sm text-graphite whitespace-pre-wrap font-normal">
                      {note.body}
                    </p>
                  </div>
                ))}

                {/* Add Note Input */}
                <div className="relative pt-1">
                  <textarea
                    rows={2}
                    placeholder="Write a note... (Ctrl+Enter to post)"
                    value={newNoteBody}
                    onChange={(e) => setNewNoteBody(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        handleAddNote();
                      }
                    }}
                    className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-2xl bg-white/60 border border-black/[0.08] text-graphite placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-nearblack/20 resize-none"
                  />
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      disabled={!newNoteBody.trim()}
                      onClick={() => handleAddNote()}
                      className="px-4 py-1.5 rounded-full bg-nearblack text-white text-xs font-medium hover:bg-charcoal disabled:opacity-40 transition-all flex items-center gap-1.5"
                    >
                      <Send size={12} />
                      <span>Post</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Bottom Bar */}
          <div className="px-6 py-4 border-t border-black/[0.07] bg-[#EDEFEA] flex items-center justify-between gap-3 shrink-0">
            {/* Trash button */}
            <button
              type="button"
              onClick={handleDeleteTask}
              className="w-10 h-10 rounded-full bg-white/60 hover:bg-coral/20 hover:text-coral border border-black/[0.07] flex items-center justify-center text-secondary transition-colors"
              title="Delete task"
            >
              <Trash2 size={16} />
            </button>

            <div className="flex items-center gap-2.5">
              {/* Focus on this button */}
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  navigate('/focus');
                }}
                className="h-10 px-4 rounded-full bg-white/70 hover:bg-white border border-black/[0.08] text-graphite text-xs sm:text-sm font-normal flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Zap size={14} className="text-secondary" />
                <span>Focus on this</span>
              </button>

              {/* Mark done / Reopen button */}
              <button
                type="button"
                onClick={handleToggleDone}
                className={`relative h-10 px-5 rounded-full text-xs sm:text-sm font-medium transition-all shadow-sm flex items-center gap-1.5 ${
                  isDone
                    ? 'bg-nearblack text-white hover:bg-charcoal'
                    : 'bg-lime text-nearblack hover:bg-[var(--accent-lime-hover)]'
                }`}
              >
                {isDoneAnimating && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 1 }}
                    animate={{ scale: 1.6, opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="absolute inset-0 rounded-full border-2 border-lime pointer-events-none"
                  />
                )}
                {isDone ? (
                  <>
                    <CheckCircle2 size={15} />
                    <span>Reopen</span>
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    <span>Mark done</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Connect Sub-Project Modal */}
      {isConnectModalOpen && task && (
        <ConnectSubProjectModal
          isOpen={isConnectModalOpen}
          onClose={() => setIsConnectModalOpen(false)}
          currentTask={task}
          projects={projects}
          tasks={tasks}
          stages={allStages}
          onConnect={handleConnectSubProject}
        />
      )}
    </AnimatePresence>
  );
};
