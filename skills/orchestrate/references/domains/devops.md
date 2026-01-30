# DevOps Orchestration

Domain-specific orchestration recipes for DevOps and infrastructure workflows.

## CI/CD Pipeline Orchestration

**Pattern**: Pipeline

### Phases
1. **Analyze** - Spawn architect to review current CI/CD configuration
2. **Implement** - Spawn executor to modify pipeline files
3. **Test** - Spawn qa-tester to validate pipeline changes
4. **Document** - Spawn writer to update deployment docs

## Deployment Orchestration

**Pattern**: Pipeline (strict)

### Phases (strictly sequential)
1. **Pre-deploy checks** - Run tests, verify build, check configs
2. **Schema migrations** - Apply database changes
3. **Deploy** - Execute deployment scripts
4. **Verify** - Health checks, smoke tests
5. **Rollback plan** - Document rollback steps

## Infrastructure-as-Code

**Pattern**: Pipeline + Fan-Out

### Phases
1. **Audit** (Fan-Out)
   - Spawn security agent for infrastructure security review
   - Spawn architect for architecture compliance check
2. **Implement** (Pipeline)
   - Spawn executor to write IaC definitions
3. **Validate** (Pipeline)
   - Spawn qa-tester to run infrastructure tests
