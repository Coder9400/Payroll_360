# Git Workflow

`main`: Stable production/demo branch.
`develop`: Shared development branch.
Feature branches must be created from `develop`.

Example:
```text
develop
│
├── feature/frontend-auth
├── feature/backend-auth
├── feature/integration-auth
│
├── feature/frontend-employees
├── feature/backend-employees
└── feature/integration-employees
```

## Merge-Conflict Prevention Rules
Rule 1: Developers must not work directly on `main`.
Rule 2: Each developer owns specific directories.
Rule 3: Avoid modifying another developer's owned files unless coordinated.
Rule 4: Shared files must be changed deliberately.
Rule 5: Before starting a phase:
```bash
git checkout develop
git pull origin develop
```
Then create the feature branch.
Rule 6: Before opening a PR:
```bash
git fetch origin
git merge origin/develop
```
Resolve conflicts locally.
Rule 7: Never force push shared branches unless explicitly coordinated.
Rule 8: Every phase must leave the repository buildable.
