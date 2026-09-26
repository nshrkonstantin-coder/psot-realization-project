import { Link } from 'react-router-dom';
import Icon from '@/components/ui/icon';

const modules = [
  {
    icon: 'ClipboardCheck',
    title: 'ПАБ — Поведенческий аудит безопасности',
    description: 'Регистрация наблюдений, планирование проверок, реестр и аналитика по выявленным нарушениям на местах.',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: 'ShieldAlert',
    title: 'Производственный контроль',
    description: 'Фиксация нарушений, контроль устранения, архив проверок и полная история по каждому объекту.',
    color: 'from-red-500 to-red-600',
  },
  {
    icon: 'HardHat',
    title: 'ОТ и ПБ',
    description: 'Инструктажи, СИЗ, инциденты, документы и аналитика охраны труда и промышленной безопасности в одном рабочем пространстве.',
    color: 'from-orange-500 to-orange-600',
  },
  {
    icon: 'Users',
    title: 'КБТ — Комитет по безопасности труда',
    description: 'Подача отчётов, протоколы заседаний, программы обучения и статистика работы комитета.',
    color: 'from-purple-500 to-purple-600',
  },
  {
    icon: 'HeartPulse',
    title: 'Здравпункт',
    description: 'Реестр работников, периодичность медосмотров и контроль состояния здоровья персонала.',
    color: 'from-green-500 to-green-600',
  },
  {
    icon: 'FileText',
    title: 'Реестр предписаний и поручений',
    description: 'Единый журнал задач и предписаний с контролем сроков исполнения и ответственных.',
    color: 'from-amber-500 to-amber-600',
  },
  {
    icon: 'BarChart3',
    title: 'Аналитика и отчётность',
    description: 'Наглядные графики, показатели по подразделениям и автоматическая выгрузка отчётов в Word/PDF/Excel.',
    color: 'from-cyan-500 to-cyan-600',
  },
  {
    icon: 'Building2',
    title: 'Управление организацией',
    description: 'Гибкая настройка пользователей, ролей, подразделений и модулей под структуру вашего предприятия.',
    color: 'from-slate-500 to-slate-600',
  },
];

const benefits = [
  { icon: 'Clock', text: 'Экономия времени специалистов по ОТ на рутинных отчётах' },
  { icon: 'TrendingDown', text: 'Снижение количества нарушений за счёт постоянного контроля' },
  { icon: 'Eye', text: 'Полная прозрачность процессов для руководства' },
  { icon: 'Smartphone', text: 'Доступ с компьютера и телефона в любое время' },
];

const screenshots = [
  'https://cdn.poehali.dev/projects/6a204355-7d07-4fa8-8be9-b352073201f1/files/cb315433-a463-4960-b388-0735d096e842.jpg',
  'https://cdn.poehali.dev/projects/6a204355-7d07-4fa8-8be9-b352073201f1/files/95f2b890-6d12-4ff6-a8f9-987fd867c2c0.jpg',
];

export default function ProductPresentation() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-yellow-600 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-700 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-amber-800 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="max-w-6xl mx-auto px-4 pt-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors">
            <Icon name="ArrowLeft" size={20} />
            <span>Назад ко входу</span>
          </Link>
          <img src="https://cdn.poehali.dev/files/a8450d96-c4de-4091-8a4e-f993560bc89e.png" alt="АСУБТ" className="w-12 h-12 object-contain" />
        </header>

        {/* Hero */}
        <section className="max-w-6xl mx-auto px-4 pt-12 pb-16 text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600">
              АСУБТ
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-2">
            Автоматизированная система управления безопасностью труда
          </p>
          <p className="text-orange-400 max-w-2xl mx-auto mb-8">
            Единая платформа для охраны труда и промышленной безопасности: от аудитов на местах до отчётов для руководства
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/demo"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-600 to-orange-700 hover:from-yellow-500 hover:to-orange-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all"
            >
              <Icon name="PlayCircle" size={20} />
              Посмотреть демо-версию
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-2 border-2 border-yellow-600/50 text-yellow-500 hover:bg-yellow-600/10 font-semibold py-3 px-6 rounded-xl transition-all"
            >
              <Icon name="LogIn" size={20} />
              Войти в систему
            </Link>
          </div>
        </section>

        {/* Задачи, которые решает */}
        <section className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">Какие задачи решает система</h2>
          <p className="text-gray-400 text-center mb-10 max-w-2xl mx-auto">
            АСУБТ заменяет разрозненные таблицы и бумажные журналы единым цифровым контуром безопасности труда
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((b) => (
              <div
                key={b.text}
                className="bg-gradient-to-br from-slate-800 to-slate-900 border border-yellow-600/20 rounded-2xl p-6 text-center hover:border-yellow-600/50 transition-all"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-600 to-orange-700 mb-4">
                  <Icon name={b.icon as any} size={28} className="text-white" />
                </div>
                <p className="text-gray-300 text-sm">{b.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Как выглядит изнутри */}
        <section className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">Как выглядит изнутри</h2>
          <p className="text-gray-400 text-center mb-10 max-w-2xl mx-auto">
            Современный интерфейс с наглядной аналитикой, удобными таблицами и понятной навигацией
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {screenshots.map((src) => (
              <div key={src} className="relative rounded-2xl overflow-hidden border-2 border-yellow-600/30 shadow-2xl group">
                <img src={src} alt="Интерфейс АСУБТ" className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" />
              </div>
            ))}
          </div>
        </section>

        {/* Модули */}
        <section className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">Что за проект</h2>
          <p className="text-gray-400 text-center mb-10 max-w-2xl mx-auto">
            Модульная структура покрывает все ключевые процессы охраны труда и промышленной безопасности
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {modules.map((m) => (
              <div
                key={m.title}
                className="group relative bg-gradient-to-br from-slate-800 to-slate-900 border border-yellow-600/20 rounded-2xl p-6 hover:border-yellow-600/50 hover:scale-105 transition-all overflow-hidden"
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${m.color} shadow-lg mb-4 transform group-hover:scale-110 transition-transform`}>
                  <Icon name={m.icon as any} size={24} className="text-white" />
                </div>
                <h3 className="font-semibold text-white mb-2 text-sm">{m.title}</h3>
                <p className="text-gray-400 text-xs leading-relaxed">{m.description}</p>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-600 to-orange-600 scale-x-0 group-hover:scale-x-100 transition-transform" />
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-yellow-600/30 rounded-2xl p-10 shadow-2xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Готовы попробовать?</h2>
            <p className="text-gray-300 mb-8">
              Войдите в демо-режим и оцените возможности системы уже сейчас, без регистрации
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/demo"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-600 to-orange-700 hover:from-yellow-500 hover:to-orange-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg transform hover:scale-105 transition-all"
              >
                <Icon name="PlayCircle" size={20} />
                Открыть демо-версию
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 border-2 border-yellow-600/50 text-yellow-500 hover:bg-yellow-600/10 font-semibold py-3 px-8 rounded-xl transition-all"
              >
                <Icon name="UserPlus" size={20} />
                Зарегистрироваться
              </Link>
            </div>
          </div>
        </section>

        <footer className="text-center text-gray-500 text-sm py-8">
          АСУБТ — Автоматизированная система управления безопасностью труда
        </footer>
      </div>
    </div>
  );
}
