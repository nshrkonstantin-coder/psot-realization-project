import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

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

interface Conference {
  id: string;
  name: string;
  creator_id: number;
  creator_name: string;
  participants: number[];
  created_at: string;
  status: 'active' | 'ended';
}

const VideoConferencePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [userId, setUserId] = useState<number | null>(null);
  const [userFio, setUserFio] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [conferences, setConferences] = useState<Conference[]>([]);
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [conferenceName, setConferenceName] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [searchUser, setSearchUser] = useState('');
  
  const [inCall, setInCall] = useState(false);
  const [currentConference, setCurrentConference] = useState<Conference | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [loading, setLoading] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const MESSAGING_URL = 'https://functions.poehali.dev/0bd87c15-af37-4e08-93fa-f921a3c18bee';
  const ORGANIZATIONS_URL = 'https://functions.poehali.dev/cc1f4cd3-7f42-42f3-b55b-1d7da3d5b869';

  useEffect(() => {
    const id = localStorage.getItem('userId');
    const fio = localStorage.getItem('userFio');
    
    if (!id) {
      navigate('/');
      return;
    }

    setUserId(Number(id));
    setUserFio(fio || '');
    
    loadCompanies();
    loadUsers();
    loadConferences();

    const roomId = searchParams.get('room');
    if (roomId) {
      joinConferenceByRoom(roomId);
    }
  }, [navigate, searchParams]);

  const loadCompanies = async () => {
    try {
      const response = await fetch(`${ORGANIZATIONS_URL}?action=list`, {
        headers: { 'X-User-Id': localStorage.getItem('userId')! }
      });
      const data = await response.json();
      if (data.organizations) {
        setCompanies(data.organizations);
      }
    } catch (error) {
      console.error('Ошибка загрузки предприятий:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch(`${MESSAGING_URL}?action=list_all_users`, {
        headers: { 'X-User-Id': localStorage.getItem('userId')! }
      });
      const data = await response.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
    }
  };

  const loadConferences = async () => {
    const mockConferences: Conference[] = [
      {
        id: 'conf-' + Date.now(),
        name: 'Совещание по безопасности',
        creator_id: 1,
        creator_name: 'Администратор',
        participants: [1, 2, 3],
        created_at: new Date().toISOString(),
        status: 'active'
      }
    ];
    setConferences(mockConferences);
  };

  const joinConferenceByRoom = async (roomId: string) => {
    const conf = conferences.find(c => c.id === roomId);
    if (conf) {
      await startCall(conf);
    }
  };

  const startCall = async (conference: Conference) => {
    try {
      setLoading(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setCurrentConference(conference);
      setInCall(true);
      toast({ title: 'Подключение к конференции...' });
    } catch (error) {
      console.error('Ошибка доступа к камере/микрофону:', error);
      toast({ 
        title: 'Ошибка доступа к устройствам', 
        description: 'Проверьте разрешения браузера',
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConference = async () => {
    if (!conferenceName.trim() || selectedUserIds.length === 0) {
      toast({ title: 'Введите название и выберите участников', variant: 'destructive' });
      return;
    }

    const newConference: Conference = {
      id: 'conf-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      name: conferenceName,
      creator_id: userId!,
      creator_name: userFio,
      participants: [userId!, ...selectedUserIds],
      created_at: new Date().toISOString(),
      status: 'active'
    };

    setConferences([newConference, ...conferences]);
    setShowCreateDialog(false);
    setConferenceName('');
    setSelectedUserIds([]);
    
    toast({ title: 'Конференция создана' });
    await startCall(newConference);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const endCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    setInCall(false);
    setCurrentConference(null);
    setIsMuted(false);
    setIsVideoOff(false);
  };

  const copyRoomLink = (conferenceId: string) => {
    const link = `${window.location.origin}/video-conference?room=${conferenceId}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Ссылка скопирована' });
  };

  const toggleUserSelection = (id: number) => {
    setSelectedUserIds(prev =>
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  const getFilteredUsers = () => {
    return users.filter(u => {
      if (u.id === userId) return false;
      const matchesSearch = u.fio.toLowerCase().includes(searchUser.toLowerCase()) ||
                           u.email.toLowerCase().includes(searchUser.toLowerCase());
      const matchesCompany = selectedCompanyId === 'all' || u.company_id === Number(selectedCompanyId);
      return matchesSearch && matchesCompany;
    });
  };

  const filteredUsers = getFilteredUsers();

  if (inCall && currentConference) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col">
        <div className="bg-slate-800 border-b border-slate-700 p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Icon name="Video" size={24} className="text-pink-500" />
              <div>
                <h2 className="text-white font-semibold">{currentConference.name}</h2>
                <p className="text-slate-400 text-sm">{currentConference.participants.length} участников</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={toggleMute} variant={isMuted ? 'destructive' : 'outline'}>
                <Icon name={isMuted ? 'MicOff' : 'Mic'} size={20} />
              </Button>
              <Button onClick={toggleVideo} variant={isVideoOff ? 'destructive' : 'outline'}>
                <Icon name={isVideoOff ? 'VideoOff' : 'Video'} size={20} />
              </Button>
              <Button onClick={() => copyRoomLink(currentConference.id)} variant="outline">
                <Icon name="Share2" size={20} />
              </Button>
              <Button onClick={endCall} variant="destructive">
                <Icon name="PhoneOff" size={20} className="mr-2" />
                Завершить
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="relative bg-slate-800 rounded-lg overflow-hidden shadow-2xl">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-4 bg-slate-900/80 px-3 py-1 rounded text-white">
              Собеседник
            </div>
          </div>

          <div className="relative bg-slate-800 rounded-lg overflow-hidden shadow-2xl">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
            />
            <div className="absolute bottom-4 left-4 bg-slate-900/80 px-3 py-1 rounded text-white">
              Вы ({userFio})
            </div>
            {isVideoOff && (
              <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                <Icon name="VideoOff" size={64} className="text-slate-600" />
              </div>
            )}
          </div>
        </div>

        <style>{`
          .mirror {
            transform: scaleX(-1);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-pink-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate(-1)} variant="outline" className="border-pink-600/50">
              <Icon name="ArrowLeft" size={20} />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Видео конференция</h1>
              <p className="text-pink-400">Создавайте и присоединяйтесь к видеозвонкам</p>
            </div>
          </div>
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="bg-pink-600 hover:bg-pink-700"
          >
            <Icon name="Plus" size={20} className="mr-2" />
            Создать конференцию
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {conferences.map(conf => (
            <Card key={conf.id} className="bg-slate-800/50 border-pink-600/30 hover:border-pink-600 transition-all">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Icon name="Video" size={20} className="text-pink-500" />
                  {conf.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-slate-400 text-sm space-y-1">
                  <p>Организатор: {conf.creator_name}</p>
                  <p>Участников: {conf.participants.length}</p>
                  <p>Статус: <span className="text-green-500">Активна</span></p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => startCall(conf)}
                    className="flex-1 bg-pink-600 hover:bg-pink-700"
                    disabled={loading}
                  >
                    <Icon name="Video" size={16} className="mr-2" />
                    Присоединиться
                  </Button>
                  <Button 
                    onClick={() => copyRoomLink(conf.id)}
                    variant="outline"
                    className="border-pink-600/50"
                  >
                    <Icon name="Share2" size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {conferences.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Icon name="Video" size={64} className="text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">Нет активных конференций</p>
              <p className="text-slate-500 text-sm mt-2">Создайте новую конференцию для начала</p>
            </div>
          )}
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="bg-slate-800 border-pink-600/30 max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Создать видеоконференцию</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-white">Название конференции</Label>
                <Input
                  value={conferenceName}
                  onChange={(e) => setConferenceName(e.target.value)}
                  placeholder="Введите название конференции"
                  className="bg-slate-900/50 text-white border-pink-600/30"
                />
              </div>

              <div>
                <Label className="text-white">Фильтр по предприятию</Label>
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger className="bg-slate-900/50 text-white border-pink-600/30">
                    <SelectValue placeholder="Выберите предприятие" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все предприятия</SelectItem>
                    {companies.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-white">Участники ({selectedUserIds.length})</Label>
                <Input
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  placeholder="Поиск пользователей..."
                  className="bg-slate-900/50 text-white border-pink-600/30 mb-2"
                />
                <div className="bg-slate-900/50 rounded-lg p-4 max-h-[300px] overflow-y-auto space-y-2">
                  {filteredUsers.length === 0 ? (
                    <p className="text-slate-400 text-center py-4">Пользователи не найдены</p>
                  ) : (
                    filteredUsers.map(user => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-2 hover:bg-slate-700/30 rounded cursor-pointer"
                        onClick={() => toggleUserSelection(user.id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <p className="text-white">{user.fio}</p>
                          <p className="text-slate-400 text-sm">
                            {user.email} · {user.company_name || 'Без предприятия'}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <Button
                onClick={handleCreateConference}
                disabled={loading || !conferenceName.trim() || selectedUserIds.length === 0}
                className="w-full bg-pink-600 hover:bg-pink-700"
              >
                <Icon name="Video" size={20} className="mr-2" />
                Создать и присоединиться
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default VideoConferencePage;
