import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Trash2,
  Edit2,
  Calendar,
  Briefcase,
  Mail,
  Send,
  MessageSquare,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Layers,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ListTree,
  LayoutGrid,
  Filter,
  Check,
  Clock,
  Sparkles,
} from 'lucide-react';
import { GlassCard, Button, Modal, ProgressBar } from '../components/ui';
import { useTableData, useCreateRecord, useUpdateRecord, useDeleteRecord } from '../hooks/useData';
import { useToast } from '../components/common/Toast';
import { CountUp } from '../components/common/CountUp';
import type { TeamMember, LeaveRequest, MessageItem, TaskItem, Project, Department } from '../types';
import { format, parseISO, isWithinInterval } from 'date-fns';

export const Team: React.FC = () => {
  const { data: members = [], isLoading: membersLoading } = useTableData('Members');
  const { data: tasks = [] } = useTableData('Tasks');
  const { data: leaveRequests = [] } = useTableData('Leave');
  const { data: messages = [] } = useTableData('Messages');
  const { data: departments = [] } = useTableData('Departments');
  const { data: projects = [] } = useTableData('Projects');
  const { showToast } = useToast();

  const createMember = useCreateRecord('Members');
  const updateMember = useUpdateRecord('Members');
  const deleteMember = useDeleteRecord('Members');

  const createLeave = useCreateRecord('Leave');
  const updateLeave = useUpdateRecord('Leave');
  const deleteLeave = useDeleteRecord('Leave');

  const createMessage = useCreateRecord('Messages');

  // Sub-navigation tabs: Overview first, then Directory, Workload, Org, Leave, Chat
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'workload' | 'org' | 'leave' | 'chat'>('overview');

  // Directory Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');

  // Org Chart controls
  const [orgZoom, setOrgZoom] = useState(1);
  const [orgViewMode, setOrgViewMode] = useState<'cards' | 'tree'>('cards');

  // Member Modal State
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('');
  const [memberDept, setMemberDept] = useState('');

  // Leave Modal State
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveMemberId, setLeaveMemberId] = useState('');
  const [leaveType, setLeaveType] = useState('Vacation');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  // Chat message input
  const [chatInput, setChatInput] = useState('');

  // ─── LEAVE & ACTIVE MEMBER CALCULATIONS ───
  const { activeLeaves, onLeaveMemberIds } = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const approved = leaveRequests.filter((l: LeaveRequest) => {
      if (l.status !== 'approved') return false;
      const start = l.start_date ? l.start_date.substring(0, 10) : '';
      const end = l.end_date ? l.end_date.substring(0, 10) : start;
      return start <= todayStr && end >= todayStr;
    });
    const ids = new Set(approved.map((l) => l.member_id));
    return { activeLeaves: approved, onLeaveMemberIds: ids };
  }, [leaveRequests]);

  // ─── WORKLOAD CALCULATIONS: TASKS PER MEMBER ───
  const memberWorkload = useMemo(() => {
    return members.map((member) => {
      const assignedTasks = tasks.filter((t: TaskItem) => t.assignee_id === member.id && !t.done_at);
      const totalMinutes = assignedTasks.reduce((sum, t) => sum + (Number(t.estimate_min) || 30), 0);
      const hours = Math.round((totalMinutes / 60) * 10) / 10;
      // 40h standard weekly capacity
      const capacityPercent = Math.min(100, Math.round((hours / 40) * 100));
      const isOverloaded = hours > 40;
      const isOnLeave = onLeaveMemberIds.has(member.id);

      return {
        member,
        taskCount: assignedTasks.length,
        totalHours: hours,
        capacityPercent,
        isOverloaded,
        isOnLeave,
      };
    });
  }, [members, tasks, onLeaveMemberIds]);

  // ─── TEAM OVERVIEW METRICS (DERIVED FROM REAL BACKEND DATA) ───
  const overviewMetrics = useMemo(() => {
    const totalMembers = members.length;
    const membersOnLeaveCount = onLeaveMemberIds.size;
    const activeMembersCount = Math.max(0, totalMembers - membersOnLeaveCount);

    const activeProjectsCount = projects.filter(
      (p: Project) => !p.archived && p.status !== 'completed'
    ).length;

    const activeAssignedTasks = tasks.filter(
      (t: TaskItem) => !t.done_at && Boolean(t.assignee_id)
    );
    const activeTasksCount = activeAssignedTasks.length;

    const totalMinutes = activeAssignedTasks.reduce(
      (sum, t) => sum + (Number(t.estimate_min) || 30),
      0
    );
    const totalWeeklyHours = Math.round((totalMinutes / 60) * 10) / 10;

    // Total available weekly capacity = active members * 40h
    const totalTeamCapacityHours = activeMembersCount * 40;
    const utilizationPct =
      totalTeamCapacityHours > 0
        ? Math.min(100, Math.round((totalWeeklyHours / totalTeamCapacityHours) * 100))
        : 0;
    const availableCapacityPct = Math.max(0, 100 - utilizationPct);

    return {
      totalMembers,
      activeMembersCount,
      membersOnLeaveCount,
      activeProjectsCount,
      activeTasksCount,
      totalWeeklyHours,
      totalTeamCapacityHours,
      utilizationPct,
      availableCapacityPct,
    };
  }, [members, projects, tasks, onLeaveMemberIds]);

  // Filtered members for directory
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = m.name?.toLowerCase().includes(q);
        const matchRole = m.role?.toLowerCase().includes(q);
        const matchEmail = m.email?.toLowerCase().includes(q);
        if (!matchName && !matchRole && !matchEmail) return false;
      }

      if (selectedDeptFilter !== 'all') {
        const dept = (m.team_id || '').toLowerCase();
        if (dept !== selectedDeptFilter.toLowerCase()) return false;
      }

      return true;
    });
  }, [members, searchQuery, selectedDeptFilter]);

  // Unique department names for filtering
  const allDeptNames = useMemo(() => {
    const set = new Set<string>();
    members.forEach((m) => {
      if (m.team_id && m.team_id.trim()) set.add(m.team_id.trim());
    });
    departments.forEach((d) => {
      if (d.name && d.name.trim()) set.add(d.name.trim());
    });
    return Array.from(set);
  }, [members, departments]);

  // Open member modal for create
  const handleOpenAddMember = () => {
    setEditingMember(null);
    setMemberName('');
    setMemberEmail('');
    setMemberRole('');
    setMemberDept(departments[0]?.name || 'Engineering');
    setMemberModalOpen(true);
  };

  // Open member modal for edit
  const handleOpenEditMember = (m: TeamMember) => {
    setEditingMember(m);
    setMemberName(m.name);
    setMemberEmail(m.email);
    setMemberRole(m.role || '');
    setMemberDept(m.team_id || '');
    setMemberModalOpen(true);
  };

  // Save Member
  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim()) return;

    if (editingMember) {
      await updateMember.mutateAsync({
        id: editingMember.id,
        patch: {
          name: memberName.trim(),
          email: memberEmail.trim(),
          role: memberRole.trim(),
          team_id: memberDept.trim(),
        },
      });
      showToast({ message: `Updated ${memberName.trim()}` });
    } else {
      await createMember.mutateAsync({
        name: memberName.trim(),
        email: memberEmail.trim(),
        role: memberRole.trim(),
        team_id: memberDept.trim(),
      });
      showToast({ message: `Added ${memberName.trim()} to team` });
    }
    setMemberModalOpen(false);
  };

  // Delete Member
  const handleDeleteMember = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove ${name}? Tasks assigned to them will remain in the project.`)) {
      await deleteMember.mutateAsync(id);
      showToast({ message: `Removed ${name}` });
    }
  };

  // Submit Leave Request
  const handleSaveLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveMemberId || !leaveStartDate) return;

    await createLeave.mutateAsync({
      member_id: leaveMemberId,
      type: leaveType,
      start_date: leaveStartDate,
      end_date: leaveEndDate || leaveStartDate,
      status: 'pending',
      reason: leaveReason.trim(),
    });

    setLeaveModalOpen(false);
    setLeaveReason('');
    showToast({ message: 'Leave request submitted' });
  };

  // Send Chat message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    await createMessage.mutateAsync({
      channel_id: 'general',
      sender_id: 'me',
      sender_name: 'Henil Shah',
      content: chatInput.trim(),
    });

    setChatInput('');
  };

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-1">
        <div>
          <h1 className="text-[clamp(28px,6vw,44px)] sm:text-[clamp(36px,4.5vw,56px)] font-light tracking-tight text-graphite leading-[1.08]">
            Team & People
          </h1>
          <p className="text-xs sm:text-sm text-secondary mt-1.5 font-normal">
            Manage members, capacity, workload, leave, and team communication.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            variant="primary"
            size="md"
            icon={<UserPlus size={16} />}
            onClick={handleOpenAddMember}
            className="w-full sm:w-auto justify-center"
          >
            Add member
          </Button>
        </div>
      </div>

      {/* Segmented Sub-Nav Controls */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {[
          { id: 'overview', label: 'Team Overview', icon: Sparkles },
          { id: 'members', label: `Directory (${members.length})`, icon: Users },
          { id: 'workload', label: 'Workload & Capacity', icon: Briefcase },
          { id: 'org', label: 'Organisation Chart', icon: Layers },
          { id: 'leave', label: `Leave (${leaveRequests.length})`, icon: Calendar },
          { id: 'chat', label: 'Team Chat', icon: MessageSquare },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`h-10 px-4 rounded-full text-xs font-medium flex items-center gap-2 whitespace-nowrap transition-all border ${
                isSelected
                  ? 'bg-nearblack text-white border-nearblack shadow-sm'
                  : 'bg-white/55 text-secondary border-black/[0.06] hover:bg-white hover:text-graphite'
              }`}
            >
              <Icon size={14} className={isSelected ? 'text-lime' : 'text-secondary'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── TAB 0: TEAM OVERVIEW ─── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 6 Real Live Metric Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <GlassCard className="p-4 sm:p-5 space-y-1">
              <div className="text-xs text-secondary font-normal">Total Members</div>
              <div className="text-2xl sm:text-3xl font-light text-graphite tracking-tight">
                <CountUp value={overviewMetrics.totalMembers} />
              </div>
              <div className="text-[11px] text-secondary">Registered team</div>
            </GlassCard>

            <GlassCard className="p-4 sm:p-5 space-y-1">
              <div className="text-xs text-secondary font-normal">Active Today</div>
              <div className="text-2xl sm:text-3xl font-light text-graphite tracking-tight">
                <CountUp value={overviewMetrics.activeMembersCount} />
              </div>
              <div className="text-[11px] text-[#4D6B10] font-medium">Available now</div>
            </GlassCard>

            <GlassCard className="p-4 sm:p-5 space-y-1">
              <div className="text-xs text-secondary font-normal">On Leave</div>
              <div className="text-2xl sm:text-3xl font-light text-coral tracking-tight">
                <CountUp value={overviewMetrics.membersOnLeaveCount} />
              </div>
              <div className="text-[11px] text-secondary">Approved leave</div>
            </GlassCard>

            <GlassCard className="p-4 sm:p-5 space-y-1">
              <div className="text-xs text-secondary font-normal">Active Tasks</div>
              <div className="text-2xl sm:text-3xl font-light text-graphite tracking-tight">
                <CountUp value={overviewMetrics.activeTasksCount} />
              </div>
              <div className="text-[11px] text-secondary">In execution</div>
            </GlassCard>

            <GlassCard className="p-4 sm:p-5 space-y-1">
              <div className="text-xs text-secondary font-normal">Weekly Hours</div>
              <div className="text-2xl sm:text-3xl font-light text-graphite tracking-tight">
                {overviewMetrics.totalWeeklyHours}h
              </div>
              <div className="text-[11px] text-secondary">Total estimate</div>
            </GlassCard>

            <GlassCard className="p-4 sm:p-5 space-y-1">
              <div className="text-xs text-secondary font-normal">Available Cap.</div>
              <div className="text-2xl sm:text-3xl font-light text-graphite tracking-tight">
                {overviewMetrics.availableCapacityPct}%
              </div>
              <div className="text-[11px] text-secondary">Team bandwidth</div>
            </GlassCard>
          </div>

          {/* Capacity & Distribution Glass Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Team Utilization Bar */}
            <GlassCard className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-medium text-graphite">Weekly Team Capacity</h3>
                  <p className="text-xs text-secondary mt-0.5">
                    {overviewMetrics.totalWeeklyHours}h scheduled vs {overviewMetrics.totalTeamCapacityHours}h max capacity (40h/member)
                  </p>
                </div>
                <span className="text-sm font-semibold text-graphite">
                  {overviewMetrics.utilizationPct}% utilized
                </span>
              </div>

              <ProgressBar
                value={overviewMetrics.utilizationPct}
                accent={overviewMetrics.utilizationPct > 85 ? 'coral' : 'lime'}
                size="md"
              />

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-black/[0.05] text-xs">
                <div>
                  <div className="text-secondary text-[11px]">Active Members</div>
                  <div className="font-medium text-graphite mt-0.5">{overviewMetrics.activeMembersCount} people</div>
                </div>
                <div>
                  <div className="text-secondary text-[11px]">Projects Active</div>
                  <div className="font-medium text-graphite mt-0.5">{overviewMetrics.activeProjectsCount} projects</div>
                </div>
                <div>
                  <div className="text-secondary text-[11px]">Health Status</div>
                  <div className="font-medium text-[#4D6B10] mt-0.5">
                    {overviewMetrics.utilizationPct > 85 ? 'High Load' : 'Balanced'}
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Department Breakdown */}
            <GlassCard className="p-6 space-y-4">
              <div>
                <h3 className="text-base font-medium text-graphite">Department Distribution</h3>
                <p className="text-xs text-secondary mt-0.5">Staffing across active functional divisions</p>
              </div>

              <div className="space-y-3">
                {allDeptNames.slice(0, 4).map((dept) => {
                  const count = members.filter(
                    (m) => (m.team_id || '').toLowerCase() === dept.toLowerCase()
                  ).length;
                  const pct = members.length > 0 ? Math.round((count / members.length) * 100) : 0;
                  return (
                    <div key={dept} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-graphite">{dept}</span>
                        <span className="text-secondary">{count} members ({pct}%)</span>
                      </div>
                      <ProgressBar value={pct} accent="lime" size="sm" />
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* ─── TAB 1: MEMBERS DIRECTORY ─── */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary" />
                <input
                  type="text"
                  placeholder="Search members by name, role, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-full bg-white/70 border border-black/[0.08] text-graphite placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-nearblack/20"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setSelectedDeptFilter('all')}
                className={`h-8 px-3 rounded-full text-xs transition-all border ${
                  selectedDeptFilter === 'all'
                    ? 'bg-nearblack text-white border-nearblack font-medium'
                    : 'bg-white/60 text-secondary border-black/[0.06] hover:bg-white'
                }`}
              >
                All Departments
              </button>
              {allDeptNames.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setSelectedDeptFilter(dept)}
                  className={`h-8 px-3 rounded-full text-xs transition-all border whitespace-nowrap ${
                    selectedDeptFilter.toLowerCase() === dept.toLowerCase()
                      ? 'bg-nearblack text-white border-nearblack font-medium'
                      : 'bg-white/60 text-secondary border-black/[0.06] hover:bg-white'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          {membersLoading ? (
            <div className="py-12 text-center text-secondary text-sm">Loading team members...</div>
          ) : filteredMembers.length === 0 ? (
            <GlassCard className="p-12 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-lime/20 flex items-center justify-center text-nearblack">
                <Users size={24} />
              </div>
              <h3 className="text-lg font-medium text-graphite">No members found</h3>
              <p className="text-xs text-secondary max-w-sm">
                Try adjusting your search criteria or add new members to the team.
              </p>
              <Button variant="primary" size="sm" onClick={handleOpenAddMember} className="mt-2">
                Add member
              </Button>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembers.map((m) => {
                const assigned = tasks.filter((t: TaskItem) => t.assignee_id === m.id && !t.done_at);
                const totalMinutes = assigned.reduce((sum, t) => sum + (Number(t.estimate_min) || 30), 0);
                const hours = Math.round((totalMinutes / 60) * 10) / 10;
                const capacityPct = Math.min(100, Math.round((hours / 40) * 100));
                const isOnLeave = onLeaveMemberIds.has(m.id);

                return (
                  <GlassCard key={m.id} className="p-5 flex flex-col justify-between gap-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-full bg-lime flex items-center justify-center text-nearblack font-semibold text-sm shrink-0 shadow-sm relative">
                          {m.name.charAt(0).toUpperCase()}
                          {isOnLeave && (
                            <span
                              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-coral border-2 border-white"
                              title="On leave"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-medium text-base text-graphite truncate flex items-center gap-1.5">
                            <span>{m.name}</span>
                            {isOnLeave && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-coral/15 text-coral font-normal">
                                On Leave
                              </span>
                            )}
                          </h4>
                          <p className="text-xs text-secondary truncate">{m.role || 'Member'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenEditMember(m)}
                          className="w-8 h-8 rounded-full hover:bg-black/[0.05] flex items-center justify-center text-secondary hover:text-graphite transition-colors"
                          aria-label="Edit member"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteMember(m.id, m.name)}
                          className="w-8 h-8 rounded-full hover:bg-coral/10 flex items-center justify-center text-secondary hover:text-coral transition-colors"
                          aria-label="Delete member"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Member workload bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-secondary">{hours}h / 40h scheduled</span>
                        <span className="font-medium text-graphite">{capacityPct}%</span>
                      </div>
                      <ProgressBar
                        value={capacityPct}
                        accent={capacityPct > 100 ? 'coral' : 'lime'}
                        size="sm"
                      />
                    </div>

                    <div className="space-y-2 pt-2 border-t border-black/[0.06] text-xs text-secondary">
                      {m.email && (
                        <div className="flex items-center gap-2 truncate">
                          <Mail size={13} className="shrink-0" />
                          <span className="truncate">{m.email}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="px-2.5 py-0.5 rounded-full bg-black/[0.05] text-graphite font-normal">
                          {m.team_id || 'General'}
                        </span>
                        <span className="font-medium text-graphite">
                          {assigned.length} open task{assigned.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: WORKLOAD & CAPACITY ─── */}
      {activeTab === 'workload' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-secondary">
              Real-time capacity tracking based on active task estimates (40 hrs/week target).
            </p>
          </div>

          {memberWorkload.length === 0 ? (
            <GlassCard className="p-8 text-center text-secondary text-sm">
              Add team members to see workload analysis.
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {memberWorkload.map(({ member, taskCount, totalHours, capacityPercent, isOverloaded, isOnLeave }) => (
                <GlassCard key={member.id} className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-lime flex items-center justify-center text-nearblack font-semibold text-xs">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-sm text-graphite flex items-center gap-1.5">
                          <span>{member.name}</span>
                          {isOnLeave && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-coral/15 text-coral font-normal">
                              On Leave
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-secondary">{member.role || 'Team Member'}</div>
                      </div>
                    </div>
                    {isOverloaded ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-coral/15 text-coral text-[11px] font-medium flex items-center gap-1">
                        <AlertCircle size={12} /> Overloaded
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-lime/20 text-[#4D6B10] text-[11px] font-medium">
                        Optimal
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-secondary">{taskCount} tasks assigned</span>
                      <span className="font-medium text-graphite">{totalHours}h / 40h ({capacityPercent}%)</span>
                    </div>
                    <ProgressBar
                      value={capacityPercent}
                      accent={isOverloaded ? 'coral' : 'lime'}
                      size="sm"
                    />
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: ORGANISATION CHART (WITH ZOOM & MOBILE TREE VIEW) ─── */}
      {activeTab === 'org' && (
        <GlassCard className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-light text-graphite">Team Hierarchy & Departments</h3>
              <p className="text-xs text-secondary mt-0.5">Structure and functional distribution across Flowdesk.</p>
            </div>

            {/* Controls: Zoom In / Zoom Out / Reset & View Toggle */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {/* Cards vs Tree toggle */}
              <div className="flex items-center bg-white/60 rounded-full border border-black/[0.08] p-0.5">
                <button
                  type="button"
                  onClick={() => setOrgViewMode('cards')}
                  className={`px-3 py-1 rounded-full text-xs transition-all flex items-center gap-1.5 ${
                    orgViewMode === 'cards'
                      ? 'bg-nearblack text-white font-medium shadow-xs'
                      : 'text-secondary hover:text-graphite'
                  }`}
                >
                  <LayoutGrid size={12} />
                  <span>Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrgViewMode('tree')}
                  className={`px-3 py-1 rounded-full text-xs transition-all flex items-center gap-1.5 ${
                    orgViewMode === 'tree'
                      ? 'bg-nearblack text-white font-medium shadow-xs'
                      : 'text-secondary hover:text-graphite'
                  }`}
                >
                  <ListTree size={12} />
                  <span>Hierarchy</span>
                </button>
              </div>

              {/* Zoom Buttons */}
              <div className="flex items-center bg-white/60 rounded-full border border-black/[0.08] p-0.5">
                <button
                  type="button"
                  onClick={() => setOrgZoom((prev) => Math.min(prev + 0.15, 1.6))}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-secondary hover:text-graphite"
                  title="Zoom In"
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setOrgZoom((prev) => Math.max(prev - 0.15, 0.7))}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-secondary hover:text-graphite"
                  title="Zoom Out"
                >
                  <ZoomOut size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setOrgZoom(1)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-secondary hover:text-graphite"
                  title="Reset Zoom"
                >
                  <RotateCcw size={12} />
                </button>
              </div>
            </div>
          </div>

          <div
            style={{
              transform: `scale(${orgZoom})`,
              transformOrigin: 'top left',
              transition: 'transform 200ms ease',
            }}
            className="space-y-6"
          >
            {departments.length === 0 && members.length === 0 ? (
              <p className="text-sm text-secondary">No departments or members defined yet.</p>
            ) : orgViewMode === 'cards' ? (
              departments.map((dept) => {
                const deptMembers = members.filter(
                  (m) => (m.team_id || '').toLowerCase() === dept.name.toLowerCase()
                );
                return (
                  <div key={dept.id} className="p-4 rounded-2xl bg-white/50 border border-black/[0.05] space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color || '#8DB3DE' }} />
                      <h4 className="font-medium text-sm text-graphite">{dept.name}</h4>
                      <span className="text-xs text-secondary ml-1">({deptMembers.length} members)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {deptMembers.map((m) => (
                        <div key={m.id} className="p-2.5 rounded-xl bg-white/70 border border-black/[0.04] flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-lime text-nearblack font-semibold text-xs flex items-center justify-center">
                            {m.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-graphite truncate">{m.name}</div>
                            <div className="text-[11px] text-secondary truncate">{m.role || 'Member'}</div>
                          </div>
                        </div>
                      ))}
                      {deptMembers.length === 0 && (
                        <div className="text-xs text-muted col-span-full py-1">No members assigned to {dept.name} yet.</div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              /* Tree / Hierarchical Mobile View */
              <div className="space-y-4">
                {departments.map((dept) => {
                  const deptMembers = members.filter(
                    (m) => (m.team_id || '').toLowerCase() === dept.name.toLowerCase()
                  );
                  return (
                    <div key={dept.id} className="rounded-2xl border border-black/[0.06] bg-white/60 overflow-hidden">
                      <div className="p-3.5 bg-black/[0.02] flex items-center justify-between border-b border-black/[0.04]">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dept.color || '#8DB3DE' }} />
                          <span className="font-semibold text-sm text-graphite">{dept.name}</span>
                        </div>
                        <span className="text-xs text-secondary font-medium">{deptMembers.length} staff</span>
                      </div>
                      <div className="p-3 divide-y divide-black/[0.04]">
                        {deptMembers.map((m) => (
                          <div key={m.id} className="py-2 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-lime text-nearblack font-bold text-[10px] flex items-center justify-center">
                                {m.name.charAt(0)}
                              </span>
                              <span className="font-medium text-graphite">{m.name}</span>
                            </div>
                            <span className="text-secondary">{m.role || 'Member'}</span>
                          </div>
                        ))}
                        {deptMembers.length === 0 && (
                          <div className="py-2 text-xs text-secondary italic">No members in this department</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {/* ─── TAB 4: LEAVE MANAGEMENT ─── */}
      {activeTab === 'leave' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-secondary">
              Track team time-off, vacations, and availability requests.
            </p>
            <Button
              variant="secondary"
              size="sm"
              icon={<Calendar size={14} />}
              onClick={() => {
                setLeaveMemberId(members[0]?.id || '');
                setLeaveStartDate(new Date().toISOString().substring(0, 10));
                setLeaveEndDate(new Date(Date.now() + 86400000 * 2).toISOString().substring(0, 10));
                setLeaveModalOpen(true);
              }}
            >
              Request leave
            </Button>
          </div>

          {leaveRequests.length === 0 ? (
            <GlassCard className="p-10 text-center text-secondary text-sm">
              No leave requests currently submitted.
            </GlassCard>
          ) : (
            <div className="space-y-2.5">
              {leaveRequests.map((leave: LeaveRequest) => {
                const member = members.find((m) => m.id === leave.member_id);
                const isApproved = leave.status === 'approved';
                const isPending = leave.status === 'pending';

                return (
                  <GlassCard key={leave.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-black/[0.05] flex items-center justify-center text-secondary">
                        <Calendar size={16} />
                      </div>
                      <div>
                        <div className="font-medium text-sm text-graphite">
                          {member?.name || 'Team Member'}
                          <span className="ml-2 text-xs text-secondary font-normal">({leave.type})</span>
                        </div>
                        <div className="text-xs text-muted">
                          {leave.start_date} to {leave.end_date}
                          {leave.reason ? ` — "${leave.reason}"` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                          isApproved
                            ? 'bg-lime/20 text-[#4D6B10]'
                            : isPending
                            ? 'bg-amber/20 text-[#B45309]'
                            : 'bg-coral/20 text-coral'
                        }`}
                      >
                        {leave.status}
                      </span>

                      {isPending && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateLeave.mutate({ id: leave.id, patch: { status: 'approved' } })}
                            className="p-1.5 rounded-full hover:bg-lime/20 text-[#4D6B10] transition-colors"
                            title="Approve"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                          <button
                            onClick={() => updateLeave.mutate({ id: leave.id, patch: { status: 'rejected' } })}
                            className="p-1.5 rounded-full hover:bg-coral/20 text-coral transition-colors"
                            title="Reject"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => deleteLeave.mutate(leave.id)}
                        className="p-1.5 rounded-full hover:bg-black/[0.05] text-muted hover:text-coral transition-colors ml-1"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 5: TEAM CHAT ─── */}
      {activeTab === 'chat' && (
        <GlassCard className="p-5 flex flex-col h-[520px]">
          <div className="pb-3 border-b border-black/[0.05] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-lime" />
              <h4 className="font-medium text-sm text-graphite">#general channel</h4>
            </div>
            <span className="text-xs text-secondary">{members.length} members</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 py-4 pr-1">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-secondary text-xs">
                <MessageSquare size={24} className="mb-2 opacity-50" />
                <span>No messages yet. Start the conversation with your team!</span>
              </div>
            ) : (
              messages.map((msg: MessageItem) => (
                <div key={msg.id} className="flex items-start gap-2.5 text-xs">
                  <div className="w-7 h-7 rounded-full bg-lime text-nearblack font-semibold flex items-center justify-center text-[10px] shrink-0">
                    {(msg.sender_name || 'U').charAt(0)}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-graphite">{msg.sender_name}</span>
                      <span className="text-[10px] text-muted">
                        {msg.created_at ? format(new Date(msg.created_at), 'h:mm a') : ''}
                      </span>
                    </div>
                    <div className="p-2 rounded-xl bg-white/60 border border-black/[0.04] text-graphite">
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSendMessage} className="pt-3 border-t border-black/[0.05] flex items-center gap-2">
            <input
              type="text"
              placeholder="Send a message to the team..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 px-4 py-2 text-xs rounded-full bg-white/70 border border-black/[0.08] text-graphite focus:outline-none focus:ring-2 focus:ring-nearblack/20"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="w-8 h-8 rounded-full bg-nearblack text-white flex items-center justify-center disabled:opacity-40 transition-opacity"
            >
              <Send size={13} />
            </button>
          </form>
        </GlassCard>
      )}

      {/* Member Modal (Create / Edit) */}
      <Modal
        isOpen={memberModalOpen}
        onClose={() => setMemberModalOpen(false)}
        title={editingMember ? 'Edit team member' : 'Add new team member'}
        description="Configure details, roles, and functional assignments."
      >
        <form onSubmit={handleSaveMember} className="space-y-4">
          <div>
            <label className="block text-xs text-secondary mb-1.5">Full Name</label>
            <input
              type="text"
              required
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              placeholder="e.g. Sarah Jenkins"
              className="w-full px-4 py-2 text-xs rounded-full bg-white/60 border border-black/[0.08] text-graphite focus:outline-none focus:ring-2 focus:ring-nearblack/20"
            />
          </div>

          <div>
            <label className="block text-xs text-secondary mb-1.5">Email Address</label>
            <input
              type="email"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              placeholder="sarah@company.com"
              className="w-full px-4 py-2 text-xs rounded-full bg-white/60 border border-black/[0.08] text-graphite focus:outline-none focus:ring-2 focus:ring-nearblack/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-secondary mb-1.5">Role / Title</label>
              <input
                type="text"
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value)}
                placeholder="e.g. Product Lead"
                className="w-full px-4 py-2 text-xs rounded-full bg-white/60 border border-black/[0.08] text-graphite focus:outline-none focus:ring-2 focus:ring-nearblack/20"
              />
            </div>

            <div>
              <label className="block text-xs text-secondary mb-1.5">Department</label>
              <input
                type="text"
                value={memberDept}
                onChange={(e) => setMemberDept(e.target.value)}
                placeholder="e.g. Tech"
                className="w-full px-4 py-2 text-xs rounded-full bg-white/60 border border-black/[0.08] text-graphite focus:outline-none focus:ring-2 focus:ring-nearblack/20"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-black/[0.06]">
            <button
              type="button"
              onClick={() => setMemberModalOpen(false)}
              className="h-9 px-4 rounded-full text-xs text-secondary hover:text-graphite border border-black/[0.07] bg-white/40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMember.isPending || updateMember.isPending}
              className="h-9 px-5 rounded-full text-xs font-medium bg-lime text-nearblack hover:bg-[var(--accent-lime-hover)] transition-colors"
            >
              {editingMember ? 'Save changes' : 'Add member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Leave Request Modal */}
      <Modal
        isOpen={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        title="Submit leave request"
        description="Book planned time off or sick leave."
      >
        <form onSubmit={handleSaveLeave} className="space-y-4">
          <div>
            <label className="block text-xs text-secondary mb-1.5">Team Member</label>
            <select
              value={leaveMemberId}
              onChange={(e) => setLeaveMemberId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-full bg-white/60 border border-black/[0.08] text-graphite focus:outline-none"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role || 'Member'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-secondary mb-1.5">Leave Type</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-full bg-white/60 border border-black/[0.08] text-graphite focus:outline-none"
            >
              <option value="Vacation">Vacation</option>
              <option value="Sick Leave">Sick Leave</option>
              <option value="Personal">Personal Leave</option>
              <option value="Parental">Parental Leave</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-secondary mb-1.5">Start Date</label>
              <input
                type="date"
                required
                value={leaveStartDate}
                onChange={(e) => setLeaveStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-full bg-white/60 border border-black/[0.08] text-graphite focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-secondary mb-1.5">End Date</label>
              <input
                type="date"
                required
                value={leaveEndDate}
                onChange={(e) => setLeaveEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-full bg-white/60 border border-black/[0.08] text-graphite focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-secondary mb-1.5">Reason (Optional)</label>
            <input
              type="text"
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              placeholder="e.g. Annual summer vacation"
              className="w-full px-4 py-2 text-xs rounded-full bg-white/60 border border-black/[0.08] text-graphite focus:outline-none"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-black/[0.06]">
            <button
              type="button"
              onClick={() => setLeaveModalOpen(false)}
              className="h-9 px-4 rounded-full text-xs text-secondary hover:text-graphite border border-black/[0.07] bg-white/40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createLeave.isPending}
              className="h-9 px-5 rounded-full text-xs font-medium bg-lime text-nearblack hover:bg-[var(--accent-lime-hover)] transition-colors"
            >
              Submit request
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
