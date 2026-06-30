# Kubernetes Security Context for StreamPay

To align with fintech security standards, the following `securityContext` should be applied to all deployments (API and Workers).

## Security Requirements

1. **Non-root user**: The image is configured to run as UID 1001 (streampay).
2. **Read-only root filesystem**: The root filesystem should be mounted as read-only.
3. **Dropped capabilities**: All Linux capabilities should be dropped.
4. **No privilege escalation**: Prevent the process from gaining more privileges.

## Recommended securityContext

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1001
  runAsGroup: 1001
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL
```

## Volume Mounts for Read-only FS

Since the root filesystem is read-only, you must mount a `tmpfs` volume for `/tmp` if the application or its dependencies require temporary write access.

```yaml
spec:
  containers:
    - name: streampay-api
      image: streampay-frontend:latest
      volumeMounts:
        - name: tmp-volume
          mountPath: /tmp
  volumes:
    - name: tmp-volume
      emptyDir:
        medium: Memory
```
