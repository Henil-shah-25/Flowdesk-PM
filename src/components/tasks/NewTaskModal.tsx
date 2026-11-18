import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Modal, Button } from '../ui';
import { useTableData } from '../../hooks/useData';
import { useToast } from '../common/Toast';
import { createTaskWithContext } from '../../services/taskService';
import type { TaskItem } from '../../types';
import { Check, Calendar, Clock, User, Layers, Tag } from 'lucide-react';

export interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectId?: string;
  defaultDepartmentId?: string;
  defaultStageId?: string;
  defaultAssigneeId?: string;
  defaultDueDate?: string;
  onSuccess?: (created: TaskItem) => void;
}

const PRIORITY_OPTIONS: Array<{
  id: TaskItem['priority'];
  label: string;
  color: string;
}> = [
  { id: 'low', label: 'Low', color: '#8DB3DE' },
  { id: 'medium', label: 'Medium', color: '#BBD85A' },
  { id: 'high', label: 'High', color: '#EE8D72' },
  { id: 'urgent', label: 'Urgent', color: '#E15554' },
];

const ESTIMATE_PRESETS = [15, 30, 45, 60, 90, 120];

export const NewTaskModal: React.FC<NewTaskModalProps> = ({
  isOpen,
  onClose,
  defaultProjectId,
  defaultDepartmentId,
  defaultStageId,
  defaultAssigneeId,
  defaultDueDate,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: projects = [] } = useTableData('Projects');
  const { data: departments = [] } = useTableData('Departments');
  const { data: stages = [] } = useTableData('Stages');
  const { data: members = [] } = useTableData('Members');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [stageId, setStageId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState<TaskItem['priority']>('medium');
  const [estimateMin, setEstimateMin] = useState<number>(30);
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize or reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setEstimateMin(30);
      setDueDate(defaultDueDate || '');
      setAssigneeId(defaultAssigneeId || '');

      // Resolve valid project
      const validProj =
        projects.find((p) => p.id === defaultProjectId && !p.archived) ||
        projects.find((p) => !p.archived) ||
        projects[0];
      const pId = validProj ? validProj.id : '';
      setProjectId(pId);

      // Resolve valid department for project
      const projDepts = departments.filter((d) => d.project_id === pId);
      const validDept =
        projDepts.find((d) => d.id === defaultDepartmentId) ||
        projDepts.find((d) => d.enabled !== false && d.enabled !== 'false') ||
        projDepts[0];
      const dId = validDept ? validDept.id : '';
      setDepartmentId(dId);

      // Resolve valid stage for department
      const deptStages = stages
        .filter((s) => s.department_id === dId)
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
      const validStage =
        deptStages.find((s) => s.id === defaultStageId) ||
        deptStages.find((s) => s.name.toLowerCase().includes('start') || s.kind === 'normal') ||
        deptStages[0];
      setStageId(validStage ? validStage.id : '');
    }
  }, [
    isOpen,
    defaultProjectId,
    defaultDepartmentId,
    defaultStageId,
    defaultAssigneeId,
    defaultDueDate,
    projects,
    departments,
    stages,
  ]);

  // Available departments for currently selected project
  const availableDepartments = useMemo(() => {
    if (!projectId) return [];
    return departments.filter((d) => d.project_id === projectId);
  }, [departments, projectId]);

  // Available stages for currently selected department
  const availableStages = useMemo(() => {
    if (!departmentId) return [];
    return stages
      .filter((s) => s.department_id === departmentId)
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  }, [stages, departmentId]);

  // When project changes, update department and stage
  const handleProjectChange = (newProjId: string) => {
    setProjectId(newProjId);
    const depts = departments.filter((d) => d.project_id === newProjId);
    const firstDept = depts.find((d) => d.enabled !== false && d.enabled !== 'false') || depts[0];
    const newDeptId = firstDept ? firstDept.id : '';
    setDepartmentId(newDeptId);

    const stgs = stages.filter((s) => s.department_id === newDeptId);
    const firstStg =
      stgs.find((s) => s.name.toLowerCase().includes('start') || s.kind === 'normal') || stgs[0];
    setStageId(firstStg ? firstStg.id : '');
  };

  // When department changes, update stage
  const handleDepartmentChange = (newDeptId: string) => {
    setDepartmentId(newDeptId);
    const stgs = stages.filter((s) => s.department_id === newDeptId);
    const firstStg =
      stgs.find((s) => s.name.toLowerCase().includes('start') || s.kind === 'normal') || stgs[0];
    setStageId(firstStg ? firstStg.id : '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await createTaskWithContext(
        {
          title: title.trim(),
          description: description.trim(),
          projectId,
          departmentId,
          stageId,
          assigneeId,
          priority,
          estimateMin,
          dueDate: dueDate ? new Date(dueDate).toISOString() : '',
        },
        queryClient
      );

      showToast({ message: `Created task "${title.trim()}".` });
      if (onSuccess) onSuccess(created);
      onClose();
    } catch (err) {
      console.error('Task creation error:', err);
      showToast({ message: 'Task created locally.' });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Task"
      description="Add a task with guaranteed pipeline & dashboard visibility."
    >
      {projects.length === 0 ? (
        <div className="py-6 text-center space-y-4">
          <p className="text-xs sm:text-sm text-secondary">
            No active projects found. Please create a project first before adding tasks to a pipeline.
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-full text-xs text-secondary hover:text-graphite border border-black/[0.08] bg-white/40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/projects');
              }}
              className="h-9 px-4 rounded-full text-xs font-medium bg-lime text-nearblack hover:bg-[var(--accent-lime-hover)] shadow-xs transition-all"
            >
              Create Project
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Task Title */}
        <div>
          <label className="block text-xs font-medium text-graphite mb-1.5">
            Task Title <span className="text-coral">*</span>
          </label>
          <input
            type="text"
            required
            autoFocus
            placeholder="e.g., Design user onboarding wireframes"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2.5 text-sm rounded-2xl bg-white/70 border border-black/[0.08] text-graphite placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-nearblack/20 focus:bg-white transition-all shadow-xs"
          />
        </div>

        {/* Project & Department Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-graphite mb-1.5 flex items-center gap-1.5">
              <Layers size={13} className="text-secondary" />
              <span>Project</span>
            </label>
            <select
              value={projectId}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/70 border border-black/[0.08] text-graphite focus:outline-none focus:ring-2 focus:ring-nearblack/20 focus:bg-white transition-all"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.archived ? '(Archived)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-graphite mb-1.5 flex items-center gap-1.5">
              <Tag size={13} className="text-secondary" />
              <span>Department</span>
            </label>
            <select
              value={departmentId}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/70 border border-black/[0.08] text-graphite focus:outline-none focus:ring-2 focus:ring-nearblack/20 focus:bg-white transition-all"
            >
              {availableDepartments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
              {availableDepartments.length === 0 && (
                <option value="">No departments available</option>
              )}
            </select>
          </div>
        </div>

        {/* Stage & Assignee Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-graphite mb-1.5">
              Initial Stage / Status
            </label>
            <select
              value={stageId}
              onChange={(e) => setStageId(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/70 border border-black/[0.08] text-graphite focus:outline-none focus:ring-2 focus:ring-nearblack/20 focus:bg-white transition-all"
            >
              {availableStages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.kind})
                </option>
              ))}
              {availableStages.length === 0 && (
                <option value="">Default Stage</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-graphite mb-1.5 flex items-center gap-1.5">
              <User size={13} className="text-secondary" />
              <span>Assignee</span>
            </label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/70 border border-black/[0.08] text-graphite focus:outline-none focus:ring-2 focus:ring-nearblack/20 focus:bg-white transition-all"
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

        {/* Priority Segmented Control */}
        <div>
          <label className="block text-xs font-medium text-graphite mb-1.5">Priority</label>
          <div className="grid grid-cols-4 gap-2">
            {PRIORITY_OPTIONS.map((opt) => {
              const isSelected = priority === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPriority(opt.id)}
                  className={`py-2 px-2 rounded-xl text-xs font-normal transition-all border flex items-center justify-center gap-1.5 ${
                    isSelected
                      ? 'bg-nearblack text-white border-nearblack font-medium shadow-xs'
                      : 'bg-white/50 text-secondary border-black/[0.06] hover:bg-white hover:text-graphite'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: opt.color }}
                  />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Estimate & Due Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-graphite mb-1.5 flex items-center gap-1.5">
              <Clock size={13} className="text-secondary" />
              <span>Estimate (minutes)</span>
            </label>
            <div className="space-y-2">
              <input
                type="number"
                min="5"
                step="5"
                value={estimateMin}
                onChange={(e) => setEstimateMin(Math.max(5, parseInt(e.target.value, 10) || 5))}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/70 border border-black/[0.08] text-graphite focus:outline-none focus:ring-2 focus:ring-nearblack/20 focus:bg-white transition-all"
              />
              <div className="flex gap-1.5 flex-wrap">
                {ESTIMATE_PRESETS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setEstimateMin(m)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] border transition-all ${
                      estimateMin === m
                        ? 'bg-lime text-nearblack font-medium border-lime'
                        : 'bg-white/40 text-secondary border-black/[0.06] hover:bg-white'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-graphite mb-1.5 flex items-center gap-1.5">
              <Calendar size={13} className="text-secondary" />
              <span>Due Date</span>
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/70 border border-black/[0.08] text-graphite focus:outline-none focus:ring-2 focus:ring-nearblack/20 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Description (optional) */}
        <div>
          <label className="block text-xs font-medium text-graphite mb-1.5">
            Description <span className="text-secondary font-normal">(optional)</span>
          </label>
          <textarea
            rows={2}
            placeholder="Key notes, context, or deliverables..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 text-xs rounded-2xl bg-white/70 border border-black/[0.08] text-graphite placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-nearblack/20 focus:bg-white transition-all resize-none shadow-xs"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-black/[0.06]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-initial h-10 px-4 rounded-full text-xs sm:text-sm text-secondary hover:text-graphite border border-black/[0.07] bg-white/40 active:scale-95 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !title.trim()}
            className="flex-1 sm:flex-initial h-10 px-5 rounded-full text-xs sm:text-sm font-medium bg-lime text-nearblack hover:bg-[var(--accent-lime-hover)] active:scale-95 transition-all disabled:opacity-50 shadow-xs"
          >
            {isSubmitting ? 'Adding...' : 'Create Task'}
          </button>
        </div>
      </form>
      )}
    </Modal>
  );
};
