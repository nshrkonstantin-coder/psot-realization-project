import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";

const UnderDevelopment = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.log(
      "Page under development: User attempted to access:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
      <div className="max-w-2xl mx-auto text-center">
        {/* Иконка */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
            <div className="relative bg-gradient-to-br from-yellow-500 to-orange-600 p-8 rounded-full shadow-2xl">
              <Icon name="Construction" size={80} className="text-white" />
            </div>
          </div>
        </div>

        {/* Заголовок */}
        <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-yellow-500 to-orange-600 bg-clip-text text-transparent">
          Страница в разработке
        </h1>

        {/* Описание */}
        <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-6">
          Мы усердно работаем над этой страницей
        </p>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          Скоро здесь появится что-то интересное! 
          <br />
          А пока вы можете вернуться на главную страницу.
        </p>

        {/* Кнопки */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            onClick={() => navigate(-1)}
            size="lg"
            variant="outline"
            className="border-2 border-yellow-600 text-yellow-700 dark:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 min-w-[200px]"
          >
            <Icon name="ArrowLeft" size={20} className="mr-2" />
            Назад
          </Button>
          <Button
            onClick={() => navigate('/dashboard')}
            size="lg"
            className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white min-w-[200px] shadow-lg"
          >
            <Icon name="Home" size={20} className="mr-2" />
            На главную
          </Button>
        </div>

        {/* Декоративные элементы */}
        <div className="mt-12 flex justify-center gap-6 text-gray-400 dark:text-gray-600">
          <div className="flex items-center gap-2">
            <Icon name="Hammer" size={20} />
            <span className="text-sm">Разработка</span>
          </div>
          <div className="flex items-center gap-2">
            <Icon name="Sparkles" size={20} />
            <span className="text-sm">Скоро</span>
          </div>
          <div className="flex items-center gap-2">
            <Icon name="Zap" size={20} />
            <span className="text-sm">Улучшения</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnderDevelopment;