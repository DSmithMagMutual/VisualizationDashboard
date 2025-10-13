const fs = require('fs');
const os = require('os');
const path = require('path');

const dir = path.join(os.homedir(), '.jira-dashboard');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, 'board-saveAdvice.json');

const sample = {
  columns: {
    uncommitted: [
      {
        key: 'ADVICE-TEST',
        summary: 'Test Epic',
        status: 'To Do',
        statusCategory: 'todo',
        team: 'Test Team',
        stories: [
          {
            key: 'ADVICE-TEST-1',
            summary: 'Child story 1',
            status: 'In Progress',
            statusCategory: 'indeterminate',
            team: 'Team A',
            relationships: {
              relatesTo: ['ADVICE-TEST-3'],
              blocks: ['ADVICE-TEST-4'],
              blockedBy: ['ADVICE-TEST-2']
            }
          }
        ],
        relationships: { relatesTo: ['ADVICE-OTHER'], blocks: [], blockedBy: [] }
      }
    ]
  },
  lastUpdated: new Date().toISOString(),
  source: 'jira',
  projectKey: 'ADVICE'
};

fs.writeFileSync(file, JSON.stringify(sample, null, 2));
const read = JSON.parse(fs.readFileSync(file, 'utf8'));

function validate(b) {
  const epic = b?.columns?.uncommitted?.[0];
  const story = epic?.stories?.[0];
  return (
    !!epic &&
    Array.isArray(epic.stories) &&
    !!story &&
    story.relationships &&
    Array.isArray(story.relationships.relatesTo) &&
    Array.isArray(story.relationships.blocks) &&
    Array.isArray(story.relationships.blockedBy) &&
    epic.relationships &&
    Array.isArray(epic.relationships.relatesTo)
  );
}

if (!validate(read)) {
  console.error('FAIL: structure missing stories/relationships');
  process.exit(2);
}
console.log('PASS: stories and relationships saved+loaded');
