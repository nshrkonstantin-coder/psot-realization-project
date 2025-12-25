import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import OrganizationLogo from '@/components/OrganizationLogo';

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
  const [userRole, setUserRole] = useState<string>('');
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
  const previewVideoRef = useRef<HTMLVideoElement>(null);
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

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const screenShareRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const qualityMonitorRef = useRef<NodeJS.Timeout | null>(null);

  const MESSAGING_URL = 'https://functions.poehali.dev/0bd87c15-af37-4e08-93fa-f921a3c18bee';
  const ORGANIZATIONS_URL = 'https://functions.poehali.dev/5fa1bf89-3c17-4533-889a-7273e1ef1e3b';
  const SEND_EMAIL_URL = 'https://functions.poehali.dev/ca9e0986-48d7-46a1-b0be-7a98ddf4c429';
  const VIDEO_CONFERENCES_URL = 'https://functions.poehali.dev/89376b31-2594-4167-8f41-b49d7df5ed40';

  useEffect(() => {
    const id = localStorage.getItem('userId');
    const fio = localStorage.getItem('userFio');
    const role = localStorage.getItem('userRole');
    
    if (!id) {
      navigate('/');
      return;
    }

    setUserId(Number(id));
    setUserFio(fio || '');
    setUserRole(role || 'user');
    
    loadCompanies();
    loadUsers();
    loadConferences();

    // Проверяем, есть ли параметр room в URL
    const roomId = searchParams.get('room');
    if (roomId) {
      joinConferenceByRoom(roomId, Number(id));
    }
  }, [navigate, searchParams]);

  const loadCompanies = async () => {
    try {
      const response = await fetch(`${ORGANIZATIONS_URL}?action=list`, {
        headers: { 'X-User-Id': localStorage.getItem('userId')! }
      });
      const data = await response.json();
      const companiesList = Array.isArray(data) ? data : data.organizations || [];
      setCompanies(companiesList);
      
      // Для user и minadmin автоматически выбираем первое (единственное) предприятие
      const role = localStorage.getItem('userRole') || 'user';
      if ((role === 'user' || role === 'minadmin') && companiesList.length > 0) {
        setSelectedCompanyId(String(companiesList[0].id));
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
        // Сортируем по названию компании, затем по ФИО
        const sortedUsers = [...data.users].sort((a, b) => {
          const companyCompare = (a.company_name || '').localeCompare(b.company_name || '', 'ru');
          if (companyCompare !== 0) return companyCompare;
          return a.fio.localeCompare(b.fio, 'ru');
        });
        setUsers(sortedUsers);
      }
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
    }
  };

  const loadConferences = async () => {
    try {
      const response = await fetch(`${VIDEO_CONFERENCES_URL}?action=list`, {
        headers: { 'X-User-Id': localStorage.getItem('userId')! }
      });
      const data = await response.json();
      const allConferences = data.conferences || [];
      
      // Разделяем на категории
      const active = allConferences.filter((c: Conference) => c.status === 'active');
      const myActive = active.filter((c: Conference) => c.creator_id === userId);
      const favorites = allConferences.filter((c: Conference) => c.is_favorite);
      const history = allConferences.filter((c: Conference) => c.status === 'ended');
      
      setConferences(active);
      setMyRooms(myActive);
      setFavoriteRooms(favorites);
      setHistoryRooms(history);
    } catch (error) {
      console.error('Ошибка загрузки конференций:', error);
    }
  };
  

  
  const toggleFavorite = async (confId: string) => {
    const exists = favoriteRooms.find(c => c.id === confId);
    const isFavorite = !exists;
    
    try {
      await fetch(`${VIDEO_CONFERENCES_URL}?action=favorite`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': String(userId)
        },
        body: JSON.stringify({
          conference_id: confId,
          is_favorite: isFavorite
        })
      });
      
      // Обновляем локальное состояние
      if (isFavorite) {
        const conf = [...conferences, ...myRooms].find(c => c.id === confId);
        if (conf) {
          setFavoriteRooms([...favoriteRooms, { ...conf, is_favorite: true }]);
        }
      } else {
        setFavoriteRooms(favoriteRooms.filter(c => c.id !== confId));
      }
    } catch (error) {
      console.error('Ошибка обновления избранного:', error);
    }
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
      ].slice(0, 20); // Храним последние 20
    });
  };

  const joinConferenceByRoom = async (roomId: string, currentUserId: number) => {
    try {
      console.log('Присоединение к конференции:', roomId);
      
      // Загружаем конференцию из базы данных
      const response = await fetch(`${VIDEO_CONFERENCES_URL}?action=get&id=${roomId}`, {
        headers: { 'X-User-Id': String(currentUserId) }
      });
      
      if (!response.ok) {
        toast({ 
          title: 'Конференция не найдена', 
          description: 'Возможно, она уже завершена или была удалена',
          variant: 'destructive' 
        });
        return;
      }
      
      const conf = await response.json();
      console.log('Конференция загружена:', conf);
      
      // Добавляем пользователя как участника
      await fetch(`${VIDEO_CONFERENCES_URL}?action=join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': String(currentUserId)
        },
        body: JSON.stringify({ conference_id: roomId })
      });
      
      // Сразу подключаемся без проверки устройств (Jitsi сам всё проверит)
      setCurrentConference(conf);
      startCall(conf);
    } catch (error) {
      console.error('Ошибка загрузки конференции:', error);
      toast({ 
        title: 'Ошибка загрузки', 
        description: 'Не удалось загрузить конференцию',
        variant: 'destructive' 
      });
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
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
      }
      
      // Настройка визуализации уровня звука
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      analyser.fftSize = 256;
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateAudioLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(Math.min(100, (average / 128) * 100));
          requestAnimationFrame(updateAudioLevel);
        }
      };
      updateAudioLevel();
      
    } catch (error) {
      console.error('Ошибка доступа к камере/микрофону:', error);
      toast({ 
        title: 'Не удалось получить доступ к камере или микрофону', 
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
  };
  
  const handleOpenDeviceCheck = async () => {
    await checkDevices();
    setShowDeviceCheck(true);
    setTimeout(() => startPreview(), 100);
  };
  
  const handleCloseDeviceCheck = () => {
    stopPreview();
    setShowDeviceCheck(false);
  };

  const getOptimalMediaConstraints = (participants: number) => {
    if (participants <= 5) {
      return {
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 30 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        }
      };
    } else if (participants <= 20) {
      return {
        video: {
          width: { ideal: 960, max: 1280 },
          height: { ideal: 540, max: 720 },
          frameRate: { ideal: 24, max: 30 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        }
      };
    } else if (participants <= 50) {
      return {
        video: {
          width: { ideal: 640, max: 960 },
          height: { ideal: 360, max: 540 },
          frameRate: { ideal: 20, max: 24 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        }
      };
    } else {
      return {
        video: {
          width: { ideal: 480, max: 640 },
          height: { ideal: 270, max: 360 },
          frameRate: { ideal: 15, max: 20 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 32000,
          channelCount: 1
        }
      };
    }
  };

  const monitorNetworkQuality = () => {
    if (qualityMonitorRef.current) {
      clearInterval(qualityMonitorRef.current);
    }

    qualityMonitorRef.current = setInterval(() => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection) {
          const downlink = connection.downlink;
          const effectiveType = connection.effectiveType;

          if (downlink > 10 || effectiveType === '4g') {
            setNetworkQuality('high');
          } else if (downlink > 2 || effectiveType === '3g') {
            setNetworkQuality('medium');
          } else {
            setNetworkQuality('low');
          }
        }
      }
    }, 5000);
  };

  const adjustStreamQuality = async (participants: number) => {
    if (!localStreamRef.current) return;

    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;

    const constraints = getOptimalMediaConstraints(participants);
    
    try {
      await videoTrack.applyConstraints(constraints.video as MediaTrackConstraints);
    } catch (error) {
      console.warn('Не удалось применить ограничения видео:', error);
    }
  };

  const startCall = async (conference: Conference) => {
    try {
      setLoading(true);
      setCurrentConference(conference);
      setInCall(true);
      
      const container = document.querySelector('#jitsi-container');
      if (!container) return;
      
      // Используем Jitsi Meet - стабильный opensource сервис от 8x8
      const roomName = conference.id;
      const displayName = encodeURIComponent(userFio);
      
      // Параметры конфигурации Jitsi
      const config = [
        `userInfo.displayName="${displayName}"`,
        'config.prejoinPageEnabled=false',
        'config.startWithAudioMuted=false',
        'config.startWithVideoMuted=false',
        'config.enableWelcomePage=false',
        'config.enableClosePage=false',
        'config.disableDeepLinking=true',
        'config.toolbarButtons=["microphone","camera","desktop","fullscreen","hangup","chat","raisehand","participants-pane","tileview"]',
        'interfaceConfig.SHOW_JITSI_WATERMARK=false',
        'interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false',
        'interfaceConfig.DEFAULT_BACKGROUND="#1e293b"',
        'interfaceConfig.DISABLE_JOIN_LEAVE_NOTIFICATIONS=true',
        'interfaceConfig.MOBILE_APP_PROMO=false'
      ].join('&');
      
      const iframeUrl = `https://meet.jit.si/${roomName}#${config}`;
      
      console.log('Jitsi Meet комната:', iframeUrl);
      
      // Встраиваем Jitsi через iframe
      const iframe = document.createElement('iframe');
      iframe.src = iframeUrl;
      iframe.allow = 'camera; microphone; fullscreen; display-capture; autoplay';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.setAttribute('allowfullscreen', 'true');
      
      container.innerHTML = '';
      container.appendChild(iframe);
      
      iframe.onload = () => {
        setTimeout(() => {
          setLoading(false);
          toast({ title: '🎥 Конференция запущена!', description: 'Jitsi Meet - стабильная связь' });
        }, 1000);
      };
      
      setTimeout(() => setLoading(false), 4000);
      
      (window as any).jitsiIframe = iframe;
      
    } catch (error) {
      console.error('Ошибка подключения:', error);
      toast({ 
        title: 'Ошибка подключения', 
        description: 'Не удалось подключиться к конференции',
        variant: 'destructive' 
      });
      setLoading(false);
    }
  };

  const handleCreateConference = async () => {
    if (!conferenceName.trim() || selectedUserIds.length === 0) {
      toast({ title: 'Введите название и выберите участников', variant: 'destructive' });
      return;
    }

    setLoading(true);

    // Генерируем ID совместимый с Jitsi (только буквы и цифры)
    const roomId = 'conf' + Date.now() + Math.random().toString(36).substr(2, 9).replace(/[^a-z0-9]/g, '');
    
    const newConference: Conference = {
      id: roomId,
      name: conferenceName,
      creator_id: userId!,
      creator_name: userFio,
      participants: [userId!, ...selectedUserIds],
      created_at: new Date().toISOString(),
      status: 'active'
    };

    try {
      console.log('Создание конференции:', newConference);
      
      // Сохраняем в базу данных
      const response = await fetch(`${VIDEO_CONFERENCES_URL}?action=create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': String(userId)
        },
        body: JSON.stringify(newConference)
      });

      console.log('Ответ сервера:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Ошибка от сервера:', errorData);
        throw new Error('Ошибка создания конференции');
      }

      const result = await response.json();
      console.log('Результат:', result);

      // Обновляем локальное состояние
      const updatedConferences = [newConference, ...conferences];
      const updatedMyRooms = [newConference, ...myRooms];
      
      setConferences(updatedConferences);
      setMyRooms(updatedMyRooms);
      
      setShowCreateDialog(false);
      const savedName = conferenceName;
      setConferenceName('');
      setSelectedUserIds([]);
      
      toast({ title: '✅ Конференция создана!', description: `Подключение к "${savedName}"...` });
      
      // Автоматически присоединяемся к созданной конференции
      setTimeout(() => {
        startCall(newConference);
      }, 500);
      
    } catch (error) {
      console.error('Ошибка создания конференции:', error);
      toast({ 
        title: 'Ошибка создания', 
        description: 'Не удалось создать конференцию',
        variant: 'destructive' 
      });
      setLoading(false);
      return;
    }
    
    // Отправляем приглашения всем участникам (асинхронно, не блокируем присоединение)
    const inviteLink = `${window.location.origin}/video-conference?room=${newConference.id}`;
    const messageText = `📞 ${userFio} приглашает вас на видеоконференцию "${conferenceName}". Присоединяйтесь: ${inviteLink}`;
    
    // 1. Отправка в чат (внутренняя система сообщений) - отправляем каждому участнику отдельно
    selectedUserIds.forEach(participantId => {
      fetch(`${MESSAGING_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': String(userId)
        },
        body: JSON.stringify({
          action: 'send_message',
          recipient_id: participantId,
          message: messageText
        })
      })
        .then(response => response.json())
        .then(data => {
          if (data.success || data.message_id) {
            console.log(`✅ Приглашение в чат отправлено пользователю ${participantId}`);
          } else {
            console.error(`❌ Ошибка отправки приглашения в чат пользователю ${participantId}:`, data.error);
          }
        })
        .catch(error => {
          console.error(`❌ Ошибка сети при отправке приглашения в чат пользователю ${participantId}:`, error);
        });
    });
    
    // 2. Отправка email-уведомлений участникам
    const selectedUsersData = users.filter(u => selectedUserIds.includes(u.id));
    const recipientEmails = selectedUsersData.map(u => u.email).filter(email => email);
    
    if (recipientEmails.length > 0) {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background-color: #ec4899; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0;">📞 Приглашение на видеоконференцию</h1>
          </div>
          <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              <strong>${userFio}</strong> приглашает вас на видеоконференцию:
            </p>
            <div style="background-color: #f0f0f0; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #ec4899; margin: 0 0 10px 0;">${conferenceName}</h2>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" 
                 style="display: inline-block; background-color: #ec4899; color: white; padding: 15px 40px; 
                        text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold;">
                🎥 Присоединиться к конференции
              </a>
            </div>
            <p style="font-size: 14px; color: #666; text-align: center;">
              Или скопируйте ссылку:<br>
              <a href="${inviteLink}" style="color: #ec4899; word-break: break-all;">${inviteLink}</a>
            </p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
            <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
              Это автоматическое уведомление из системы АСУБТ
            </p>
          </div>
        </div>
      `;
      
      fetch(SEND_EMAIL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipients: recipientEmails,
          subject: `📞 Приглашение на видеоконференцию "${conferenceName}"`,
          html_content: emailHtml,
          sender_name: 'АСУБТ - Видеоконференции'
        })
      })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            console.log(`✅ Email-приглашения отправлены на ${data.sent} адресов`);
            toast({ 
              title: 'Email-приглашения отправлены!', 
              description: `Письма получат ${data.sent} участников`,
              duration: 3000
            });
          } else {
            console.error('❌ Ошибка отправки email:', data.error);
          }
        })
        .catch(error => {
          console.error('❌ Ошибка сети при отправке email:', error);
        });
    }
    
    // Показываем уведомление и сразу присоединяемся
    toast({ 
      title: 'Конференция создана!', 
      description: `Приглашения отправляются ${selectedUserIds.length} участникам в чат и на email` 
    });
    
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

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
      }
      
      if (localStreamRef.current && localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      
      setIsScreenSharing(false);
      toast({ title: 'Демонстрация экрана остановлена' });
    } else {
      try {
        const screenConstraints: any = {
          video: {
            cursor: 'always',
            displaySurface: 'monitor',
            frameRate: { ideal: 30, max: 60 },
            width: { ideal: 1920, max: 3840 },
            height: { ideal: 1080, max: 2160 }
          },
          audio: false
        };

        if (participantsCount > 20) {
          screenConstraints.video.frameRate = { ideal: 20, max: 30 };
          screenConstraints.video.width = { ideal: 1280, max: 1920 };
          screenConstraints.video.height = { ideal: 720, max: 1080 };
        }

        const screenStream = await navigator.mediaDevices.getDisplayMedia(screenConstraints);

        screenStreamRef.current = screenStream;
        
        if (screenShareRef.current) {
          screenShareRef.current.srcObject = screenStream;
        }

        screenStream.getVideoTracks()[0].onended = () => {
          toggleScreenShare();
        };

        setIsScreenSharing(true);
        toast({ title: 'Демонстрация экрана началась' });
      } catch (error) {
        console.error('Ошибка захвата экрана:', error);
        toast({ 
          title: 'Ошибка демонстрации экрана', 
          description: 'Не удалось получить доступ к экрану',
          variant: 'destructive' 
        });
      }
    }
  };

  const endCall = async () => {
    // Очищаем Jitsi iframe
    if ((window as any).jitsiIframe) {
      const container = document.querySelector('#jitsi-container');
      if (container) {
        container.innerHTML = '';
      }
      (window as any).jitsiIframe = null;
    }
    
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
    
    // Завершаем конференцию в базе данных (только создатель может завершить)
    if (currentConference && currentConference.creator_id === userId) {
      try {
        await fetch(`${VIDEO_CONFERENCES_URL}?action=end`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': String(userId)
          },
          body: JSON.stringify({
            id: currentConference.id,
            duration: 0
          })
        });
      } catch (error) {
        console.error('Ошибка завершения конференции:', error);
      }
    }
    
    // Добавляем в историю
    if (currentConference) {
      addToHistory(currentConference);
    }
    
    setInCall(false);
    setCurrentConference(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsScreenSharing(false);
    setNetworkQuality('high');
    setParticipantsCount(1);
  };

  useEffect(() => {
    if (inCall && currentConference) {
      adjustStreamQuality(currentConference.participants.length);
    }
  }, [participantsCount, networkQuality]);

  useEffect(() => {
    return () => {
      if (qualityMonitorRef.current) {
        clearInterval(qualityMonitorRef.current);
      }
      stopPreview();
    };
  }, []);

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
              <Button 
                onClick={() => {
                  const roomUrl = `https://meet.jit.si/${currentConference.id}`;
                  window.open(roomUrl, '_blank');
                }}
                variant="outline"
              >
                <Icon name="ExternalLink" size={20} className="mr-2" />
                Открыть в новой вкладке
              </Button>
              <Button onClick={() => copyRoomLink(currentConference.id)} variant="outline">
                <Icon name="Share2" size={20} className="mr-2" />
                Пригласить
              </Button>
              <Button onClick={endCall} variant="destructive">
                <Icon name="PhoneOff" size={20} className="mr-2" />
                Покинуть
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 relative">
          <div id="jitsi-container" className="w-full h-full"></div>
          {loading && (
            <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
              <div className="text-center space-y-6 max-w-lg mx-auto px-4">
                <div className="relative w-20 h-20 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-pink-500/30"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-pink-500 border-t-transparent animate-spin"></div>
                  <Icon name="Video" size={32} className="text-pink-500 absolute inset-0 m-auto" />
                </div>
                <div>
                  <p className="text-white text-xl font-semibold mb-2">Загрузка конференции</p>
                  <p className="text-slate-400 text-sm mb-4">Подготовка HD видео и аудио...</p>
                  
                  <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4 text-left">
                    <div className="flex items-start gap-2">
                      <Icon name="Info" size={20} className="text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-slate-300 space-y-1">
                        <p className="font-semibold text-blue-300">💡 Jitsi Meet - стабильная связь:</p>
                        <p>• Разрешите доступ к камере и микрофону</p>
                        <p>• HD качество видео до 100+ участников</p>
                        <p>• Opensource решение от 8x8 (Google)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }



  // Основная страница со списком конференций
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
              className="text-white hover:bg-white/10"
            >
              <Icon name="ArrowLeft" size={20} />
            </Button>
            <OrganizationLogo size="sm" />
            <div>
              <h1 className="text-2xl font-bold text-white">Видео конференция</h1>
              <p className="text-slate-300 text-sm">Создавайте и присоединяйтесь к видеозвонкам</p>
            </div>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Icon name="Plus" size={20} className="mr-2" />
            Создать конференцию
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-800/50">
            <TabsTrigger value="active">
              <Icon name="Video" size={16} className="mr-2" />
              Активные ({conferences.length})
            </TabsTrigger>
            <TabsTrigger value="my">
              <Icon name="User" size={16} className="mr-2" />
              Мои комнаты ({myRooms.length})
            </TabsTrigger>
            <TabsTrigger value="favorites">
              <Icon name="Star" size={16} className="mr-2" />
              Избранное ({favoriteRooms.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              <Icon name="Clock" size={16} className="mr-2" />
              История ({historyRooms.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {conferences.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Icon name="Video" size={64} className="text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg">Нет активных конференций</p>
                  <p className="text-slate-500 text-sm mt-2">Создайте новую конференцию для начала</p>
                </div>
              ) : (
                conferences.map(conf => (
                  <Card key={conf.id} className="bg-slate-800/50 border-pink-600/30 hover:border-pink-600 transition-all">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon name="Video" size={20} className="text-pink-500" />
                          {conf.name}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleFavorite(conf.id)}
                          className="hover:bg-slate-700/50"
                        >
                          <Icon 
                            name={favoriteRooms.find(f => f.id === conf.id) ? "Star" : "StarOff"} 
                            size={20} 
                            className={favoriteRooms.find(f => f.id === conf.id) ? "text-yellow-500 fill-yellow-500" : "text-slate-400"}
                          />
                        </Button>
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
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="my">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myRooms.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Icon name="Video" size={64} className="text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg">Нет созданных конференций</p>
                  <p className="text-slate-500 text-sm mt-2">Создайте свою первую конференцию</p>
                </div>
              ) : (
                myRooms.map(conf => (
                  <Card key={conf.id} className="bg-slate-800/50 border-pink-600/30 hover:border-pink-600 transition-all">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon name="Video" size={20} className="text-pink-500" />
                          {conf.name}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleFavorite(conf.id)}
                          className="hover:bg-slate-700/50"
                        >
                          <Icon 
                            name={favoriteRooms.find(f => f.id === conf.id) ? "Star" : "StarOff"} 
                            size={20} 
                            className={favoriteRooms.find(f => f.id === conf.id) ? "text-yellow-500 fill-yellow-500" : "text-slate-400"}
                          />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-slate-400 text-sm space-y-1">
                        <p>Участников: {conf.participants.length}</p>
                        <p>Создано: {new Date(conf.created_at).toLocaleDateString('ru-RU')}</p>
                        <p>Статус: <span className={conf.status === 'active' ? 'text-green-500' : 'text-slate-500'}>{conf.status === 'active' ? 'Активна' : 'Завершена'}</span></p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => startCall(conf)}
                          className="flex-1 bg-pink-600 hover:bg-pink-700"
                          disabled={loading || conf.status === 'ended'}
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
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="favorites">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favoriteRooms.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Icon name="Star" size={64} className="text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg">Нет избранных конференций</p>
                  <p className="text-slate-500 text-sm mt-2">Добавьте конференции в избранное</p>
                </div>
              ) : (
                favoriteRooms.map(conf => (
                  <Card key={conf.id} className="bg-slate-800/50 border-pink-600/30 hover:border-pink-600 transition-all">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon name="Video" size={20} className="text-pink-500" />
                          {conf.name}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleFavorite(conf.id)}
                          className="hover:bg-slate-700/50"
                        >
                          <Icon 
                            name="Star" 
                            size={20} 
                            className="text-yellow-500 fill-yellow-500"
                          />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-slate-400 text-sm space-y-1">
                        <p>Организатор: {conf.creator_name}</p>
                        <p>Участников: {conf.participants.length}</p>
                        <p>Статус: <span className={conf.status === 'active' ? 'text-green-500' : 'text-slate-500'}>{conf.status === 'active' ? 'Активна' : 'Завершена'}</span></p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => startCall(conf)}
                          className="flex-1 bg-pink-600 hover:bg-pink-700"
                          disabled={loading || conf.status === 'ended'}
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
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {historyRooms.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Icon name="History" size={64} className="text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg">История пуста</p>
                  <p className="text-slate-500 text-sm mt-2">Здесь будут отображаться завершенные конференции</p>
                </div>
              ) : (
                historyRooms.map(conf => (
                  <Card key={conf.id} className="bg-slate-800/50 border-slate-600/30">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon name="Video" size={20} className="text-slate-400" />
                          {conf.name}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleFavorite(conf.id)}
                          className="hover:bg-slate-700/50"
                        >
                          <Icon 
                            name={favoriteRooms.find(f => f.id === conf.id) ? "Star" : "StarOff"} 
                            size={20} 
                            className={favoriteRooms.find(f => f.id === conf.id) ? "text-yellow-500 fill-yellow-500" : "text-slate-400"}
                          />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-slate-400 text-sm space-y-1">
                        <p>Организатор: {conf.creator_name}</p>
                        <p>Участников: {conf.participants.length}</p>
                        {conf.ended_at && (
                          <p>Завершена: {new Date(conf.ended_at).toLocaleString('ru-RU')}</p>
                        )}
                        {conf.duration && (
                          <p>Длительность: {Math.floor(conf.duration / 60)} мин</p>
                        )}
                        <p>Статус: <span className="text-slate-500">Завершена</span></p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => copyRoomLink(conf.id)}
                          variant="outline"
                          className="flex-1 border-slate-600/50"
                        >
                          <Icon name="Share2" size={16} className="mr-2" />
                          Копировать ссылку
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Диалог проверки устройств */}
        <Dialog open={showDeviceCheck} onOpenChange={handleCloseDeviceCheck}>
          <DialogContent className="bg-slate-800 border-pink-600/30 max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Icon name="Settings" size={24} className="text-pink-500" />
                Проверка камеры и микрофона
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              {/* Предпросмотр видео */}
              <div className="relative bg-slate-900 rounded-lg overflow-hidden aspect-video">
                <video
                  ref={previewVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror"
                />
                {!previewStream && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icon name="Camera" size={64} className="text-slate-600" />
                  </div>
                )}
              </div>

              {/* Выбор камеры */}
              <div>
                <Label className="text-white flex items-center gap-2 mb-2">
                  <Icon name="Camera" size={16} />
                  Камера
                </Label>
                <Select 
                  value={selectedCamera} 
                  onValueChange={(val) => {
                    setSelectedCamera(val);
                    stopPreview();
                    setTimeout(() => startPreview(), 100);
                  }}
                >
                  <SelectTrigger className="bg-slate-900/50 text-white border-pink-600/30">
                    <SelectValue placeholder="Выберите камеру" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCameras.map(cam => (
                      <SelectItem key={cam.deviceId} value={cam.deviceId}>
                        {cam.label || `Камера ${cam.deviceId.slice(0, 8)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Выбор микрофона */}
              <div>
                <Label className="text-white flex items-center gap-2 mb-2">
                  <Icon name="Mic" size={16} />
                  Микрофон
                </Label>
                <Select 
                  value={selectedMicrophone} 
                  onValueChange={(val) => {
                    setSelectedMicrophone(val);
                    stopPreview();
                    setTimeout(() => startPreview(), 100);
                  }}
                >
                  <SelectTrigger className="bg-slate-900/50 text-white border-pink-600/30">
                    <SelectValue placeholder="Выберите микрофон" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMicrophones.map(mic => (
                      <SelectItem key={mic.deviceId} value={mic.deviceId}>
                        {mic.label || `Микрофон ${mic.deviceId.slice(0, 8)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Индикатор уровня звука */}
              <div>
                <Label className="text-white flex items-center gap-2 mb-2">
                  <Icon name="Volume2" size={16} />
                  Уровень звука
                </Label>
                <div className="bg-slate-900 rounded-lg p-4">
                  <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-pink-500 transition-all duration-150"
                      style={{ width: `${audioLevel}%` }}
                    />
                  </div>
                  <p className="text-slate-400 text-sm mt-2 text-center">
                    {audioLevel > 5 ? 'Микрофон работает! Говорите что-нибудь...' : 'Микрофон не улавливает звук'}
                  </p>
                </div>
              </div>

              {/* Информация */}
              <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Icon name="Info" size={20} className="text-blue-400 flex-shrink-0 mt-1" />
                  <div className="text-sm text-slate-300 space-y-1">
                    <p>• Убедитесь, что камера и микрофон работают правильно</p>
                    <p>• Проверьте уровень звука — индикатор должен реагировать на вашу речь</p>
                    <p>• Если устройства не работают, проверьте разрешения браузера</p>
                  </div>
                </div>
              </div>

              {/* Кнопки */}
              <div className="flex gap-3">
                <Button
                  onClick={handleCloseDeviceCheck}
                  variant="outline"
                  className="flex-1 border-slate-600"
                >
                  Закрыть
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
                    {(userRole === 'admin' || userRole === 'superadmin') && (
                      <SelectItem value="all">Все предприятия</SelectItem>
                    )}
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

      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
};

export default VideoConferencePage;