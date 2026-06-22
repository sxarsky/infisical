import { createFileRoute, redirect } from "@tanstack/react-router";

// The secrets dashboard is always nested under an environment slug. This bare
// `/secrets` index resolves the project's default (first) environment and
// redirects there so links that omit an env slug land on a valid dashboard.
export const Route = createFileRoute(
  "/_authenticate/_inject-org-details/_org-layout/organizations/$orgId/projects/secret-management/$projectId/_secret-manager-layout/secrets"
)({
  beforeLoad: ({ context, params }) => {
    const defaultEnvironment = context.project.environments[0];

    if (!defaultEnvironment) {
      throw redirect({
        to: "/organizations/$orgId/projects/secret-management/$projectId/overview",
        params: {
          orgId: params.orgId,
          projectId: params.projectId
        }
      });
    }

    throw redirect({
      to: "/organizations/$orgId/projects/secret-management/$projectId/secrets/$envSlug",
      params: {
        orgId: params.orgId,
        projectId: params.projectId,
        envSlug: defaultEnvironment.slug
      }
    });
  }
});
