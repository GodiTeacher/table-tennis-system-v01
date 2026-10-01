'use client';

export default function ConfirmSubmitButton({
  children,
  confirmText,
  className = 'secondaryButton',
  formAction,
  name,
  value,
  disabled = false,
  form,
}: {
  children: React.ReactNode;
  confirmText: string;
  className?: string;
  formAction?: (formData: FormData) => void | Promise<void>;
  name?: string;
  value?: string;
  disabled?: boolean;
  form?: string;
}) {
  return <button
    type="submit"
    className={className}
    formAction={formAction}
    name={name}
    value={value}
    disabled={disabled}
    form={form}
    onClick={(event) => {
      if (!window.confirm(confirmText)) {
        event.preventDefault();
        return;
      }

      // When a button overrides a parent form with formAction, some runtimes can
      // omit the clicked submitter's name/value from FormData. Write the value
      // explicitly into the target form before submit so server actions always
      // receive the intended record id.
      if (name && value) {
        const targetForm = event.currentTarget.form;
        if (targetForm) {
          const marker = `confirm-submit-${name}`;
          let hidden = targetForm.querySelector<HTMLInputElement>(`input[data-confirm-marker="${marker}"]`);
          if (!hidden) {
            hidden = document.createElement('input');
            hidden.type = 'hidden';
            hidden.dataset.confirmMarker = marker;
            targetForm.appendChild(hidden);
          }
          hidden.name = name;
          hidden.value = value;
        }
      }
    }}
  >{children}</button>;
}
