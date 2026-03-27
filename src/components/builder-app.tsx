"use client";

import LoginScreen from "@/components/builder/screens/login-screen";
import WorkspaceScreen from "@/components/builder/screens/workspace-screen";
import { useBuilderWorkspace } from "@/components/builder/hooks/use-builder-workspace";

export default function BuilderApp() {
  const workspace = useBuilderWorkspace();

  if (!workspace.connected) {
    return (
      <LoginScreen
        credentials={workspace.credentials}
        setCredentials={workspace.setCredentials}
        handleConnect={workspace.handleConnect}
        isConnecting={workspace.isConnecting}
        bannerError={workspace.bannerError}
      />
    );
  }

  return <WorkspaceScreen {...workspace} />;
}
