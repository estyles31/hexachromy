// /frontend/src/components/MessagePanel.tsx
import type { FrontendModuleDefinition } from "../../../../modules/FrontendModuleDefinition";
import "./MessagePanel.css";

interface Props {
  module: FrontendModuleDefinition<unknown, unknown>;
}

export default function MessagePanel({ module }: Props) {
  if (!module.MessagePanelComponent) {
    return null;
  }

  return (
    <div className="message-panel">
      <module.MessagePanelComponent />
    </div>
  );
}
