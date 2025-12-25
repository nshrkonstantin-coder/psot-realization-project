import { ReactNode } from 'react';

interface LightThemeWrapperProps {
  children: ReactNode;
}

/**
 * Компонент-обёртка для форм, которые должны всегда оставаться светлыми
 * независимо от глобальной темы приложения
 */
export default function LightThemeWrapper({ children }: LightThemeWrapperProps) {
  return (
    <div className="light-theme-forced">
      {children}
      <style>{`
        .light-theme-forced,
        .light-theme-forced * {
          color-scheme: light !important;
        }
        .light-theme-forced {
          background: white !important;
          color: rgb(15 23 42) !important; /* slate-900 */
        }
        .light-theme-forced h1,
        .light-theme-forced h2,
        .light-theme-forced h3,
        .light-theme-forced h4,
        .light-theme-forced h5,
        .light-theme-forced h6,
        .light-theme-forced p,
        .light-theme-forced span,
        .light-theme-forced label,
        .light-theme-forced strong,
        .light-theme-forced td,
        .light-theme-forced th {
          color: rgb(15 23 42) !important; /* slate-900 */
        }
        .light-theme-forced input,
        .light-theme-forced textarea,
        .light-theme-forced select {
          background: white !important;
          color: rgb(15 23 42) !important;
          border-color: rgb(203 213 225) !important; /* slate-300 */
        }
        .light-theme-forced button {
          color: rgb(15 23 42) !important;
        }
      `}</style>
    </div>
  );
}
