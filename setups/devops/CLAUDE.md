# DevOps Setup

Optimized for infrastructure as code, containerization, and CI/CD.

## Technology Stack

- **Containers**: Docker, Podman
- **Orchestration**: Kubernetes, Docker Compose
- **IaC**: Terraform, Pulumi, CloudFormation
- **CI/CD**: GitHub Actions, GitLab CI, Jenkins
- **Monitoring**: Prometheus, Grafana, Datadog

## Available Agents

This setup includes specialized agents for DevOps workflows:

- **executor** - Infrastructure code implementation, configuration changes
- **architect** - System design, performance optimization, troubleshooting
- **security** - Security reviews, vulnerability scanning, compliance checks
- **qa-tester** - Infrastructure testing, validation, smoke tests
- **planner** - Architecture planning, migration strategies, capacity planning

Just describe what you need - the system routes to appropriate agents automatically.

## Docker Best Practices

### Dockerfile Guidelines
```dockerfile
# Use specific base image versions
FROM node:20-alpine

# Create non-root user
RUN addgroup -S app && adduser -S app -G app

# Set working directory
WORKDIR /app

# Copy package files first (layer caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY --chown=app:app . .

# Switch to non-root user
USER app

# Set environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -q --spider http://localhost:3000/health || exit 1

# Start command
CMD ["node", "server.js"]
```

### Multi-Stage Builds
- Build stage for compilation
- Production stage with minimal image
- Copy only necessary artifacts
- Use alpine images when possible

## Kubernetes

### Resource Structure
```
k8s/
  base/
    deployment.yaml
    service.yaml
    configmap.yaml
  overlays/
    development/
    staging/
    production/
```

### Deployment Best Practices
- Always specify resource limits
- Use readiness and liveness probes
- Set pod disruption budgets
- Use ConfigMaps for configuration
- Use Secrets for sensitive data

### Security
- Use NetworkPolicies
- Enable PodSecurityPolicies
- Run as non-root user
- Use read-only root filesystem
- Scan images for vulnerabilities

## Terraform

### Project Structure
```
terraform/
  modules/
    vpc/
    eks/
    rds/
  environments/
    dev/
    staging/
    prod/
```

### State Management
- Use remote state (S3, GCS)
- Enable state locking
- Separate state per environment
- Never commit state files

### Security
- Use variable files for secrets
- Encrypt sensitive outputs
- Review plans before apply
- Use workspaces for isolation

## CI/CD Pipeline

### Stages
1. **Build**: Compile, build artifacts
2. **Test**: Unit, integration, security tests
3. **Scan**: SAST, dependency check
4. **Package**: Build Docker image
5. **Deploy**: Deploy to environments

### Best Practices
- Pin action/tool versions
- Use secrets management
- Implement deployment gates
- Enable rollback capabilities
- Monitor deployment health

## Monitoring & Observability

### Metrics (Prometheus)
- Application metrics (latency, errors, saturation)
- Infrastructure metrics (CPU, memory, disk)
- Business metrics (orders, signups)

### Logging
- Structured JSON logging
- Include correlation IDs
- Set appropriate log levels
- Aggregate logs centrally

### Alerting
- Alert on symptoms, not causes
- Define clear severity levels
- Include runbooks in alerts
- Avoid alert fatigue
