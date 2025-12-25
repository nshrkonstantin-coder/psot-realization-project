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
        /* ПРИНУДИТЕЛЬНО СВЕТЛАЯ ТЕМА - ПЕРЕОПРЕДЕЛЯЕТ DARK MODE */
        .light-theme-forced,
        .light-theme-forced *,
        .dark .light-theme-forced,
        .dark .light-theme-forced * {
          color-scheme: light !important;
        }
        
        .light-theme-forced,
        .dark .light-theme-forced {
          background-color: white !important;
          background: white !important;
        }
        
        /* Все вложенные div тоже белые */
        .light-theme-forced > div,
        .dark .light-theme-forced > div {
          background: white !important;
        }
        
        /* Заголовки и текст */
        .light-theme-forced h1,
        .light-theme-forced h2,
        .light-theme-forced h3,
        .light-theme-forced h4,
        .light-theme-forced h5,
        .light-theme-forced h6,
        .dark .light-theme-forced h1,
        .dark .light-theme-forced h2,
        .dark .light-theme-forced h3,
        .dark .light-theme-forced h4,
        .dark .light-theme-forced h5,
        .dark .light-theme-forced h6 {
          color: rgb(15 23 42) !important; /* slate-900 */
        }
        
        .light-theme-forced p,
        .light-theme-forced label,
        .light-theme-forced strong,
        .light-theme-forced td,
        .light-theme-forced th,
        .light-theme-forced span,
        .light-theme-forced div,
        .dark .light-theme-forced p,
        .dark .light-theme-forced label,
        .dark .light-theme-forced strong,
        .dark .light-theme-forced td,
        .dark .light-theme-forced th,
        .dark .light-theme-forced span,
        .dark .light-theme-forced div {
          color: rgb(51 65 85) !important; /* slate-700 */
        }
        
        /* Поля ввода */
        .light-theme-forced input:not([type="checkbox"]):not([type="radio"]),
        .light-theme-forced textarea,
        .light-theme-forced select,
        .light-theme-forced [role="combobox"],
        .dark .light-theme-forced input:not([type="checkbox"]):not([type="radio"]),
        .dark .light-theme-forced textarea,
        .dark .light-theme-forced select,
        .dark .light-theme-forced [role="combobox"] {
          background: white !important;
          background-color: white !important;
          color: rgb(15 23 42) !important;
          border-color: rgb(203 213 225) !important; /* slate-300 */
        }
        
        /* Card компоненты */
        .light-theme-forced [class*="card"],
        .light-theme-forced [class*="Card"],
        .light-theme-forced [data-card],
        .dark .light-theme-forced [class*="card"],
        .dark .light-theme-forced [class*="Card"],
        .dark .light-theme-forced [data-card] {
          background: white !important;
          background-color: white !important;
          border-color: rgb(226 232 240) !important; /* slate-200 */
        }
        
        /* Выпадающие списки */
        .light-theme-forced [role="listbox"],
        .light-theme-forced [data-radix-popper-content-wrapper],
        .dark .light-theme-forced [role="listbox"],
        .dark .light-theme-forced [data-radix-popper-content-wrapper] {
          background: white !important;
          color: rgb(15 23 42) !important;
        }
      `}</style>
    </div>
  );
}