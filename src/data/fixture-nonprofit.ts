import type { Choice, Idea, PillarKey } from '@/lib/types';
import { FIXTURE_IDEA } from './fixture-idea';

const c = (id: string, pillar: PillarKey, label: string, sub: string, confidence: number): Choice => ({
  id, pillar, label, sub, detail: `${label}: ${sub}.`, confidence, status: 'active', evidence: [],
});

export const FIXTURE_NONPROFIT: Idea = {
  id: 'fixture-np',
  mode: 'nonprofit',
  pitch: 'CodeCorner: a free after-school coding club for kids in public housing',
  createdAt: 0,
  history: [],
  research: {
    competitors: [{ name: 'Girls Who Code', url: 'https://girlswhocode.com', summary: 'National coding clubs for girls (mock summary)' }],
    complaints: [{ text: 'Our school dropped its only computer class and the library closes at 5', url: 'https://www.reddit.com/r/Parenting/', where: 'r/Parenting (mock)' }],
    marketNotes: ['Mock data: replace with real research'],
  },
  choices: [
    c('cus-1', 'customer', 'Middle schoolers', 'ages 11 to 14', 64),
    c('cus-2', 'customer', 'Their caregivers', 'need safe evenings', 50),
    c('pro-1', 'problem', 'No CS at school', 'few classes offered', 62),
    c('sol-1', 'solution', 'Weekly coding club', 'two evenings, projects', 58),
    c('app-1', 'approach', 'Volunteer mentors', 'one per six kids', 46),
    c('edg-1', 'edge', 'Housing partner', 'rooms on site', 55),
    c('rea-1', 'reach', 'Resident councils', 'flyers, door knocking', 52),
    c('rea-2', 'reach', 'School counselors', 'referrals', 44),
    c('rev-1', 'revenue', 'Local foundation grant', '$25k first year', 42),
    c('ris-1', 'risks', 'Volunteer churn', 'mentors drop out', 36),
  ],
};

/** The right fixture for a mode. Mocks call this instead of importing a fixture directly. */
export const fixtureFor = (mode?: string): Idea => (mode === 'nonprofit' ? FIXTURE_NONPROFIT : FIXTURE_IDEA);
