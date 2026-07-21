import type { ProfileInput } from "../lib/authApi";
import { DivisionsForm, type DivisionsFormProps } from "./DivisionsForm";
import { ProfileDetailsForm, type ProfileDetailsFormProps } from "./ProfileDetailsForm";

export type ProfileFormProps = {
  mode: "profile" | "divisions";
  initialValues?: ProfileDetailsFormProps["initialValues"];
  submitting?: boolean;
  serverError?: string | null;
  serverField?: string | null;
  showMembershipHints?: boolean;
  submitLabel?: string;
  onSubmit: (values: ProfileInput) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onCancel?: () => void;
  cancelLabel?: string;
};

/**
 * Thin wrapper delegating to {@link ProfileDetailsForm} or {@link DivisionsForm}
 * by section mode. Preserves existing import paths.
 */
export function ProfileForm({ mode, ...props }: ProfileFormProps) {
  if (mode === "divisions") {
    const divisionsProps: DivisionsFormProps = props;
    return <DivisionsForm {...divisionsProps} />;
  }
  const profileProps: ProfileDetailsFormProps = props;
  return <ProfileDetailsForm {...profileProps} />;
}
