export default function PengaturanPage() {
  return (
    <div className="p-4 md:p-container-padding flex flex-col items-center justify-center min-h-[60vh] text-center">
      <span className="material-symbols-outlined text-[80px] text-primary mb-4 opacity-50">settings</span>
      <h2 className="font-display-lg text-[24px] md:text-[32px] text-on-surface mb-2">System Settings</h2>
      <p className="font-body-lg text-on-surface-variant max-w-md">
        This module is currently under development. Global application configuration, security protocols, and integration settings will be managed here.
      </p>
    </div>
  );
}
