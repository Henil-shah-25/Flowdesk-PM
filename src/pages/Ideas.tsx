import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Lightbulb,
  Plus,
  Trash2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move,
  MousePointer,
  ArrowRight,
  List as ListIcon,
  Kanban,
  Check,
} from 'lucide-react';
import { Button, Modal } from '../components/ui';
import {
  useTableData,
  useCreateRecord,
  useUpdateRecord,
  useDeleteRecord,
} from '../hooks/useData';
import { useToast } from '../components/common/Toast';
import type { Idea, Project, Department } from '../types';

// Paper Colors for Real Sticky Notes
export const PAPER_COLORS = [
  { name: 'Yellow-Lime', hex: '#D8E36A', border: '#c4d152', text: '#17191B' },
  { name: 'Sky', hex: '#9CC0E8', border: '#84addb', text: '#17191B' },
  { name: 'Coral', hex: '#F2A08A', border: '#e08870', text: '#17191B' },
  { name: 'Sage', hex: '#B4C58E', border: '#9eb374', text: '#17191B' },
  { name: 'Peach', hex: '#EFC3A5', border: '#dbaa88', text: '#17191B' },
  { name: 'White', hex: '#FFFFFF', border: '#e2e5e8', text: '#17191B' },
];

export const Ideas: React.FC = () => {
  const { data: rawIdeas = [], isLoading } = useTableData('Ideas');
  const { data: projects = [] } = useTableData('Projects');
  const { data: departments = [] } = useTableData('Departments');
  const { data: stages = [] } = useTableData('Stages');

  const createIdeaMutation = useCreateRecord('Ideas');
  const updateIdeaMutation = useUpdateRecord('Ideas');
  const deleteIdeaMutation = useDeleteRecord('Ideas');
  const createTaskMutation = useCreateRecord('Tasks');
  const { showToast } = useToast();

  // View mode: Board | List
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');

  // Board canvas state: Pan & Zoom
  const [pan, setPan] = useState({ x: 60, y: 40 });
  const [zoom, setZoom] = useState(1.0); // 0.4 to 2.0
  const [activeTool, setActiveTool] = useState<'select' | 'hand'>('select');

  // Sticky notes local interaction states
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);
  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');

  // Default color for new notes
  const [selectedColor, setSelectedColor] = useState('#D8E36A');

  // Promoting Idea modal state
  const [promotingIdea, setPromotingIdea] = useState<Idea | null>(null);
  const [promoteProjectId, setPromoteProjectId] = useState<string>('');
  const [promoteDeptId, setPromoteDeptId] = useState<string>('');
  const [promoteSubDeptId, setPromoteSubDeptId] = useState<string>('');
  const [promoteStageId, setPromoteStageId] = useState<string>('');

  // Last deleted idea for Undo
  const lastDeletedRef = useRef<Idea | null>(null);

  // Dragging note reference state (for smooth 60fps pointer move)
  const containerRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const initialPanRef = useRef({ x: 0, y: 0 });

  const draggingNoteRef = useRef<{
    id: string;
    startClientX: number;
    startClientY: number;
    initialX: number;
    initialY: number;
    hasMoved: boolean;
  } | null>(null);

  // Highest z-index tracking
  const maxZ = useMemo(() => {
    return rawIdeas.reduce((acc, idea) => Math.max(acc, idea.z || 1), 1);
  }, [rawIdeas]);

  // Project and Department lookups
  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  const departmentMap = useMemo(() => {
    const map = new Map<string, Department>();
    departments.forEach((d) => map.set(d.id, d));
    return map;
  }, [departments]);

  // Handle Zoom In / Out / Fit
  const handleZoomIn = () => setZoom((z) => Math.min(2.0, Number((z + 0.15).toFixed(2))));
  const handleZoomOut = () => setZoom((z) => Math.max(0.4, Number((z - 0.15).toFixed(2))));
  const handleFit = () => {
    setZoom(1.0);
    setPan({ x: 60, y: 40 });
  };

  // Keyboard shortcut listener for Delete / Backspace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedIdeaId || editingIdeaId) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = rawIdeas.find((i) => i.id === selectedIdeaId);
        if (target) {
          lastDeletedRef.current = target;
          deleteIdeaMutation.mutate(target.id);
          setSelectedIdeaId(null);
          showToast({
            message: `Deleted "${target.title}"`,
            actionLabel: 'Undo',
            onAction: () => {
              if (lastDeletedRef.current) {
                createIdeaMutation.mutate(lastDeletedRef.current);
                lastDeletedRef.current = null;
              }
            },
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIdeaId, editingIdeaId, rawIdeas, deleteIdeaMutation, createIdeaMutation, showToast]);

  // Wheel zoom (mouse wheel / touchpad pinch)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const delta = -e.deltaY * 0.002;
      setZoom((prev) => Math.min(2.0, Math.max(0.4, Number((prev + delta).toFixed(2)))));
    } else {
      // Pan
      setPan((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  }, []);

  // Board pointer down for Panning empty space
  const handleBoardPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-sticky-note]')) {
      return;
    }

    setSelectedIdeaId(null);
    if (editingIdeaId) {
      handleSaveEdit();
    }

    // Start panning
    isPanningRef.current = true;
    panStartRef.current = { x: e.clientX, y: e.clientY };
    initialPanRef.current = { ...pan };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleBoardPointerMove = (e: React.PointerEvent) => {
    // 1. Dragging note
    if (draggingNoteRef.current) {
      const { id, startClientX, startClientY, initialX, initialY } = draggingNoteRef.current;
      const dx = (e.clientX - startClientX) / zoom;
      const dy = (e.clientY - startClientY) / zoom;
      if (Math.hypot(dx, dy) > 3) {
        draggingNoteRef.current.hasMoved = true;
      }
      const nextX = Math.round(initialX + dx);
      const nextY = Math.round(initialY + dy);

      const el = document.getElementById(`sticky-note-${id}`);
      if (el) {
        el.style.transform = `translate3d(${nextX}px, ${nextY}px, 0) scale(1.04) rotate(0deg)`;
      }
      return;
    }

    // 2. Panning canvas
    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPan({
        x: initialPanRef.current.x + dx,
        y: initialPanRef.current.y + dy,
      });
    }
  };

  const handleBoardPointerUp = (e: React.PointerEvent) => {
    // End Drag note
    if (draggingNoteRef.current) {
      const { id, initialX, initialY, hasMoved, startClientX, startClientY } = draggingNoteRef.current;
      const dx = (e.clientX - startClientX) / zoom;
      const dy = (e.clientY - startClientY) / zoom;
      const nextX = Math.round(initialX + dx);
      const nextY = Math.round(initialY + dy);

      const targetIdea = rawIdeas.find((i) => i.id === id);
      const targetRotation = targetIdea?.rotation ?? 0;

      const el = document.getElementById(`sticky-note-${id}`);
      if (el) {
        el.style.transform = `translate3d(${nextX}px, ${nextY}px, 0) scale(1) rotate(${targetRotation}deg)`;
        el.classList.remove('z-50');
      }

      if (hasMoved) {
        updateIdeaMutation.mutate({
          id,
          patch: {
            x: nextX,
            y: nextY,
            z: maxZ + 1,
          },
        });
      }
      draggingNoteRef.current = null;
      return;
    }

    // End Pan
    if (isPanningRef.current) {
      isPanningRef.current = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  // Double click empty board creates note at that spot
  const handleBoardDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-sticky-note]')) return;

    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return;

    // Convert mouse client coordinates to canvas world coordinates
    const worldX = Math.round((e.clientX - bounds.left - pan.x) / zoom) - 110;
    const worldY = Math.round((e.clientY - bounds.top - pan.y) / zoom) - 110;

    createNewNoteAt(worldX, worldY);
  };

  // Helper to create a note
  const createNewNoteAt = (x: number, y: number) => {
    const randomRot = Number((Math.random() * 5 - 2.5).toFixed(1)); // -2.5 to 2.5 deg
    const newNote: Partial<Idea> = {
      title: 'New Idea',
      body: 'Double click to edit notes and expand your thoughts...',
      color: selectedColor,
      x,
      y,
      w: 220,
      h: 220,
      rotation: randomRot,
      z: maxZ + 1,
      status: 'inbox',
      created_at: new Date().toISOString(),
    };

    createIdeaMutation.mutate(newNote, {
      onSuccess: (created) => {
        setSelectedIdeaId(created.id);
        setEditingIdeaId(created.id);
        setEditTitle(created.title);
        setEditBody(created.body);
        showToast({ message: 'New idea note created' });
      },
    });
  };

  // Capture Idea button: adds note at viewport center
  const handleCaptureIdeaCenter = () => {
    const bounds = containerRef.current?.getBoundingClientRect();
    const centerX = bounds ? (bounds.width / 2 - pan.x) / zoom - 110 : 200;
    const centerY = bounds ? (bounds.height / 2 - pan.y) / zoom - 110 : 150;
    createNewNoteAt(Math.round(centerX), Math.round(centerY));
  };

  // Note pointer down (picks up note)
  const handleNotePointerDown = (e: React.PointerEvent, idea: Idea) => {
    // If clicking input or button, do not drag
    if ((e.target as HTMLElement).closest('button, input, textarea, select')) {
      return;
    }

    e.stopPropagation();
    setSelectedIdeaId(idea.id);

    // Bring note to front
    updateIdeaMutation.mutate({
      id: idea.id,
      patch: { z: maxZ + 1 },
    });

    const el = document.getElementById(`sticky-note-${idea.id}`);
    if (el) {
      el.classList.add('z-50');
      el.style.transform = `translate3d(${idea.x}px, ${idea.y}px, 0) scale(1.04) rotate(0deg)`;
    }

    draggingNoteRef.current = {
      id: idea.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      initialX: idea.x,
      initialY: idea.y,
      hasMoved: false,
    };
  };

  // Resize handle pointer down
  const handleResizePointerDown = (e: React.PointerEvent | React.MouseEvent, idea: Idea) => {
    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const initialW = idea.w || 220;
    const initialH = idea.h || 220;
    const el = document.getElementById(`sticky-note-${idea.id}`);

    const onPointerMove = (moveEv: MouseEvent | PointerEvent) => {
      const dx = (moveEv.clientX - startX) / zoom;
      const dy = (moveEv.clientY - startY) / zoom;
      const nextW = Math.max(160, Math.min(480, Math.round(initialW + dx)));
      const nextH = Math.max(160, Math.min(480, Math.round(initialH + dy)));
      if (el) {
        el.style.width = `${nextW}px`;
        el.style.height = `${nextH}px`;
      }
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('mouseup', onPointerUp);

      if (el) {
        const nextW = parseInt(el.style.width, 10);
        const nextH = parseInt(el.style.height, 10);
        if (!isNaN(nextW) && !isNaN(nextH)) {
          updateIdeaMutation.mutate({
            id: idea.id,
            patch: { w: nextW, h: nextH },
          });
        }
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('mouseup', onPointerUp);
  };

  // Start inline editing
  const handleStartEdit = (idea: Idea) => {
    setEditingIdeaId(idea.id);
    setEditTitle(idea.title);
    setEditBody(idea.body);
  };

  // Save inline edit
  const handleSaveEdit = () => {
    if (!editingIdeaId) return;
    updateIdeaMutation.mutate({
      id: editingIdeaId,
      patch: {
        title: editTitle.trim() || 'Untitled Idea',
        body: editBody.trim(),
      },
    });
    setEditingIdeaId(null);
  };

  // Change color of note
  const handleChangeColor = (ideaId: string, hex: string) => {
    updateIdeaMutation.mutate({
      id: ideaId,
      patch: { color: hex },
    });
  };

  // Open Promote Modal
  const handleOpenPromote = (idea: Idea) => {
    setPromotingIdea(idea);
    const firstProj = idea.project_id || projects[0]?.id || '';
    setPromoteProjectId(firstProj);

    const projectDepts = departments.filter((d) => d.project_id === firstProj && !d.parent_id);
    const firstDept = idea.department_id || projectDepts[0]?.id || departments[0]?.id || '';
    setPromoteDeptId(firstDept);
    setPromoteSubDeptId('');

    const deptStages = stages.filter((s) => s.department_id === firstDept);
    const firstStage = deptStages.find((s) => s.kind === 'normal')?.id || deptStages[0]?.id || '';
    setPromoteStageId(firstStage);
  };

  // Confirm Promotion -> create Task & mark Idea promoted
  const handleConfirmPromote = () => {
    if (!promotingIdea) return;

    const targetDeptId = promoteSubDeptId || promoteDeptId;
    createTaskMutation.mutate(
      {
        title: promotingIdea.title,
        description: promotingIdea.body,
        project_id: promoteProjectId,
        department_id: targetDeptId,
        stage_id: promoteStageId,
        priority: 'medium',
        estimate_min: 45,
        actual_min: 0,
        order: 1,
      },
      {
        onSuccess: () => {
          updateIdeaMutation.mutate({
            id: promotingIdea.id,
            patch: {
              status: 'promoted',
              project_id: promoteProjectId,
              department_id: targetDeptId,
              stage_id: promoteStageId,
            },
          });
          showToast({
            message: `Promoted "${promotingIdea.title}" to pipeline task`,
          });
          setPromotingIdea(null);
        },
      }
    );
  };

  // Cascading selects for Promote modal
  const promoteProjectDepts = useMemo(() => {
    return departments.filter((d) => d.project_id === promoteProjectId && !d.parent_id);
  }, [departments, promoteProjectId]);

  const promoteSubDepts = useMemo(() => {
    return departments.filter((d) => d.project_id === promoteProjectId && d.parent_id === promoteDeptId);
  }, [departments, promoteProjectId, promoteDeptId]);

  const promoteAvailableStages = useMemo(() => {
    const activeDept = promoteSubDeptId || promoteDeptId;
    return stages
      .filter((s) => s.department_id === activeDept)
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  }, [stages, promoteDeptId, promoteSubDeptId]);

  // Grouped ideas for List view
  const groupedIdeas = useMemo(() => {
    const inbox = rawIdeas.filter((i) => i.status === 'inbox');
    const byProject: Record<string, Idea[]> = {};

    rawIdeas
      .filter((i) => i.status === 'promoted' && i.project_id)
      .forEach((idea) => {
        const pId = idea.project_id!;
        if (!byProject[pId]) byProject[pId] = [];
        byProject[pId].push(idea);
      });

    return { inbox, byProject };
  }, [rawIdeas]);

  return (
    <div className="space-y-6 pb-12 w-full">
      {/* =========================================================================
          HEADER (Title, Subtitle, Board/List toggle, and Capture Idea button)
         ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[clamp(30px,6vw,52px)] sm:text-[clamp(44px,5.5vw,76px)] font-light tracking-[-0.02em] text-graphite leading-[1.05]">
            Ideas Whiteboard
          </h1>
          <p className="text-xs sm:text-base text-secondary mt-1.5 font-normal">
            Infinite freeform canvas for concepts, spontaneous thoughts, and raw insights.
          </p>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto flex-wrap sm:flex-nowrap">
          {/* Board | List toggle */}
          <div className="inline-flex rounded-full bg-black/[0.05] p-1 border border-white/50 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={`px-4 py-1.5 rounded-full font-medium transition-all flex items-center gap-1.5 ${
                viewMode === 'board'
                  ? 'bg-nearblack text-white shadow-sm'
                  : 'text-secondary hover:text-graphite'
              }`}
            >
              <Kanban size={14} />
              <span>Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-4 py-1.5 rounded-full font-medium transition-all flex items-center gap-1.5 ${
                viewMode === 'list'
                  ? 'bg-nearblack text-white shadow-sm'
                  : 'text-secondary hover:text-graphite'
              }`}
            >
              <ListIcon size={14} />
              <span>List</span>
            </button>
          </div>

          {/* Capture Idea button */}
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={16} />}
            onClick={handleCaptureIdeaCenter}
          >
            Capture Idea
          </Button>
        </div>
      </div>

      {/* =========================================================================
          VIEW MODE: BOARD (INFINITE CANVAS)
         ========================================================================= */}
      {viewMode === 'board' && (
        <div className="relative w-full">
          {/* Board Surface: Light off-white (#F6F4F0 at 85%), min-height calc(100vh - 220px) */}
          <div
            ref={containerRef}
            tabIndex={0}
            data-whiteboard-canvas="true"
            onWheel={handleWheel}
            onPointerDown={handleBoardPointerDown}
            onPointerMove={handleBoardPointerMove}
            onPointerUp={handleBoardPointerUp}
            onDoubleClick={handleBoardDoubleClick}
            style={{
              backgroundColor: 'rgba(246, 244, 240, 0.85)',
              backgroundImage: 'radial-gradient(rgba(27, 29, 31, 0.14) 1.5px, transparent 1.5px)',
              backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
              backgroundPosition: `${pan.x}px ${pan.y}px`,
              cursor: isPanningRef.current
                ? 'grabbing'
                : activeTool === 'hand'
                ? 'grab'
                : 'default',
            }}
            className="relative min-h-[calc(100vh-220px)] w-full rounded-[32px] border border-white/60 shadow-glass overflow-hidden select-none outline-none"
          >
            {/* Infinite Canvas Layer (Scales with zoom and moves with pan) */}
            <div
              style={{
                transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                transformOrigin: '0 0',
              }}
              className="absolute inset-0 pointer-events-none"
            >
              {/* Sticky Notes */}
              {rawIdeas.map((idea) => {
                const isSelected = selectedIdeaId === idea.id;
                const isEditing = editingIdeaId === idea.id;
                const noteColor = idea.color || '#D8E36A';
                const rotation = idea.rotation ?? 0;
                const noteW = idea.w || 220;
                const noteH = idea.h || 220;
                const isPromoted = idea.status === 'promoted';

                return (
                  <div
                    key={idea.id}
                    id={`sticky-note-${idea.id}`}
                    data-sticky-note={idea.id}
                    onPointerDown={(e) => handleNotePointerDown(e, idea)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleStartEdit(idea);
                    }}
                    style={{
                      transform: `translate3d(${idea.x}px, ${idea.y}px, 0) rotate(${rotation}deg)`,
                      width: `${noteW}px`,
                      height: `${noteH}px`,
                      backgroundColor: noteColor,
                      zIndex: idea.z || 1,
                      boxShadow: isSelected
                        ? '0 20px 48px rgba(30, 35, 40, 0.22), 0 0 0 2px #121212'
                        : '0 12px 28px rgba(30, 35, 40, 0.12)',
                      transition: draggingNoteRef.current?.id === idea.id ? 'none' : 'transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 150ms ease',
                    }}
                    className="absolute pointer-events-auto rounded-[8px] p-4 flex flex-col justify-between cursor-grab active:cursor-grabbing select-none group"
                  >
                    {/* Small Semi-Transparent Tape Strip at Top Center */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-5 bg-white/45 backdrop-blur-xs border border-white/60 shadow-xs rounded-[2px] rotate-[-1deg] pointer-events-none z-10" />

                    {/* Folded Top-Right Corner Effect */}
                    <div className="absolute top-0 right-0 w-6 h-6 overflow-hidden pointer-events-none">
                      <div className="absolute top-0 right-0 w-0 h-0 border-solid border-t-[24px] border-r-[24px] border-t-white/35 border-r-transparent drop-shadow-xs" />
                    </div>

                    {/* Note Content Area */}
                    <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                      {isEditing ? (
                        <div className="space-y-2 flex-1 flex flex-col">
                          <input
                            type="text"
                            autoFocus
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') setEditingIdeaId(null);
                            }}
                            className="w-full bg-white/40 border border-black/10 rounded px-2 py-1 text-sm font-bold text-graphite focus:outline-none"
                            placeholder="Title..."
                          />
                          <textarea
                            value={editBody}
                            onChange={(e) => setEditBody(e.target.value)}
                            className="w-full flex-1 bg-white/40 border border-black/10 rounded p-2 text-base font-handwriting text-graphite focus:outline-none resize-none"
                            placeholder="Jot notes..."
                          />
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            className="self-end px-2.5 py-0.5 rounded text-xs bg-nearblack text-white font-medium"
                          >
                            Done
                          </button>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col justify-between overflow-hidden">
                          <div>
                            {/* Status badge if promoted */}
                            {isPromoted && (
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 mb-1.5 rounded-full bg-nearblack/10 text-nearblack text-[10px] font-semibold uppercase tracking-wider">
                                <Check size={10} strokeWidth={3} />
                                <span>Promoted</span>
                              </div>
                            )}

                            {/* Bold Title */}
                            <h3 className="font-bold text-[15px] leading-tight text-graphite tracking-tight mb-1 truncate">
                              {idea.title}
                            </h3>

                            {/* Handwriting Style Body */}
                            <p className="font-handwriting text-[17px] leading-[1.3] text-graphite/90 overflow-hidden line-clamp-4">
                              {idea.body}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Note Footer: Color swatches & Promote Button */}
                    <div className="pt-2 border-t border-black/[0.08] flex items-center justify-between text-xs mt-2">
                      {/* Color Palette on Note Hover */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {PAPER_COLORS.slice(0, 4).map((c) => (
                          <button
                            key={c.name}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChangeColor(idea.id, c.hex);
                            }}
                            className="w-3.5 h-3.5 rounded-full border border-black/20 hover:scale-125 transition-transform"
                            style={{ backgroundColor: c.hex }}
                          />
                        ))}
                      </div>

                      {/* Promote Action Button */}
                      {!isPromoted ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPromote(idea);
                          }}
                          className="px-2.5 py-0.5 rounded-full bg-white/75 hover:bg-white border border-black/10 text-[11px] font-semibold text-graphite shadow-xs flex items-center gap-1 transition-all"
                        >
                          <span>Promote</span>
                          <ArrowRight size={11} />
                        </button>
                      ) : (
                        <span className="text-[10px] text-secondary font-medium">
                          In pipeline
                        </span>
                      )}
                    </div>

                    {/* Resize Handle at Bottom-Right Corner */}
                    <div
                      data-resize-handle
                      onPointerDown={(e) => handleResizePointerDown(e, idea)}
                      onMouseDown={(e) => handleResizePointerDown(e, idea)}
                      className="absolute right-0 bottom-0 w-6 h-6 z-20 cursor-se-resize flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity"
                    >
                      <svg width="10" height="10" viewBox="0 0 8 8" fill="none">
                        <path d="M7 1L1 7M7 4L4 7M7 7L7 7" stroke="#17191B" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Empty canvas hint when no ideas */}
            {!isLoading && rawIdeas.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center p-6 rounded-3xl bg-white/40 backdrop-blur-sm border border-white/60 shadow-sm max-w-sm">
                  <Lightbulb size={28} className="mx-auto text-secondary mb-2 opacity-70" />
                  <h4 className="text-base font-normal text-graphite">Your Whiteboard is Ready</h4>
                  <p className="text-xs text-secondary mt-1">
                    Double-click anywhere on the canvas or click "Capture Idea" to add a paper note.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* =====================================================================
              FLOATING BOTTOM-CENTER TOOLBAR (Glass Pill)
             ===================================================================== */}
          <div
            className="fixed left-1/2 -translate-x-1/2 z-40 bg-white/90 backdrop-blur-[24px] border border-white/80 shadow-[0_12px_40px_rgba(20,25,30,0.18)] rounded-full px-3 sm:px-4 py-1.5 sm:py-2 flex items-center gap-2 sm:gap-3 max-w-[94vw] overflow-x-auto no-scrollbar"
            style={{ bottom: 'calc(4.75rem + env(safe-area-inset-bottom, 0px))' }}
          >
            {/* Tool Selection: Select vs Hand */}
            <div className="flex items-center gap-1 pr-2 border-r border-black/[0.08]">
              <button
                type="button"
                aria-label="Select mode"
                onClick={() => setActiveTool('select')}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  activeTool === 'select'
                    ? 'bg-nearblack text-white shadow-xs'
                    : 'text-secondary hover:text-graphite hover:bg-black/5'
                }`}
              >
                <MousePointer size={15} />
              </button>
              <button
                type="button"
                aria-label="Hand mode"
                onClick={() => setActiveTool('hand')}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  activeTool === 'hand'
                    ? 'bg-nearblack text-white shadow-xs'
                    : 'text-secondary hover:text-graphite hover:bg-black/5'
                }`}
              >
                <Move size={15} />
              </button>
            </div>

            {/* Add Note Button */}
            <button
              type="button"
              onClick={handleCaptureIdeaCenter}
              className="px-3 py-1.5 rounded-full bg-lime text-nearblack font-semibold text-xs flex items-center gap-1.5 shadow-sm hover:scale-105 transition-transform"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>Add Note</span>
            </button>

            {/* Color Swatches */}
            <div className="flex items-center gap-1.5 px-2 border-x border-black/[0.08]">
              {PAPER_COLORS.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  title={c.name}
                  onClick={() => {
                    setSelectedColor(c.hex);
                    if (selectedIdeaId) {
                      handleChangeColor(selectedIdeaId, c.hex);
                    }
                  }}
                  className={`w-5 h-5 rounded-full border border-black/15 transition-transform ${
                    selectedColor === c.hex ? 'scale-125 ring-2 ring-nearblack' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>

            {/* Zoom Controls: -, %, +, Fit */}
            <div className="flex items-center gap-1.5 text-xs text-graphite font-medium">
              <button
                type="button"
                aria-label="Zoom out"
                onClick={handleZoomOut}
                className="w-7 h-7 rounded-full hover:bg-black/5 flex items-center justify-center text-secondary hover:text-graphite transition-all"
              >
                <ZoomOut size={14} />
              </button>

              <span className="w-12 text-center text-xs font-mono font-medium text-graphite select-none">
                {Math.round(zoom * 100)}%
              </span>

              <button
                type="button"
                aria-label="Zoom in"
                onClick={handleZoomIn}
                className="w-7 h-7 rounded-full hover:bg-black/5 flex items-center justify-center text-secondary hover:text-graphite transition-all"
              >
                <ZoomIn size={14} />
              </button>

              <button
                type="button"
                title="Fit to view"
                onClick={handleFit}
                className="px-2 py-1 rounded-full text-[11px] bg-black/5 hover:bg-black/10 text-secondary hover:text-graphite transition-all"
              >
                Fit
              </button>
            </div>

            {/* Undo button */}
            {lastDeletedRef.current && (
              <button
                type="button"
                onClick={() => {
                  if (lastDeletedRef.current) {
                    createIdeaMutation.mutate(lastDeletedRef.current);
                    lastDeletedRef.current = null;
                    showToast({ message: 'Restored idea note' });
                  }
                }}
                className="ml-1 pl-2 border-l border-black/[0.08] text-xs font-medium text-graphite hover:underline flex items-center gap-1"
              >
                <RotateCcw size={13} />
                <span>Undo</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW MODE: LIST (Grouped: New Ideas Inbox, then per project)
         ========================================================================= */}
      {viewMode === 'list' && (
        <div className="space-y-8">
          {/* Section: New Ideas (Inbox) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-black/[0.06]">
              <div className="flex items-center gap-2">
                <Lightbulb size={18} className="text-secondary" />
                <h3 className="text-lg font-medium text-graphite">New Ideas (Inbox)</h3>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/70 border border-white/80 text-secondary">
                {groupedIdeas.inbox.length} ideas
              </span>
            </div>

            {groupedIdeas.inbox.length === 0 ? (
              <div className="py-8 text-center text-xs text-secondary italic rounded-2xl bg-white/40 border border-white/60">
                Inbox is clean. Capture new ideas above!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {groupedIdeas.inbox.map((idea) => (
                  <div
                    key={idea.id}
                    className="p-5 rounded-[24px] border shadow-xs flex flex-col justify-between transition-all hover:shadow-md"
                    style={{
                      backgroundColor: idea.color || '#D8E36A',
                      borderColor: 'rgba(0,0,0,0.06)',
                    }}
                  >
                    <div>
                      <h4 className="font-bold text-base text-graphite mb-1.5">
                        {idea.title}
                      </h4>
                      <p className="font-handwriting text-lg text-graphite/90 leading-snug">
                        {idea.body}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-black/[0.08] flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => deleteIdeaMutation.mutate(idea.id)}
                        className="text-secondary hover:text-coral transition-colors p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenPromote(idea)}
                        className="px-3 py-1 rounded-full bg-white text-xs font-semibold text-graphite shadow-xs hover:bg-lime flex items-center gap-1.5 transition-colors"
                      >
                        <span>Promote</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Promoted Ideas Grouped by Project */}
          {Object.entries(groupedIdeas.byProject).map(([projId, ideasList]) => {
            const project = projectMap.get(projId);

            return (
              <div key={projId} className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-black/[0.06]">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: project?.color || '#5B5BF0' }}
                    />
                    <h3 className="text-lg font-medium text-graphite">
                      {project?.name || 'Project'}
                    </h3>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/70 border border-white/80 text-secondary">
                    {ideasList.length} promoted
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {ideasList.map((idea) => {
                    const dept = idea.department_id ? departmentMap.get(idea.department_id) : undefined;

                    return (
                      <div
                        key={idea.id}
                        className="p-5 rounded-[24px] bg-white/75 border border-white/80 shadow-xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-2 text-[11px] text-secondary">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: idea.color || '#D8E36A' }}
                            />
                            <span>{dept?.name || 'Department'}</span>
                            <span className="ml-auto px-2 py-0.5 rounded-full bg-lime/30 text-graphite font-medium text-[10px]">
                              Active Task
                            </span>
                          </div>

                          <h4 className="font-semibold text-base text-graphite mb-1">
                            {idea.title}
                          </h4>
                          <p className="text-xs text-secondary leading-relaxed line-clamp-3">
                            {idea.body}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          PROMOTE IDEA MODAL (Cascading selects: Project -> Dept -> SubDept -> Stage)
         ========================================================================= */}
      <Modal
        isOpen={Boolean(promotingIdea)}
        onClose={() => setPromotingIdea(null)}
        title="Promote Idea to Pipeline Task"
        description="Transform this whiteboard concept into an active deliverable on your project pipeline."
        maxWidth="md"
      >
        {promotingIdea && (
          <div className="space-y-5">
            {/* Summary preview of the idea */}
            <div
              className="p-4 rounded-2xl border"
              style={{
                backgroundColor: promotingIdea.color || '#D8E36A',
                borderColor: 'rgba(0,0,0,0.08)',
              }}
            >
              <h4 className="font-bold text-sm text-graphite mb-1">
                {promotingIdea.title}
              </h4>
              <p className="font-handwriting text-base text-graphite/90 leading-tight">
                {promotingIdea.body}
              </p>
            </div>

            {/* Cascading Selects */}
            <div className="space-y-3.5">
              {/* 1. Project */}
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  1. Target Project
                </label>
                <select
                  value={promoteProjectId}
                  onChange={(e) => {
                    const pId = e.target.value;
                    setPromoteProjectId(pId);
                    const pDepts = departments.filter((d) => d.project_id === pId && !d.parent_id);
                    setPromoteDeptId(pDepts[0]?.id || '');
                    setPromoteSubDeptId('');
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/70 border border-white/80 text-xs text-graphite focus:outline-none"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Department */}
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  2. Department
                </label>
                <select
                  value={promoteDeptId}
                  onChange={(e) => {
                    const dId = e.target.value;
                    setPromoteDeptId(dId);
                    setPromoteSubDeptId('');
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/70 border border-white/80 text-xs text-graphite focus:outline-none"
                >
                  {promoteProjectDepts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Sub-department (if available) */}
              {promoteSubDepts.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">
                    3. Sub-Department (Optional)
                  </label>
                  <select
                    value={promoteSubDeptId}
                    onChange={(e) => setPromoteSubDeptId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/70 border border-white/80 text-xs text-graphite focus:outline-none"
                  >
                    <option value="">Main Department</option>
                    {promoteSubDepts.map((sd) => (
                      <option key={sd.id} value={sd.id}>
                        {sd.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 4. Pipeline Stage */}
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  {promoteSubDepts.length > 0 ? '4' : '3'}. Pipeline Stage
                </label>
                <select
                  value={promoteStageId}
                  onChange={(e) => setPromoteStageId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/70 border border-white/80 text-xs text-graphite focus:outline-none"
                >
                  {promoteAvailableStages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.kind})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-black/[0.06] flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPromotingIdea(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleConfirmPromote}
              >
                Confirm & Create Task
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Ideas;
