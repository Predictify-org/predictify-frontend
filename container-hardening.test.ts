import * as fs from 'fs';
import * as path from 'path';

describe('Container Hardening Verification', () => {
  const dockerfilePath = path.join(__dirname, './Dockerfile');
  const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf8');

  test('Dockerfile should run as non-root user', () => {
    expect(dockerfileContent).toContain('USER streampay');
    expect(dockerfileContent).toContain('adduser --system --uid 1001 streampay');
  });

  test('Dockerfile should use multi-stage build for minimal size', () => {
    const stageCount = (dockerfileContent.match(/^FROM /gm) || []).length;
    expect(stageCount).toBeGreaterThanOrEqual(3);
  });

  test('Dockerfile should have healthcheck', () => {
    expect(dockerfileContent).toContain('HEALTHCHECK');
    expect(dockerfileContent).toContain('/api/readyz');
  });

  test('Next.js should be configured for standalone output', () => {
    const nextConfigPath = path.join(__dirname, './next.config.ts');
    const nextConfigContent = fs.readFileSync(nextConfigPath, 'utf8');
    expect(nextConfigContent).toContain("output: 'standalone'");
  });

  test('K8s security documentation should exist', () => {
    const k8sDocsPath = path.join(__dirname, './docs/k8s-security.md');
    expect(fs.existsSync(k8sDocsPath)).toBe(true);
    
    const k8sDocsContent = fs.readFileSync(k8sDocsPath, 'utf8');
    expect(k8sDocsContent).toContain('runAsNonRoot: true');
    expect(k8sDocsContent).toContain('readOnlyRootFilesystem: true');
    expect(k8sDocsContent).toContain('drop:');
    expect(k8sDocsContent).toContain('- ALL');
  });
});
