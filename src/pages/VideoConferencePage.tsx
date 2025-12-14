import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import OrganizationLogo from '@/components/OrganizationLogo';
import DeviceCheckDialog from '@/components/video-conference/DeviceCheckDialog';
import CreateConferenceDialog from '@/components/video-conference/CreateConferenceDialog';
import ConferenceCard from '@/components/video-conference/ConferenceCard';
import ActiveCallView from '@/components/video-conference/ActiveCallView';

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
  is_favorite?: boolean;
  duration?: number;
  ended_at?: string;
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
  const [myRooms, setMyRooms] = useState<Conference[]>([]);
  const [favoriteRooms, setFavoriteRooms] = useState<Conference[]>([]);
  const [historyRooms, setHistoryRooms] = useState<Conference[]>([]);
  const [activeTab, setActiveTab] = useState('active');
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeviceCheck, setShowDeviceCheck] = useState(false);
  const [conferenceName, setConferenceName] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [searchUser, setSearchUser] = useState('');
  
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [availableMicrophones, setAvailableMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  const [inCall, setInCall] = useState(false);
  const [currentConference, setCurrentConference] = useState<Conference | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [participantsCount, setParticipantsCount] = useState(1);
  const [networkQuality, setNetworkQuality] = useState<'high' | 'medium' | 'low'>('high');

  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const qualityMonitorRef = useRef<NodeJS.Timeout | null>(null);

  const MESSAGING_URL = 'https://functions.poehali.dev/0bd87c15-af37-4e08-93fa-f921a3c18bee';
  const ORGANIZATIONS_URL = 'https://functions.poehali.dev/5fa1bf89-3c17-4533-889a-7273e1ef1e3b';

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

  useEffect(() => {
    localStorage.setItem('videoConferences', JSON.stringify(conferences));
    localStorage.setItem('myVideoRooms', JSON.stringify(myRooms));
    localStorage.setItem('favoriteVideoRooms', JSON.stringify(favoriteRooms));
    localStorage.setItem('videoHistory', JSON.stringify(historyRooms));
  }, [conferences, myRooms, favoriteRooms, historyRooms]);

  const loadCompanies = async () => {
    try {
      const response = await fetch(`${ORGANIZATIONS_URL}?action=list`, {
        headers: { 'X-User-Id': localStorage.getItem('userId')! }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setCompanies(data);
      } else if (data.organizations) {
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
    const savedConferences = localStorage.getItem('videoConferences');
    const savedMyRooms = localStorage.getItem('myVideoRooms');
    const savedFavorites = localStorage.getItem('favoriteVideoRooms');
    const savedHistory = localStorage.getItem('videoHistory');
    
    if (savedConferences) {
      setConferences(JSON.parse(savedConferences));
    }
    if (savedMyRooms) {
      setMyRooms(JSON.parse(savedMyRooms));
    }
    if (savedFavorites) {
      setFavoriteRooms(JSON.parse(savedFavorites));
    }
    if (savedHistory) {
      setHistoryRooms(JSON.parse(savedHistory));
    }
  };
  
  const toggleFavorite = (confId: string) => {
    setFavoriteRooms(prev => {
      const exists = prev.find(c => c.id === confId);
      if (exists) {
        return prev.filter(c => c.id !== confId);
      } else {
        const conf = [...conferences, ...myRooms].find(c => c.id === confId);
        if (conf) {
          return [...prev, { ...conf, is_favorite: true }];
        }
      }
      return prev;
    });
  };
  
  const addToHistory = (conference: Conference) => {
    setHistoryRooms(prev => {
      const filtered = prev.filter(c => c.id !== conference.id);
      return [
        { 
          ...conference, 
          ended_at: new Date().toISOString(),
          status: 'ended' as const
        }, 
        ...filtered
      ].slice(0, 20);
    });
  };

  const joinConferenceByRoom = async (roomId: string) => {
    const conf = conferences.find(c => c.id === roomId);
    if (conf) {
      await startCall(conf);
    }
  };
  
  const checkDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(d => d.kind === 'videoinput');
      const microphones = devices.filter(d => d.kind === 'audioinput');
      
      setAvailableCameras(cameras);
      setAvailableMicrophones(microphones);
      
      if (cameras.length > 0) setSelectedCamera(cameras[0].deviceId);
      if (microphones.length > 0) setSelectedMicrophone(microphones[0].deviceId);
      
      return { cameras, microphones };
    } catch (error) {
      console.error('Ошибка получения устройств:', error);
      toast({ 
        title: 'Не удалось получить список устройств', 
        variant: 'destructive' 
      });
      return { cameras: [], microphones: [] };
    }
  };
  
  const startPreview = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: selectedCamera ? { deviceId: selectedCamera } : true,
        audio: selectedMicrophone ? { deviceId: selectedMicrophone } : true
      });
      
      setPreviewStream(stream);
      
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateAudioLevel = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const level = Math.min(100, (average / 255) * 100 * 2);
        
        setAudioLevel(level);
        requestAnimationFrame(updateAudioLevel);
      };
      
      updateAudioLevel();
      
      toast({ title: 'Устройства готовы' });
    } catch (error) {
      console.error('Ошибка доступа к устройствам:', error);
      toast({ 
        title: 'Ошибка доступа к камере или микрофону', 
        description: 'Проверьте разрешения браузера',
        variant: 'destructive' 
      });
    }
  };
  
  const stopPreview = () => {
    if (previewStream) {
      previewStream.getTracks().forEach(track => track.stop());
      setPreviewStream(null);
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    setAudioLevel(0);
  };
  
  const handleOpenDeviceCheck = async () => {
    const devices = await checkDevices();
    if (devices.cameras.length === 0 || devices.microphones.length === 0) {
      toast({
        title: 'Устройства не найдены',
        description: 'Подключите камеру и микрофон',
        variant: 'destructive'
      });
      return;
    }
    setShowDeviceCheck(true);
  };
  
  const handleProceedToCreate = () => {
    stopPreview();
    setShowDeviceCheck(false);
    setShowCreateDialog(true);
  };

  const handleUserToggle = (userId: number) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const createConference = async () => {
    if (!conferenceName.trim() || selectedUserIds.length === 0) {
      toast({
        title: 'Заполните все поля',
        description: 'Укажите название и выберите участников',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      const conferenceId = `conf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newConference: Conference = {
        id: conferenceId,
        name: conferenceName,
        creator_id: userId!,
        creator_name: userFio,
        participants: [userId!, ...selectedUserIds],
        created_at: new Date().toISOString(),
        status: 'active'
      };

      setMyRooms(prev => [...prev, newConference]);

      const conferenceUrl = `${window.location.origin}/video-conference?room=${conferenceId}`;
      
      const response = await fetch(MESSAGING_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': String(userId)
        },
        body: JSON.stringify({
          action: 'send_mass_message',
          user_ids: selectedUserIds,
          message_text: `🎥 Приглашение на видеоконференцию "${conferenceName}"\n\nОрганизатор: ${userFio}\nВремя: ${new Date().toLocaleString('ru-RU')}\n\nСсылка для подключения:\n${conferenceUrl}`,
          delivery_type: 'internal'
        })
      });

      const result = await response.json();
      console.log('Результат отправки приглашений:', result);

      if (result.success) {
        const successCount = result.results?.filter((r: { success: boolean }) => r.success).length || 0;
        const failCount = result.results?.filter((r: { success: boolean }) => !r.success).length || 0;
        
        toast({
          title: 'Конференция создана',
          description: `Приглашения отправлены: ${successCount} успешно, ${failCount} ошибок`
        });
      } else {
        toast({
          title: 'Конференция создана',
          description: result.error || 'Но не удалось отправить приглашения',
          variant: 'destructive'
        });
      }

      await startCall(newConference);
      
      setShowCreateDialog(false);
      setConferenceName('');
      setSelectedUserIds([]);
      setSearchUser('');
    } catch (error) {
      console.error('Ошибка создания конференции:', error);
      toast({
        title: 'Ошибка создания конференции',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const startCall = async (conference: Conference) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: selectedCamera ? { deviceId: selectedCamera } : true,
        audio: selectedMicrophone ? { deviceId: selectedMicrophone } : true
      });

      localStreamRef.current = stream;
      setCurrentConference(conference);
      setInCall(true);
      setParticipantsCount(conference.participants.length);

      qualityMonitorRef.current = setInterval(() => {
        const quality = ['high', 'medium', 'low'][Math.floor(Math.random() * 3)] as 'high' | 'medium' | 'low';
        setNetworkQuality(quality);
      }, 5000);

      toast({ title: `Подключено к "${conference.name}"` });
    } catch (error) {
      console.error('Ошибка подключения:', error);
      toast({
        title: 'Ошибка доступа к камере/микрофону',
        variant: 'destructive'
      });
    }
  };

  const endCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }

    if (qualityMonitorRef.current) {
      clearInterval(qualityMonitorRef.current);
      qualityMonitorRef.current = null;
    }

    if (currentConference) {
      addToHistory(currentConference);
    }

    setInCall(false);
    setCurrentConference(null);
    setIsScreenSharing(false);
    setIsMuted(false);
    setIsVideoOff(false);

    toast({ title: 'Звонок завершен' });
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

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });

        screenStreamRef.current = screenStream;
        setIsScreenSharing(true);

        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          screenStreamRef.current = null;
        };

        toast({ title: 'Демонстрация экрана включена' });
      } catch (error) {
        console.error('Ошибка демонстрации экрана:', error);
        toast({
          title: 'Не удалось начать демонстрацию',
          variant: 'destructive'
        });
      }
    } else {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
      toast({ title: 'Демонстрация экрана завершена' });
    }
  };

  const handleLogout = () => {
    if (inCall) {
      endCall();
    }
    localStorage.clear();
    navigate('/');
  };

  if (inCall) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <OrganizationLogo size={48} showCompanyName={false} />
              <h1 className="text-2xl font-bold text-white">Видеоконференция</h1>
            </div>
          </div>

          <ActiveCallView
            conference={currentConference}
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            isScreenSharing={isScreenSharing}
            participantsCount={participantsCount}
            networkQuality={networkQuality}
            localStream={localStreamRef.current}
            screenStream={screenStreamRef.current}
            onToggleMute={toggleMute}
            onToggleVideo={toggleVideo}
            onToggleScreenShare={toggleScreenShare}
            onEndCall={endCall}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <OrganizationLogo size={56} showCompanyName={false} />
            <div>
              <h1 className="text-3xl font-bold text-white">Видеоконференции</h1>
              <p className="text-slate-400">{userFio}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleOpenDeviceCheck}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              <Icon name="Plus" size={20} className="mr-2" />
              Создать конференцию
            </Button>
            <Button
              onClick={() => navigate('/dashboard')}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <Icon name="ArrowLeft" size={20} className="mr-2" />
              Назад
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-red-600/50 text-red-500 hover:bg-red-600/10"
            >
              <Icon name="LogOut" size={20} className="mr-2" />
              Выход
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-slate-800/50 border border-blue-600/30 mb-6">
            <TabsTrigger value="active" className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400">
              <Icon name="Activity" size={20} className="mr-2" />
              Активные
            </TabsTrigger>
            <TabsTrigger value="my" className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400">
              <Icon name="User" size={20} className="mr-2" />
              Мои комнаты
            </TabsTrigger>
            <TabsTrigger value="favorites" className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400">
              <Icon name="Star" size={20} className="mr-2" />
              Избранное
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400">
              <Icon name="History" size={20} className="mr-2" />
              История
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {conferences.length === 0 ? (
              <Card className="bg-slate-800/50 border-blue-600/30 p-12 text-center">
                <Icon name="Video" size={64} className="text-slate-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Нет активных конференций</h2>
                <p className="text-slate-400">Создайте новую конференцию или присоединитесь к существующей</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {conferences.map((conf) => (
                  <ConferenceCard
                    key={conf.id}
                    conference={conf}
                    userId={userId}
                    isFavorite={favoriteRooms.some(f => f.id === conf.id)}
                    onJoin={startCall}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my">
            {myRooms.length === 0 ? (
              <Card className="bg-slate-800/50 border-blue-600/30 p-12 text-center">
                <Icon name="Users" size={64} className="text-slate-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Нет созданных комнат</h2>
                <p className="text-slate-400">Создайте свою первую конференцию</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myRooms.map((conf) => (
                  <ConferenceCard
                    key={conf.id}
                    conference={conf}
                    userId={userId}
                    isFavorite={favoriteRooms.some(f => f.id === conf.id)}
                    onJoin={startCall}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="favorites">
            {favoriteRooms.length === 0 ? (
              <Card className="bg-slate-800/50 border-blue-600/30 p-12 text-center">
                <Icon name="Star" size={64} className="text-slate-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Нет избранных конференций</h2>
                <p className="text-slate-400">Добавьте конференции в избранное для быстрого доступа</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoriteRooms.map((conf) => (
                  <ConferenceCard
                    key={conf.id}
                    conference={conf}
                    userId={userId}
                    isFavorite={true}
                    onJoin={startCall}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            {historyRooms.length === 0 ? (
              <Card className="bg-slate-800/50 border-blue-600/30 p-12 text-center">
                <Icon name="History" size={64} className="text-slate-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">История пуста</h2>
                <p className="text-slate-400">Здесь будут отображаться завершенные конференции</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {historyRooms.map((conf) => (
                  <ConferenceCard
                    key={conf.id}
                    conference={conf}
                    userId={userId}
                    isFavorite={favoriteRooms.some(f => f.id === conf.id)}
                    onJoin={startCall}
                    onToggleFavorite={toggleFavorite}
                    showStatus={true}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <DeviceCheckDialog
        open={showDeviceCheck}
        onOpenChange={setShowDeviceCheck}
        previewStream={previewStream}
        availableCameras={availableCameras}
        availableMicrophones={availableMicrophones}
        selectedCamera={selectedCamera}
        selectedMicrophone={selectedMicrophone}
        audioLevel={audioLevel}
        onCameraChange={setSelectedCamera}
        onMicrophoneChange={setSelectedMicrophone}
        onStartPreview={startPreview}
        onStopPreview={stopPreview}
        onProceedToCreate={handleProceedToCreate}
      />

      <CreateConferenceDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        conferenceName={conferenceName}
        onConferenceNameChange={setConferenceName}
        users={users}
        companies={companies}
        selectedCompanyId={selectedCompanyId}
        onCompanyChange={setSelectedCompanyId}
        selectedUserIds={selectedUserIds}
        onUserToggle={handleUserToggle}
        searchUser={searchUser}
        onSearchChange={setSearchUser}
        onCreateConference={createConference}
        loading={loading}
      />
    </div>
  );
};

export default VideoConferencePage;
