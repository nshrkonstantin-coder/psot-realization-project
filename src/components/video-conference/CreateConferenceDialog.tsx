import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

interface User {
  id: number;
  fio: string;
  email: string;
  company_id: number;
  company_name?: string;
}

interface Company {
  id: number;
  name: string;
}

interface CreateConferenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conferenceName: string;
  onConferenceNameChange: (value: string) => void;
  users: User[];
  companies: Company[];
  selectedCompanyId: string;
  onCompanyChange: (value: string) => void;
  selectedUserIds: number[];
  onUserToggle: (userId: number) => void;
  searchUser: string;
  onSearchChange: (value: string) => void;
  onCreateConference: () => Promise<void>;
  loading: boolean;
}

const CreateConferenceDialog = ({
  open,
  onOpenChange,
  conferenceName,
  onConferenceNameChange,
  users,
  companies,
  selectedCompanyId,
  onCompanyChange,
  selectedUserIds,
  onUserToggle,
  searchUser,
  onSearchChange,
  onCreateConference,
  loading
}: CreateConferenceDialogProps) => {
  const filteredUsers = users.filter(user => {
    const matchesCompany = selectedCompanyId === 'all' || user.company_id === Number(selectedCompanyId);
    const matchesSearch = user.fio.toLowerCase().includes(searchUser.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchUser.toLowerCase());
    return matchesCompany && matchesSearch;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-blue-600/30 text-white max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl text-blue-400 flex items-center gap-2">
            <Icon name="Video" size={28} />
            Создать конференцию
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-2">
          <div>
            <Label className="text-slate-300 mb-2 block">Название конференции</Label>
            <Input
              value={conferenceName}
              onChange={(e) => onConferenceNameChange(e.target.value)}
              placeholder="Введите название конференции"
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>

          <div>
            <Label className="text-slate-300 mb-2 block">Фильтр по предприятию</Label>
            <Select value={selectedCompanyId} onValueChange={onCompanyChange}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Выберите предприятие" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="all" className="text-white">Все предприятия</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={String(company.id)} className="text-white">
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-slate-300 mb-2 block">Поиск участников</Label>
            <Input
              value={searchUser}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ФИО или email"
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>

          <div>
            <Label className="text-slate-300 mb-3 block">
              Выбрано участников: {selectedUserIds.length}
            </Label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredUsers.map((user) => (
                <Card
                  key={user.id}
                  onClick={() => onUserToggle(user.id)}
                  className={`p-3 cursor-pointer transition-all ${
                    selectedUserIds.includes(user.id)
                      ? 'bg-blue-900/40 border-blue-500/50'
                      : 'bg-slate-700/50 border-slate-600/50 hover:bg-slate-600/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{user.fio}</p>
                      <p className="text-slate-400 text-sm">{user.email}</p>
                      {user.company_name && (
                        <p className="text-slate-500 text-xs mt-1">{user.company_name}</p>
                      )}
                    </div>
                    {selectedUserIds.includes(user.id) && (
                      <Icon name="Check" size={24} className="text-blue-400" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <Button
            onClick={onCreateConference}
            disabled={!conferenceName.trim() || selectedUserIds.length === 0 || loading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Icon name="Loader2" size={20} className="mr-2 animate-spin" />
                Создание...
              </>
            ) : (
              <>
                <Icon name="Plus" size={20} className="mr-2" />
                Создать конференцию
              </>
            )}
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
            disabled={loading}
          >
            Отмена
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateConferenceDialog;
