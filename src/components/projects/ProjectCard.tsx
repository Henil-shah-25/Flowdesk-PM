import React from 'react';
import { GlassCard, ProgressBar, Chip, IconButton } from '../ui';
import type { GlassVariant } from '../ui/GlassCard';
import { computeProjectHealth } from '../../lib/health';
import type { Project, TaskItem, Department, ProjectType } from '../../types';
import { Calendar, Archive, Trash2, ArrowUpRight, FolderGit2 } from 'lucide-react';
import { format } from 'date-fns';

export interface ProjectCardProps {
  project: Project;
  tasks: TaskItem[];
  departments: Department[];
  subProjectCount?: number;
  isSubProject?: boolean;
  onArchive?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  onClick?: () => void;
  variant?: GlassVariant;
}

function getTypeChipAccent(type?: string): 'lime' | 'amber' | 'coral' | 'sage' | 'sky' | 'peach' | 'neutral' {
  switch (type as ProjectType) {
    case 'Marketing Campaign':
      return 'sky';
    case 'Research Campaign':
      return 'sage';
    case 'Project':
      return 'peach';
    default:
      return 'neutral';
  }
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  tasks,
  departments,
  subProjectCount = 0,
  isSubProject = false,
  onArchive,
  onDelete,
  onClick,
  variant = 'default',
}) => {
  const health = computeProjectHealth(project, tasks, departments);
  const typeAccent = getTypeChipAccent(project.type);

  const formattedDueDate = project.due_date
    ? (() => {
        try {
          return format(new Date(project.due_date), 'MMM d, yyyy');
        } catch {
          return project.due_date;
        }
      })()
    : 'No due date';

  const relevantTasks = tasks.filter((t) => t.project_id === project.id);
  const taskCount = relevantTasks.length;

  return (
    <GlassCard
      variant={variant}
      interactive={Boolean(onClick)}
      onClick={onClick}
      data-project-card={project.id}
      className={`flex flex-col justify-between transition-all ${
        isSubProject ? 'p-5 sm:p-6' : 'p-6 sm:p-7'
      }`}
    >
      <div>
        {/* Top Header: Dot, Type chip, Health badge, and Actions */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{
                backgroundColor:
                  health.status === 'coral'
                    ? '#F25F5C'
                    : health.status === 'amber'
                    ? '#F5A524'
                    : '#2DBE8C',
              }}
              title={health.label}
            />
            <Chip
              label={project.type || 'Project'}
              accent={typeAccent}
              size="sm"
              dot={false}
            />
            {/* Health indicator label */}
            <span className="text-xs text-secondary font-normal">
              {health.label}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            {onArchive && (
              <IconButton
                icon={<Archive size={14} />}
                aria-label="Archive project"
                variant="glass"
                size="sm"
                onClick={() => onArchive(project)}
              />
            )}
            {onDelete && (
              <IconButton
                icon={<Trash2 size={14} className="text-coral" />}
                aria-label="Delete project"
                variant="glass"
                size="sm"
                onClick={() => onDelete(project)}
              />
            )}
            {onClick && (
              <div className="w-8 h-8 rounded-full bg-white/55 border border-white/60 flex items-center justify-center text-graphite shadow-sm">
                <ArrowUpRight size={14} />
              </div>
            )}
          </div>
        </div>

        {/* Project Title */}
        <h3 className={`font-normal text-graphite leading-snug tracking-tight ${isSubProject ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl'}`}>
          {project.name}
        </h3>
      </div>

      {/* Progress & Meta Info */}
      <div className="mt-6 space-y-3">
        {/* Thin 6px pill bar (lime fill) */}
        <ProgressBar
          value={health.progressPercent}
          accent="lime"
          size="md"
          showLabel={false}
        />

        <div className="flex items-center justify-between text-xs text-secondary pt-2 border-t border-black/[0.04]">
          <div className="flex items-center gap-1.5 truncate">
            <Calendar size={13} className="shrink-0" />
            <span className="truncate">{formattedDueDate}</span>
          </div>

          <div className="flex items-center gap-2.5 font-normal text-graphite shrink-0">
            {!isSubProject && subProjectCount > 0 && (
              <span className="flex items-center gap-1 text-secondary" title={`${subProjectCount} sub-projects`}>
                <FolderGit2 size={12} />
                <span>{subProjectCount} sub</span>
              </span>
            )}
            <span>{taskCount} task{taskCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};
