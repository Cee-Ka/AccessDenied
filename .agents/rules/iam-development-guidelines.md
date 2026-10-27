# Project Guidelines — AccessDenied

These guidelines apply to the entire AccessDenied codebase:

1. **Git Commit Safety**: **Do NOT run `git commit` without explicit permission from the user.** Never commit changes automatically upon finishing a task; leave working tree changes uncommitted until the user explicitly requests a commit.
2. **Deterministic IAM Engine**: The evaluation engine in `src/engine/` must be 100% deterministic with zero external network or SDK dependencies. All evaluation decisions must return an ordered `EvaluationTraceStep[]` logging each check (Network -> Explicit Deny -> SCP -> Resource -> Identity -> Boundary -> Condition).
3. **Offline-First Resilience**: No runtime dependencies on remote CDNs (such as unpkg, jsdelivr, or external web fonts/icons). All icons and editors (CodeMirror 6) must bundle locally.
4. **Strict Policy AST Types**: Always validate policy JSON against `PolicyDocument` and `PolicyStatement` interfaces. Reject invalid `Effect` values (must be `'Allow' | 'Deny'`).
5. **Comprehensive Test Suite**: Every level in `src/levels/` must have an automated test in `tests/levels.test.ts` verifying that:
   - Initial level state fails legitimate traffic or allows exploits.
   - Target solution passes 100% of legitimate workloads, blocks 100% of exploits, and remains under budget.
