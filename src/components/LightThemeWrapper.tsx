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
        /* Принудительно светлая тема для форм */
        .light-theme-forced {
          background: white !important;
          color: rgb(15 23 42) !important;
          color-scheme: light !important;
        }
        
        /* Заголовки и текст */
        .light-theme-forced h1,
        .light-theme-forced h2,
        .light-theme-forced h3,
        .light-theme-forced h4,
        .light-theme-forced h5,
        .light-theme-forced h6 {
          color: rgb(15 23 42) !important; /* slate-900 */
        }
        
        .light-theme-forced p,
        .light-theme-forced label,
        .light-theme-forced strong,
        .light-theme-forced td,
        .light-theme-forced th {
          color: rgb(51 65 85) !important; /* slate-700 */
        }
        
        /* Поля ввода */
        .light-theme-forced input:not([type="checkbox"]):not([type="radio"]),
        .light-theme-forced textarea,
        .light-theme-forced select,
        .light-theme-forced [role="combobox"] {
          background: white !important;
          color: rgb(15 23 42) !important;
          border-color: rgb(203 213 225) !important; /* slate-300 */
        }
        
        /* Card компоненты */
        .light-theme-forced [class*="card"],
        .light-theme-forced [class*="Card"],
        .light-theme-forced [data-card] {
          background: white !important;
          border-color: rgb(226 232 240) !important; /* slate-200 */
        }
        
        /* Кнопки НЕ ТРОГАЕМ - они должны работать по своим классам */
        /* Убрали все правила для button чтобы они адаптировались под тему */
      `}</style>
    </div>
  );
}