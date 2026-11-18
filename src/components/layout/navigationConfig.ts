import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Lightbulb,
  Calendar as CalendarIcon,
  Sun,
  Timer,
  BarChart3,
  Users,
} from 'lucide-react';

export interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Projects', path: '/projects', icon: FolderKanban },
  { name: 'Tasks', path: '/tasks', icon: CheckSquare },
  { name: 'Team', path: '/team', icon: Users },
  { name: 'Ideas', path: '/ideas', icon: Lightbulb },
  { name: 'Calendar', path: '/calendar', icon: CalendarIcon },
  { name: 'Today', path: '/today', icon: Sun },
  { name: 'Focus', path: '/focus', icon: Timer },
  { name: 'Reports', path: '/reports', icon: BarChart3 },
];
