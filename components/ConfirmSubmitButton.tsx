'use client';

export default function ConfirmSubmitButton({
  children,
  confirmText,
  className = 'secondaryButton',
  formAction,
  name,
  value,
  disabled = false,
}: {
  children: React.ReactNode;
  confirmText: string;
  className?: string;
  formAction?: (formData: FormData) => void | Promise<void>;
  name?: string;
  value?: string;
  disabled?: boolean;
}) {
  return <button
    type="submit"
    className={className}
    formAction={formAction}
    name={name}
    value={value}
    disabled={disabled}
    onClick={(event) => {
      if (!window.confirm(confirmText)) event.preventDefault();
    }}
  >{children}</button>;
}
