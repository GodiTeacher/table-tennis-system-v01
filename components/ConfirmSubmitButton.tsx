'use client';

export default function ConfirmSubmitButton({
  children,
  confirmText,
  className = 'secondaryButton',
}: {
  children: React.ReactNode;
  confirmText: string;
  className?: string;
}) {
  return <button type="submit" className={className} onClick={(event) => {
    if (!window.confirm(confirmText)) event.preventDefault();
  }}>{children}</button>;
}
