import React from 'react';
import type { Project } from '../../types';
import { Button, SegmentedControl } from '../ui';
import { Search, Plus } from 'lucide-react';

export interface TasksFilterBarProps {
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  selectedPriority: string;
  onSelectPriority: (p: string) => void;
  selectedDue: string;
  onSelectDue: (d: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  viewMode: 'board' | 'list';
  onViewModeChange: (v: 'board' | 'list') => void;
  onOpenNewTask: () => void;
}

export const TasksFilterBar: React.FC<TasksFilterBarProps> = ({
  projects,
  selectedProjectId,
  onSelectProject,
  selectedPriority,
  onSelectPriority,
  selectedDue,
  onSelectDue,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onOpenNewTask,
}) => {
  return (
    <div className="bg-white/45 backdrop-blur-[24px] border border-white/65 shadow-glass rounded-[28px] p-3 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
      {/* Filters cluster */}
      <div className="flex items-center gap-2 flex-wrap flex-1 w-full">
        {/* Search input */}
        <div className="relative min-w-[160px] flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary pointer-events-none" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-full bg-white/60 border border-white/70 text-graphite placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-lime/40"
          />
        </div>

        {/* Project Dropdown */}
        <div className="relative">
          <select
            value={selectedProjectId}
            onChange={(e) => onSelectProject(e.target.value)}
            className="appearance-none pl-3.5 pr-8 py-2 text-xs sm:text-sm rounded-full bg-white/60 border border-white/70 text-graphite focus:outline-none focus:ring-2 focus:ring-lime/40 cursor-pointer font-normal"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary text-[10px]">
            ▼
          </div>
        </div>

        {/* Priority Dropdown */}
        <div className="relative">
          <select
            value={selectedPriority}
            onChange={(e) => onSelectPriority(e.target.value)}
            className="appearance-none pl-3.5 pr-8 py-2 text-xs sm:text-sm rounded-full bg-white/60 border border-white/70 text-graphite focus:outline-none focus:ring-2 focus:ring-lime/40 cursor-pointer font-normal"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary text-[10px]">
            ▼
          </div>
        </div>

        {/* Due Dropdown */}
        <div className="relative">
          <select
            value={selectedDue}
            onChange={(e) => onSelectDue(e.target.value)}
            className="appearance-none pl-3.5 pr-8 py-2 text-xs sm:text-sm rounded-full bg-white/60 border border-white/70 text-graphite focus:outline-none focus:ring-2 focus:ring-lime/40 cursor-pointer font-normal"
          >
            <option value="any">Any Time</option>
            <option value="today">Due Today</option>
            <option value="week">Due This Week</option>
            <option value="overdue">Overdue</option>
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary text-[10px]">
            ▼
          </div>
        </div>
      </div>

      {/* View Mode Toggle + New Task Button */}
      <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 w-full xl:w-auto pt-2 xl:pt-0 border-t xl:border-t-0 border-black/[0.04]">
        <SegmentedControl
          value={viewMode}
          onChange={onViewModeChange}
          options={[
            { value: 'board', label: 'Board' },
            { value: 'list', label: 'List' },
          ]}
        />

        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={16} />}
          onClick={onOpenNewTask}
        >
          New task
        </Button>
      </div>
    </div>
  );
};
