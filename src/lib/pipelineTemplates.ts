import type { Stage, StageKind, StageColor } from '../types';

export interface StageDefinition {
  name: string;
  kind: StageKind;
  color: StageColor;
  description?: string;
  wip_limit?: number;
}

export interface PipelineTemplate {
  id: string;
  name: string;
  description: string;
  category: 'Software' | 'Marketing' | 'Sales' | 'Design' | 'General';
  stages: StageDefinition[];
}

export const STAGE_PRESETS: Array<{
  name: string;
  kind: StageKind;
  color: StageColor;
  description: string;
}> = [
  { name: 'Backlog', kind: 'normal', color: 'sky', description: 'Ideas, requests, and future items awaiting prioritization' },
  { name: 'To Do', kind: 'normal', color: 'peach', description: 'Selected and ready to be started' },
  { name: 'Planning', kind: 'normal', color: 'sky', description: 'Requirements gathering, scoping, and preparation' },
  { name: 'Started', kind: 'normal', color: 'sky', description: 'Initial work in progress' },
  { name: 'In Progress', kind: 'normal', color: 'lime', description: 'Active work currently being executed' },
  { name: 'Under Review', kind: 'normal', color: 'sage', description: 'Work awaiting peer or editorial review' },
  { name: 'Quality Check', kind: 'normal', color: 'sky', description: 'QA verification and test automation' },
  { name: 'Client Approval', kind: 'normal', color: 'peach', description: 'Shared with client or stakeholders for sign-off' },
  { name: 'Revision', kind: 'normal', color: 'coral', description: 'Updates required following review or feedback' },
  { name: 'Completed', kind: 'done', color: 'charcoal', description: 'Work verified and successfully delivered' },
  { name: 'On Hold', kind: 'blocked', color: 'coral', description: 'Paused pending external dependencies or decisions' },
  { name: 'Blockade', kind: 'blocked', color: 'coral', description: 'Work currently impeded by a blocker' },
];

