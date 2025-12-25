import { useTheme } from '@/contexts/ThemeContext';
import Icon from '@/components/ui/icon';

const ThemeToggle = () => {
  const { theme, toggleTheme, showGreeting, toggleGreeting } = useTheme();

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-slate-800/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700/50 dark:border-slate-700/50">
      {/* Переключатель темы */}
      <button
        onClick={toggleTheme}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-slate-700/50 dark:hover:bg-slate-700/50 transition-colors"
        title={theme === 'light' ? 'Переключить на тёмную тему' : 'Переключить на светлую тему'}
      >
        {theme === 'light' ? (
          <>
            <Icon name="Moon" size={18} className="text-slate-300" />
            <span className="text-sm text-slate-300">Тёмная</span>
          </>
        ) : (
          <>
            <Icon name="Sun" size={18} className="text-yellow-400" />
            <span className="text-sm text-slate-300">Светлая</span>
          </>
        )}
      </button>

      {/* Разделитель */}
      <div className="w-px h-6 bg-slate-700/50 dark:bg-slate-700/50" />

      {/* Переключатель приветствия */}
      <button
        onClick={toggleGreeting}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-slate-700/50 dark:hover:bg-slate-700/50 transition-colors"
        title={showGreeting ? 'Отключить приветствие' : 'Включить приветствие'}
      >
        <Icon 
          name={showGreeting ? "MessageCircle" : "MessageCircleOff"} 
          size={18} 
          className={showGreeting ? "text-green-400" : "text-slate-500"}
        />
        <span className="text-sm text-slate-300">
          {showGreeting ? 'Вкл. приветствие' : 'Откл. приветствие'}
        </span>
      </button>
    </div>
  );
};

export default ThemeToggle;
