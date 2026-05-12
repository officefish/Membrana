const { execSync } = require('child_process');
const fs = require('fs');

const report = {
  timestamp: new Date().toISOString(),
  git: {
    log: execSync('git log --since="00:00:00" --pretty=format:"%h|%s|%an"').toString(),
    diff: execSync('git diff --name-status').toString(),
    branches: execSync('git branch -vv').toString(),
  },
  tests: {
    status: execSync('npm test -- --passWithNoTests 2>&1').toString(),
  },
  files: {
    structure: execSync('tree -L 2 -I node_modules').toString(),
  },
};

fs.writeFileSync('/tmp/code-review-context.json', JSON.stringify(report, null, 2));
console.log('Report saved to /tmp/code-review-context.json');
