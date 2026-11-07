import type { Idea, PillarKey } from './types';

export type Mode = Idea['mode']; // 'startup' | 'nonprofit'
// Same keys as PersonaRole in contracts.ts. Modes relabel roles; they never add one.
export type ModeRole = 'customer' | 'competitor' | 'investor' | 'advisor';
export type BuildTab = 'landing' | 'pitchOutline' | 'onePager' | 'impact';

export interface ModeProfile {
  mode: Mode;
  name: string;            // toggle and badge text
  rootLabel: string;       // what the root node is called
  readinessLabel: string;
  accent: string;          // one accent color per mode; confidence colors never change
  pillars: Record<PillarKey, { label: string; question: string }>;
  roles: Record<ModeRole, { title: string; scene: string; meter: string | null }>;
  personaForPillar: Record<PillarKey, ModeRole>; // node menu Challenge
  scenes: ModeRole[];      // chat buttons on the toolbar, in order
  research: { competitors: string; complaints: string; marketNotes: string };
  graveyard: { title: string; loader: string; adjacent: string; raisedLabel: string };
  launch: {
    title: string; button: string; unit: 'usd' | 'hours';
    sliderLabel: string; dropOffLabel: string;
    min: number; max: number; step: number; fallback: number;
    disclaimer: string;
  };
  build: { title: string; tabs: { key: BuildTab; label: string }[] };
  intake: { placeholder: string; loading: string[] };
}

const STARTUP: ModeProfile = {
  mode: 'startup', name: 'Startup', rootLabel: 'Pitch', readinessLabel: 'Launch readiness', accent: '#58a6ff',
  pillars: {
    customer: { label: 'Customer', question: 'Who is it for' },
    problem: { label: 'Problem', question: 'Why do they need it' },
    solution: { label: 'Solution', question: 'What do you build' },
    approach: { label: 'Approach', question: 'How does it operate' },
    edge: { label: 'Edge', question: 'Why do you win' },
    reach: { label: 'Reach', question: 'Where do customers come from' },
    revenue: { label: 'Revenue', question: 'How does it make money' },
    risks: { label: 'Risks', question: 'What could bring it down' },
  },
  roles: {
    customer: { title: 'Customer', scene: 'Customer interview', meter: 'Would buy' },
    investor: { title: 'Investor', scene: 'Investor grilling', meter: 'Would invest' },
    competitor: { title: 'Competitor CEO', scene: 'Competitor war game', meter: 'Not worried' },
    advisor: { title: 'Advisor', scene: 'Ask an advisor', meter: null },
  },
  personaForPillar: {
    customer: 'customer', problem: 'customer', solution: 'customer',
    edge: 'competitor', reach: 'competitor',
    revenue: 'investor', risks: 'investor', approach: 'investor',
  },
  scenes: ['customer', 'investor', 'competitor'],
  research: { competitors: 'Competitors', complaints: 'Complaints', marketNotes: 'Market notes' },
  graveyard: { title: 'The Graveyard', loader: 'Digging up the past', adjacent: 'No exact matches. These failed in nearby markets.', raisedLabel: 'Raised' },
  launch: {
    title: 'Launch Day', button: 'Launch', unit: 'usd', sliderLabel: 'Price', dropOffLabel: 'Drop-off price',
    min: 1, max: 100, step: 1, fallback: 10,
    disclaimer: 'A rehearsal, not proof. Test with real people next.',
  },
  build: { title: 'Build', tabs: [
    { key: 'landing', label: 'Landing page' }, { key: 'pitchOutline', label: 'Pitch deck' }, { key: 'onePager', label: 'One-pager' },
  ] },
  intake: { placeholder: 'An app that predicts where fish are biting', loading: ['Searching competitors', 'Reading complaints', 'Building your pillars'] },
};

const NONPROFIT: ModeProfile = {
  mode: 'nonprofit', name: 'Nonprofit', rootLabel: 'Mission', readinessLabel: 'Mission readiness', accent: '#d2a8ff',
  pillars: {
    customer: { label: 'People served', question: 'Who do you serve' },
    problem: { label: 'Need', question: 'What need goes unmet' },
    solution: { label: 'Program', question: 'What do you run' },
    approach: { label: 'Approach', question: 'How is it delivered and staffed' },
    edge: { label: 'Why us', question: 'Why your organization' },
    reach: { label: 'Outreach', question: 'How do people find you' },
    revenue: { label: 'Funding', question: 'How is it funded and sustained' },
    risks: { label: 'Risks', question: 'What could stop the mission' },
  },
  roles: {
    customer: { title: 'Person served', scene: 'Community listening session', meter: 'Would take part' },
    investor: { title: 'Funder', scene: 'Funder meeting', meter: 'Would fund' },
    competitor: { title: 'Peer organization', scene: 'Peer roundtable', meter: 'Would partner' },
    advisor: { title: 'Board mentor', scene: 'Ask a board mentor', meter: null },
  },
  personaForPillar: {
    customer: 'customer', problem: 'customer', solution: 'customer', reach: 'customer',
    edge: 'competitor', approach: 'competitor',
    revenue: 'investor', risks: 'investor',
  },
  scenes: ['customer', 'investor', 'competitor'],
  research: { competitors: 'Peer organizations', complaints: 'Community voices', marketNotes: 'Need and funding notes' },
  graveyard: { title: 'The Nonprofit Graveyard', loader: 'Reading the closing letters', adjacent: 'No exact matches. These closed in nearby causes.', raisedLabel: 'Peak budget' },
  launch: {
    title: 'Open House', button: 'Open the doors', unit: 'hours', sliderLabel: 'Time asked per month', dropOffLabel: 'Drop-off point',
    min: 1, max: 20, step: 1, fallback: 4,
    disclaimer: 'A rehearsal, not proof. Run a real pilot session next.',
  },
  build: { title: 'Build', tabs: [
    { key: 'landing', label: 'Volunteer and donate page' }, { key: 'pitchOutline', label: 'Grant proposal outline' },
    { key: 'onePager', label: 'Case for support' }, { key: 'impact', label: 'Theory of change' },
  ] },
  intake: { placeholder: 'A free after-school coding club for kids in public housing', loading: ['Finding peer organizations', 'Listening to community voices', 'Building your pillars'] },
};

export const MODES: Record<Mode, ModeProfile> = { startup: STARTUP, nonprofit: NONPROFIT };
export const MODE_LIST: Mode[] = ['startup', 'nonprofit'];

/** Missing or unknown mode means startup, so old saved ideas keep working. */
export const profileFor = (mode?: string): ModeProfile => (mode === 'nonprofit' ? NONPROFIT : STARTUP);
export const pillarLabelFor = (key: PillarKey, mode?: string) => profileFor(mode).pillars[key].label;

/** The Launch Day / Open House slider value, formatted: '$8' or '4 hrs/month'. */
export const formatAsk = (value: number, mode?: string) =>
  profileFor(mode).launch.unit === 'usd' ? `$${value}` : `${value} hrs/month`;
