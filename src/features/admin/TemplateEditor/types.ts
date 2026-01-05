import type { ITemplate } from "@/app/db";

export interface TemplateEditorProps {
  template: ITemplate | null;
  isSystemTemplate?: boolean;
  onSaved: () => void;
  onCancel: () => void;
}
