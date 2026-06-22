import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createNotification } from "@app/components/notifications";
import { ProjectPermissionCan } from "@app/components/permissions";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
  Switch
} from "@app/components/v3";
import { ProjectPermissionActions, ProjectPermissionSub, useProject } from "@app/context";
import { projectKeys, useUpdateProject } from "@app/hooks/api";
import { Project } from "@app/hooks/api/projects/types";

export const AutoCapitalizationSection = () => {
  const { t } = useTranslation();

  const { currentProject } = useProject();
  const queryClient = useQueryClient();
  const { mutateAsync } = useUpdateProject();

  // Optimistic wrapper: flip the cached project value immediately and revert on
  // failure so the toggle responds instantly instead of waiting for the round trip.
  const { mutate: toggleAutoCapitalization } = useMutation<
    Project,
    unknown,
    boolean,
    { previousAutoCapitalization?: boolean }
  >({
    mutationFn: (state: boolean) =>
      mutateAsync({
        projectId: currentProject.id,
        autoCapitalization: state
      }),
    onMutate: async (state) => {
      const queryKey = projectKeys.getProjectById(currentProject.id);
      await queryClient.cancelQueries({ queryKey });

      const previousProject = queryClient.getQueryData<Project>(queryKey);
      const previousAutoCapitalization = previousProject?.autoCapitalization;

      if (previousProject) {
        queryClient.setQueryData<Project>(queryKey, {
          ...previousProject,
          autoCapitalization: state
        });
      }

      return { previousAutoCapitalization };
    },
    onError: (_err, _state, context) => {
      const queryKey = projectKeys.getProjectById(currentProject.id);
      const previousProject = queryClient.getQueryData<Project>(queryKey);

      if (previousProject && context?.previousAutoCapitalization !== undefined) {
        queryClient.setQueryData<Project>(queryKey, {
          ...previousProject,
          autoCapitalization: context.previousAutoCapitalization
        });
      }

      createNotification({
        text: "Failed to update auto capitalization",
        type: "error"
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: projectKeys.getProjectById(currentProject.id)
      });
    }
  });

  const handleToggleCapitalizationToggle = (state: boolean) => {
    if (!currentProject?.id) return;
    toggleAutoCapitalization(state);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{t("settings.project.enforce-capitalization")}</CardTitle>
        <CardDescription>
          {t("settings.project.enforce-capitalization-description")}
        </CardDescription>
        <CardAction>
          <ProjectPermissionCan I={ProjectPermissionActions.Edit} a={ProjectPermissionSub.Settings}>
            {(isAllowed) => (
              <Switch
                id="autoCapitalization"
                data-testid="auto-capitalization-switch"
                variant="project"
                checked={currentProject?.autoCapitalization ?? false}
                disabled={!isAllowed}
                onCheckedChange={(state) => {
                  handleToggleCapitalizationToggle(state);
                }}
              />
            )}
          </ProjectPermissionCan>
        </CardAction>
      </CardHeader>
    </Card>
  );
};
