import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { Badge } from '@/components/ui/badge';

const OtipbDocumentsPage = () => {
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/');
      return;
    }

    const department = localStorage.getItem('userDepartment');
    setHasAccess(department === 'ОТиПБ');
  }, [navigate]);

  if (hasAccess === null) {
    return null;
  }

  if (!hasAccess) {
    navigate('/otipb-department');
    return null;
  }

  const documentCategories = [
    { name: 'Приказы', count: 45, icon: 'FileSignature', color: 'blue' },
    { name: 'Инструкции', count: 78, icon: 'BookOpen', color: 'green' },
    { name: 'Протоколы', count: 34, icon: 'FileText', color: 'purple' },
    { name: 'Акты', count: 23, icon: 'FileCheck', color: 'orange' },
  ];

  const documents = [
    { 
      id: 1, 
      name: 'Приказ о назначении ответственных за пожарную безопасность', 
      type: 'Приказ', 
      date: '01.12.2024', 
      author: 'Петров П.П.',
      status: 'active' 
    },
    { 
      id: 2, 
      name: 'Инструкция по охране труда для работников цеха №1', 
      type: 'Инструкция', 
      date: '15.11.2024', 
      author: 'Семенов С.С.',
      status: 'active' 
    },
    { 
      id: 3, 
      name: 'Протокол проверки знаний по охране труда', 
      type: 'Протокол', 
      date: '10.11.2024', 
      author: 'Петров П.П.',
      status: 'archived' 
    },
    { 
      id: 4, 
      name: 'Акт проверки состояния охраны труда', 
      type: 'Акт', 
      date: '05.11.2024', 
      author: 'Семенов С.С.',
      status: 'active' 
    },
    { 
      id: 5, 
      name: 'Инструкция по пожарной безопасности в офисных помещениях', 
      type: 'Инструкция', 
      date: '20.10.2024', 
      author: 'Петров П.П.',
      status: 'active' 
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/otipb-department')}
              variant="outline"
              className="border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10"
            >
              <Icon name="ArrowLeft" size={20} className="mr-2" />
              Назад
            </Button>
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-3 rounded-xl shadow-lg">
                <Icon name="FileText" size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Документы</h1>
                <p className="text-slate-400 text-sm mt-1">Нормативная документация и приказы</p>
              </div>
            </div>
          </div>
          <Button className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white">
            <Icon name="Plus" size={20} className="mr-2" />
            Добавить документ
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {documentCategories.map((category, index) => (
            <Card key={index} className="bg-slate-800/50 border-indigo-500/30 p-6 cursor-pointer hover:border-indigo-500 transition-all">
              <div className="flex items-center gap-3">
                <div className={`bg-gradient-to-br from-${category.color}-500 to-${category.color}-600 p-3 rounded-xl`}>
                  <Icon name={category.icon} size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">{category.name}</p>
                  <p className="text-2xl font-bold text-white">{category.count}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="bg-slate-800/50 border-indigo-500/30">
          <div className="p-6 border-b border-slate-700/50 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Icon name="FolderOpen" size={24} />
              База документов
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="border-indigo-500/50 text-indigo-400">
                <Icon name="Search" size={16} className="mr-2" />
                Поиск
              </Button>
              <Button variant="outline" size="sm" className="border-indigo-500/50 text-indigo-400">
                <Icon name="Filter" size={16} className="mr-2" />
                Фильтр
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/30">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Наименование документа</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Тип</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Дата</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Автор</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Статус</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-6 py-4 text-sm text-white max-w-md">{doc.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{doc.type}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{doc.date}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{doc.author}</td>
                    <td className="px-6 py-4">
                      {doc.status === 'active' ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          Действует
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">
                          Архив
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10"
                        >
                          <Icon name="Eye" size={16} className="mr-1" />
                          Просмотр
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                        >
                          <Icon name="Download" size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default OtipbDocumentsPage;