export const PIPELINE_TEMPLATES: PipelineTemplate[] = [
  {
    id: 'default',
    name: 'Flowdesk Standard',
    description: 'Classic 4-stage pipeline: Started, Middle, Blockade, and Ended.',
    category: 'General',
    stages: [
      { name: 'Started', kind: 'normal', color: 'sky', description: 'Tasks ready to be picked up' },
      { name: 'Middle', kind: 'normal', color: 'lime', description: 'Active work in progress' },
      { name: 'Blockade', kind: 'blocked', color: 'coral', description: 'Tasks requiring unblocking' },
      { name: 'Ended', kind: 'done', color: 'charcoal', description: 'Completed and verified tasks' },
    ],
  },
  {
    id: 'software_dev',
    name: 'Software Development',
    description: 'End-to-end engineering flow from Backlog to QA and Production release.',
    category: 'Software',
    stages: [
      { name: 'Backlog', kind: 'normal', color: 'sky', description: 'Incoming user stories and feature requests' },
      { name: 'Sprint Planning', kind: 'normal', color: 'peach', description: 'Groomed tasks scheduled for current sprint' },
      { name: 'In Development', kind: 'normal', color: 'lime', description: 'Active coding and implementation', wip_limit: 8 },
      { name: 'Code Review', kind: 'normal', color: 'sage', description: 'Pull requests awaiting peer feedback', wip_limit: 4 },
      { name: 'Quality Check', kind: 'normal', color: 'sky', description: 'Testing, regressions, and QA sign-off', wip_limit: 4 },
      { name: 'Deployment', kind: 'normal', color: 'peach', description: 'Staging verification and release prep' },
      { name: 'Completed', kind: 'done', color: 'charcoal', description: 'Live in production' },
    ],
  },
  {
    id: 'marketing_campaign',
    name: 'Marketing & Content',
    description: 'Ideation, asset creation, stakeholder sign-off, and launch scheduling.',
    category: 'Marketing',
    stages: [
      { name: 'Ideas', kind: 'normal', color: 'sky', description: 'Campaign concepts and brainstorming' },
      { name: 'Research', kind: 'normal', color: 'peach', description: 'Audience analysis and strategic positioning' },
      { name: 'Content Creation', kind: 'normal', color: 'lime', description: 'Drafting copy, graphics, and video media', wip_limit: 6 },
      { name: 'Internal Review', kind: 'normal', color: 'sage', description: 'Brand voice, editing, and compliance check', wip_limit: 4 },
      { name: 'Client Approval', kind: 'normal', color: 'peach', description: 'Sign-off from leadership or external clients' },
      { name: 'Scheduled', kind: 'normal', color: 'sky', description: 'Queued in publishing tools or ad platforms' },
      { name: 'Published', kind: 'done', color: 'charcoal', description: 'Live in market and distributing' },
    ],
  },
  {
    id: 'sales_pipeline',
    name: 'Sales & Client Deals',
    description: 'Structured deal progression from initial qualification to closed contracts.',
    category: 'Sales',
    stages: [
      { name: 'Lead Generation', kind: 'normal', color: 'sky', description: 'New leads and inbound contact inquiries' },
      { name: 'Qualified', kind: 'normal', color: 'peach', description: 'Confirmed budget, authority, and need' },
      { name: 'Contacted', kind: 'normal', color: 'sky', description: 'Initial outreach or discovery scheduled' },
      { name: 'Meeting', kind: 'normal', color: 'lime', description: 'Demo, presentation, or sales pitch held' },
      { name: 'Proposal', kind: 'normal', color: 'sage', description: 'Quote and agreement presented to buyer' },
      { name: 'Negotiation', kind: 'normal', color: 'peach', description: 'Contract review, discounts, and closing' },
      { name: 'Won', kind: 'done', color: 'charcoal', description: 'Deal closed and onboarding initiated' },
      { name: 'On Hold', kind: 'blocked', color: 'coral', description: 'Prospect stalled or deal paused' },
    ],
  },
  {
    id: 'simple_kanban',
    name: 'Agile Kanban',
    description: 'Lean 5-column board with WIP limits for continuous delivery.',
    category: 'General',
    stages: [
      { name: 'Backlog', kind: 'normal', color: 'sky', description: 'Items awaiting intake' },
      { name: 'To Do', kind: 'normal', color: 'peach', description: 'Committed for immediate pickup' },
      { name: 'In Progress', kind: 'normal', color: 'lime', description: 'Work actively under development', wip_limit: 5 },
      { name: 'Review', kind: 'normal', color: 'sage', description: 'Pending verification or sign-off', wip_limit: 3 },
      { name: 'Done', kind: 'done', color: 'charcoal', description: 'Finished and accepted' },
    ],
  },
  {
    id: 'design_sprint',
    name: 'Design Sprint & UX',
    description: 'Wireframing, visual styling, interactive prototypes, and developer handoff.',
    category: 'Design',
    stages: [
      { name: 'Discovery', kind: 'normal', color: 'sky', description: 'User personas and problem definition' },
      { name: 'Wireframing', kind: 'normal', color: 'peach', description: 'Low-fidelity layout exploration' },
      { name: 'Visual UI Design', kind: 'normal', color: 'lime', description: 'High-fidelity Figma components & screens', wip_limit: 4 },
      { name: 'Prototyping', kind: 'normal', color: 'sage', description: 'Clickable prototype and animation specs' },
      { name: 'Client Review', kind: 'normal', color: 'peach', description: 'Design critique and stakeholder feedback' },
      { name: 'Approved', kind: 'done', color: 'charcoal', description: 'Asset exports and developer handoff complete' },
    ],
  },
];

export function getPipelineTemplateById(id: string): PipelineTemplate {
  return PIPELINE_TEMPLATES.find((t) => t.id === id) || PIPELINE_TEMPLATES[0];
}

/**
 * Creates Stage records for a given department based on a chosen pipeline template.
 */
export function generateStagesForDepartment(
  departmentId: string,
  templateId: string = 'default',
  projectId?: string
): Stage[] {
  const template = getPipelineTemplateById(templateId);
  return template.stages.map((stageDef, index) => {
    const stageId = `stg_${departmentId}_${index + 1}_${stageDef.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    return {
      id: stageId,
      department_id: departmentId,
      project_id: projectId,
      name: stageDef.name,
      kind: stageDef.kind,
      color: stageDef.color,
      order: index + 1,
      description: stageDef.description || '',
      wip_limit: stageDef.wip_limit,
      is_archived: false,
      created_at: new Date().toISOString(),
    };
  });
}
