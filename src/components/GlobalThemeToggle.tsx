import { useTheme } from '@/contexts/ThemeContext';
import Icon from '@/components/ui/icon';

/**
 * Глобальный переключатель темы и приветствия - отображается на всех страницах
 * Фиксированная позиция в правом верхнем углу
 */
const GlobalThemeToggle = () => {
  const { theme, toggleTheme, showGreeting, toggleGreeting } = useTheme();

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
      {/* Переключатель темы */}
      <button
        onClick={toggleTheme}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg hover:shadow-xl transition-all hover:scale-105"
        title={theme === 'light' ? 'Переключить на тёмную тему' : 'Переключить на светлую тему'}
      >
        {theme === 'light' ? (
          <>
            <Icon name="Moon" size={20} className="text-slate-700" />
            <span className="text-sm font-medium text-slate-700">Тёмная</span>
          </>
        ) : (
          <>
            <Icon name="Sun" size={20} className="text-yellow-400" />
            <span className="text-sm font-medium text-slate-200">Светлая</span>
          </>
        )}
      </button>

      {/* Переключатель приветствия */}
      <button
        onClick={toggleGreeting}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg hover:shadow-xl transition-all hover:scale-105"
        title={showGreeting ? 'Скрыть приветствие' : 'Показать приветствие'}
      >
        {showGreeting ? (
          <>
            <Icon name="UserCircle" size={20} className="text-blue-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Приветствие</span>
          </>
        ) : (
          <>
            <Icon name="UserX" size={20} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Приветствие</span>
          </>
        )}
      </button>
    </div>
  );
};

export default GlobalThemeToggle;