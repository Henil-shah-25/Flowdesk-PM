import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button } from '../ui';
import type { Stage, StageKind, StageColor, TaskItem } from '../../types';
import { STAGE_COLORS, STAGE_COLOR_MAP } from './PipelineBoard';
import { STAGE_PRESETS } from '../../lib/pipelineTemplates';
import { Check, AlertTriangle, Archive, Trash2, ArrowRight } from 'lucide-react';

export interface StageModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  stage?: Stage | null;
  departmentId: string;
  projectId?: string;
  existingStages: Stage[];
  tasks?: TaskItem[];
  onSave: (data: {
    name: string;
    description?: string;
    kind: StageKind;
    color: StageColor;
    order: number;
    wip_limit?: number;
    is_archived?: boolean;
  }) => Promise<void> | void;
  onDelete?: (stageId: string, moveTasksToStageId?: string) => Promise<void> | void;
}

export const StageModal: React.FC<StageModalProps> = ({
  isOpen,
  onClose,
  mode,
  stage,
  existingStages,
  tasks = [],
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<StageKind>('normal');
  const [color, setColor] = useState<StageColor>('sky');
  const [wipLimit, setWipLimit] = useState<string>('');
  const [positionOption, setPositionOption] = useState<string>('end');
  const [isArchived, setIsArchived] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Safe deletion state
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [destinationStageId, setDestinationStageId] = useState<string>('');

  const activeExistingStages = useMemo(() => {
    return existingStages
      .filter((s) => !s.is_archived && (mode === 'create' || s.id !== stage?.id))
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  }, [existingStages, mode, stage]);

  const tasksInThisStage = useMemo(() => {
    if (!stage) return [];
    return tasks.filter((t) => t.stage_id === stage.id);
  }, [stage, tasks]);

  useEffect(() => {
    if (isOpen) {
      setIsConfirmingDelete(false);
      setError('');
      setIsSubmitting(false);

      if (mode === 'edit' && stage) {
        setName(stage.name || '');
        setDescription(stage.description || '');
        setKind(stage.kind || 'normal');
        setColor(stage.color || 'sky');
        setWipLimit(stage.wip_limit ? String(stage.wip_limit) : '');
        setIsArchived(Boolean(stage.is_archived));
        setPositionOption(String(stage.order || 1));
      } else {
        setName('');
        setDescription('');
        setKind('normal');
        setColor('sky');
        setWipLimit('');
        setIsArchived(false);
        setPositionOption('end');
      }

      if (activeExistingStages.length > 0) {
        setDestinationStageId(activeExistingStages[0].id);
      }
    }
  }, [isOpen, mode, stage, activeExistingStages]);

  const handleApplyPreset = (preset: (typeof STAGE_PRESETS)[0]) => {
    setName(preset.name);
    setKind(preset.kind);
    setColor(preset.color);
    if (!description) {
      setDescription(preset.description);
    }
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Stage name is required');
      return;
    }

    // Duplicate name validation within same pipeline (case-insensitive)
    const isDuplicate = existingStages.some(
      (s) =>
        s.name.toLowerCase() === trimmedName.toLowerCase() &&
        (mode === 'create' || s.id !== stage?.id)
    );
    if (isDuplicate) {
      setError(`A stage named "${trimmedName}" already exists in this pipeline.`);
      return;
    }

    let parsedWipLimit: number | undefined = undefined;
    if (wipLimit.trim()) {
      const num = parseInt(wipLimit.trim(), 10);
      if (isNaN(num) || num < 1) {
        setError('WIP limit must be a positive number');
        return;
      }
      parsedWipLimit = num;
    }

    // Determine order
    let targetOrder: number;
    if (mode === 'create') {
      if (positionOption === 'start') {
        targetOrder = 1;
      } else if (positionOption === 'end') {
        targetOrder = existingStages.length + 1;
      } else {
        // after specific stage
        const afterStage = existingStages.find((s) => s.id === positionOption);
        targetOrder = afterStage ? afterStage.order + 1 : existingStages.length + 1;
      }
    } else {
      targetOrder = stage?.order || 1;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        name: trimmedName,
        description: description.trim() || undefined,
        kind,
        color,
        order: targetOrder,
        wip_limit: parsedWipLimit,
        is_archived: isArchived,
      });
      onClose();
    } catch (err) {
      console.error('Failed to save stage:', err);
      setError('Failed to save stage. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = () => {
    if (!stage || !onDelete) return;

    if (activeExistingStages.length === 0) {
      setError('Cannot delete the only stage. Every pipeline must retain at least one stage.');
      return;
    }

    setIsConfirmingDelete(true);
  };

  const handleConfirmDelete = async () => {
    if (!stage || !onDelete) return;

    if (tasksInThisStage.length > 0 && !destinationStageId) {
      setError('Please select a destination stage to reassign the existing tasks.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onDelete(stage.id, tasksInThisStage.length > 0 ? destinationStageId : undefined);
      onClose();
    } catch (err) {
      console.error('Failed to delete stage:', err);
      setError('Failed to delete stage. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isConfirmingDelete
          ? `Delete "${stage?.name}" Stage`
          : mode === 'create'
          ? 'Add Pipeline Stage'
          : `Edit Stage: ${stage?.name || ''}`
      }
      description={
        isConfirmingDelete
          ? tasksInThisStage.length > 0
            ? `This stage contains ${tasksInThisStage.length} task(s). Reassign them to preserve task history.`
            : 'Are you sure you want to delete this empty stage? This action cannot be undone.'
          : 'Configure stage name, color, kind, and WIP limits for this pipeline.'
      }
    >
      {isConfirmingDelete ? (
        <div className="space-y-5">
          {tasksInThisStage.length > 0 ? (
            <div className="p-4 rounded-2xl bg-amber/15 border border-amber/30 space-y-3">
              <div className="flex items-center gap-2 text-amber text-sm font-medium">
                <AlertTriangle size={18} className="shrink-0" />
                <span>Active tasks must be moved</span>
              </div>
              <p className="text-xs text-graphite leading-relaxed">
                There are <strong>{tasksInThisStage.length}</strong> task(s) currently in{' '}
                <strong>{stage?.name}</strong>. Select an active destination stage to safely reassign them:
              </p>

              <div>
                <label className="block text-xs text-secondary mb-1">Destination Stage</label>
                <select
                  value={destinationStageId}
                  onChange={(e) => setDestinationStageId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-black/10 text-xs sm:text-sm text-graphite focus:outline-none focus:ring-2 focus:ring-nearblack/20"
                >
                  {activeExistingStages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({tasks.filter((t) => t.stage_id === s.id).length} tasks)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-black/[0.03] border border-black/[0.06] text-xs text-secondary">
              This stage is currently empty. Deleting it will remove the column from the pipeline.
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-coral/15 border border-coral/30 text-xs text-coral">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-black/[0.06]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsConfirmingDelete(false)}
            >
              Back
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              icon={<Trash2 size={14} />}
              disabled={isSubmitting}
              onClick={handleConfirmDelete}
            >
              {tasksInThisStage.length > 0
                ? `Move ${tasksInThisStage.length} Tasks & Delete`
                : 'Delete Stage'}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick Presets for New Stages */}
          {mode === 'create' && (
            <div>
              <label className="block text-[11px] font-medium text-secondary uppercase tracking-wider mb-1.5">
                Quick Presets
              </label>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {STAGE_PRESETS.map((p) => {
                  const colorDef = STAGE_COLOR_MAP[p.color] || STAGE_COLOR_MAP.sky;
                  return (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className="px-2.5 py-1 rounded-full text-xs bg-white/70 hover:bg-white border border-black/[0.08] text-graphite flex items-center gap-1.5 whitespace-nowrap transition-all shadow-xs shrink-0"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: colorDef.hex }}
                      />
                      <span>{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stage Name */}
          <div>
            <label className="block text-xs font-medium text-graphite mb-1">
              Stage Name <span className="text-coral">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g., Code Review, Client Approval, QA Testing"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl bg-white/70 border border-black/10 text-graphite placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-nearblack/20 shadow-xs"
            />
          </div>

          {/* Stage Description */}
          <div>
            <label className="block text-xs font-medium text-graphite mb-1">
              Description <span className="text-secondary text-[11px] font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="Brief guidance for tasks in this stage"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 text-xs sm:text-sm rounded-xl bg-white/70 border border-black/10 text-graphite placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-nearblack/20 shadow-xs"
            />
          </div>

          {/* Stage Kind & Color Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Kind Selector */}
            <div>
              <label className="block text-xs font-medium text-graphite mb-1.5">
                Stage Behavior
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-black/[0.04] rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setKind('normal')}
                  className={`py-1.5 px-2 rounded-lg text-center font-medium transition-all ${
                    kind === 'normal'
                      ? 'bg-white text-graphite shadow-xs'
                      : 'text-secondary hover:text-graphite'
                  }`}
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => setKind('done')}
                  className={`py-1.5 px-2 rounded-lg text-center font-medium transition-all ${
                    kind === 'done'
                      ? 'bg-white text-graphite shadow-xs'
                      : 'text-secondary hover:text-graphite'
                  }`}
                >
                  Done
                </button>
                <button
                  type="button"
                  onClick={() => setKind('blocked')}
                  className={`py-1.5 px-2 rounded-lg text-center font-medium transition-all ${
                    kind === 'blocked'
                      ? 'bg-white text-coral shadow-xs'
                      : 'text-secondary hover:text-graphite'
                  }`}
                >
                  Blocked
                </button>
              </div>
            </div>

            {/* WIP Limit */}
            <div>
              <label className="block text-xs font-medium text-graphite mb-1.5">
                WIP Limit <span className="text-secondary text-[11px] font-normal">(Optional)</span>
              </label>
              <input
                type="number"
                min="1"
                max="99"
                placeholder="No limit"
                value={wipLimit}
                onChange={(e) => setWipLimit(e.target.value)}
                className="w-full px-3.5 py-1.5 text-xs sm:text-sm rounded-xl bg-white/70 border border-black/10 text-graphite placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-nearblack/20 shadow-xs"
              />
            </div>
          </div>

          {/* Color Palette */}
          <div>
            <label className="block text-xs font-medium text-graphite mb-1.5">Stage Color</label>
            <div className="flex items-center gap-2.5 flex-wrap">
              {STAGE_COLORS.map((col) => {
                const isSelected = color === col.name;
                return (
                  <button
                    key={col.name}
                    type="button"
                    onClick={() => setColor(col.name)}
                    title={col.label}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border ${
                      isSelected
                        ? 'ring-2 ring-nearblack ring-offset-2 scale-110'
                        : 'border-white/60 hover:scale-105 opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: col.hex }}
                  >
                    {isSelected && <Check size={14} className="text-nearblack" strokeWidth={2.5} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Position Selector (for New Stages) */}
          {mode === 'create' && existingStages.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-graphite mb-1">Position</label>
              <select
                value={positionOption}
                onChange={(e) => setPositionOption(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white/70 border border-black/10 text-xs sm:text-sm text-graphite focus:outline-none focus:ring-2 focus:ring-nearblack/20 shadow-xs"
              >
                <option value="end">At the end of pipeline</option>
                <option value="start">At the beginning of pipeline</option>
                {existingStages.map((s) => (
                  <option key={s.id} value={s.id}>
                    After {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Archive Toggle (Edit mode only) */}
          {mode === 'edit' && stage && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/[0.03] border border-black/[0.06]">
              <div className="flex items-center gap-2">
                <Archive size={15} className="text-secondary" />
                <div>
                  <span className="text-xs font-medium text-graphite block">Archive Stage</span>
                  <span className="text-[11px] text-secondary">
                    Hides stage from active pipeline view; tasks remain preserved.
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isArchived}
                onChange={(e) => setIsArchived(e.target.checked)}
                className="rounded text-lime focus:ring-lime/40 cursor-pointer w-4 h-4"
              />
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-coral/15 border border-coral/30 text-xs text-coral">
              {error}
            </div>
          )}

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-3 border-t border-black/[0.06]">
            {mode === 'edit' && onDelete ? (
              <button
                type="button"
                onClick={handleDeleteClick}
                className="text-xs text-coral hover:underline flex items-center gap-1 font-medium"
              >
                <Trash2 size={13} />
                <span>Delete stage</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
                {mode === 'create' ? 'Create Stage' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
};
