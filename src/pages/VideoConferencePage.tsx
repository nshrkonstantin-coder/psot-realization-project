import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import OrganizationLogo from '@/components/OrganizationLogo';
import { User, Company, Conference } from '@/components/video-conference/conferenceTypes';
import ConferenceCallView from '@/components/video-conference/ConferenceCallView';
import DeviceCheckDialog from '@/components/video-conference/DeviceCheckDialog';
import CreateConferenceDialog from '@/components/video-conference/CreateConferenceDialog';
import ConferenceCard from '@/components/video-conference/ConferenceCard';

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

    if (!id) { navigate('/'); return; }

    setUserId(Number(id));
    setUserFio(fio || '');
    setUserRole(role || 'user');

    loadCompanies();
    loadUsers();
    loadConferences();

    const roomId = searchParams.get('room');
    if (roomId) joinConferenceByRoom(roomId, Number(id));
  }, [navigate, searchParams]);

  const loadCompanies = async () => {
    try {
      const response = await fetch(`${ORGANIZATIONS_URL}?action=list`, {
        headers: { 'X-User-Id': localStorage.getItem('userId')! }
      });
      const data = await response.json();
      const companiesList = Array.isArray(data) ? data : data.organizations || [];
      setCompanies(companiesList);
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
        headers: { 'Content-Type': 'application/json', 'X-User-Id': String(userId) },
        body: JSON.stringify({ conference_id: confId, is_favorite: isFavorite })
      });
      if (isFavorite) {
        const conf = [...conferences, ...myRooms].find(c => c.id === confId);
        if (conf) setFavoriteRooms([...favoriteRooms, { ...conf, is_favorite: true }]);
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
      return [{ ...conference, ended_at: new Date().toISOString(), status: 'ended' as const }, ...filtered].slice(0, 20);
    });
  };

  const joinConferenceByRoom = async (roomId: string, currentUserId: number) => {
    try {
      const response = await fetch(`${VIDEO_CONFERENCES_URL}?action=get&id=${roomId}`, {
        headers: { 'X-User-Id': String(currentUserId) }
      });
      if (!response.ok) {
        toast({ title: 'Конференция не найдена', description: 'Возможно, она уже завершена или была удалена', variant: 'destructive' });
        return;
      }
      const conf = await response.json();
      console.log('Конференция загружена:', conf);
      await fetch(`${VIDEO_CONFERENCES_URL}?action=join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': String(currentUserId) },
        body: JSON.stringify({ conference_id: roomId })
      });
      setCurrentConference(conf);
      startCall(conf);
    } catch (error) {
      console.error('Ошибка загрузки конференции:', error);
      toast({ title: 'Ошибка загрузки', description: 'Не удалось загрузить конференцию', variant: 'destructive' });
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
      toast({ title: 'Не удалось получить список устройств', variant: 'destructive' });
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
      toast({ title: 'Не удалось получить доступ к камере или микрофону', description: 'Проверьте разрешения браузера', variant: 'destructive' });
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
      return { video: { width: { ideal: 1280, max: 1920 }, height: { ideal: 720, max: 1080 }, frameRate: { ideal: 30, max: 30 }, facingMode: 'user' }, audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 48000, channelCount: 1 } };
    } else if (participants <= 20) {
      return { video: { width: { ideal: 960, max: 1280 }, height: { ideal: 540, max: 720 }, frameRate: { ideal: 24, max: 30 }, facingMode: 'user' }, audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 44100, channelCount: 1 } };
    } else if (participants <= 50) {
      return { video: { width: { ideal: 640, max: 960 }, height: { ideal: 360, max: 540 }, frameRate: { ideal: 20, max: 24 }, facingMode: 'user' }, audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 44100, channelCount: 1 } };
    } else {
      return { video: { width: { ideal: 480, max: 640 }, height: { ideal: 270, max: 360 }, frameRate: { ideal: 15, max: 20 }, facingMode: 'user' }, audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 32000, channelCount: 1 } };
    }
  };

  const monitorNetworkQuality = () => {
    if (qualityMonitorRef.current) clearInterval(qualityMonitorRef.current);
    qualityMonitorRef.current = setInterval(() => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection) {
          const downlink = connection.downlink;
          const effectiveType = connection.effectiveType;
          if (downlink > 10 || effectiveType === '4g') setNetworkQuality('high');
          else if (downlink > 2 || effectiveType === '3g') setNetworkQuality('medium');
          else setNetworkQuality('low');
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
      const roomName = conference.id;
      const displayName = encodeURIComponent(userFio);
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
      toast({ title: 'Ошибка подключения', description: 'Не удалось подключиться к конференции', variant: 'destructive' });
      setLoading(false);
    }
  };

  const handleCreateConference = async () => {
    if (!conferenceName.trim() || selectedUserIds.length === 0) {
      toast({ title: 'Введите название и выберите участников', variant: 'destructive' });
      return;
    }
    setLoading(true);
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
      const response = await fetch(`${VIDEO_CONFERENCES_URL}?action=create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': String(userId) },
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
      setConferences([newConference, ...conferences]);
      setMyRooms([newConference, ...myRooms]);
      setShowCreateDialog(false);
      const savedName = conferenceName;
      setConferenceName('');
      setSelectedUserIds([]);
      toast({ title: '✅ Конференция создана!', description: `Подключение к "${savedName}"...` });
      setTimeout(() => startCall(newConference), 500);
    } catch (error) {
      console.error('Ошибка создания конференции:', error);
      toast({ title: 'Ошибка создания', description: 'Не удалось создать конференцию', variant: 'destructive' });
      setLoading(false);
      return;
    }

    const inviteLink = `${window.location.origin}/video-conference?room=${newConference.id}`;
    const messageText = `📞 ${userFio} приглашает вас на видеоконференцию "${conferenceName}". Присоединяйтесь: ${inviteLink}`;

    selectedUserIds.forEach(participantId => {
      fetch(`${MESSAGING_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': String(userId) },
        body: JSON.stringify({ action: 'send_message', recipient_id: participantId, message: messageText })
      })
        .then(r => r.json())
        .then(data => {
          if (data.success || data.message_id) console.log(`✅ Приглашение в чат отправлено пользователю ${participantId}`);
          else console.error(`❌ Ошибка отправки приглашения в чат пользователю ${participantId}:`, data.error);
        })
        .catch(error => console.error(`❌ Ошибка сети при отправке приглашения в чат пользователю ${participantId}:`, error));
    });

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
              <a href="${inviteLink}" style="background-color: #ec4899; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-size: 18px; font-weight: bold;">
                Присоединиться к конференции
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">Или скопируйте ссылку: ${inviteLink}</p>
          </div>
        </div>`;

      fetch(SEND_EMAIL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: recipientEmails,
          subject: `📞 Приглашение на видеоконференцию "${conferenceName}"`,
          html_content: emailHtml,
          sender_name: 'АСУБТ - Видеоконференции'
        })
      })
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            console.log(`✅ Email-приглашения отправлены на ${data.sent} адресов`);
            toast({ title: 'Email-приглашения отправлены!', description: `Письма получат ${data.sent} участников`, duration: 3000 });
          } else {
            console.error('❌ Ошибка отправки email:', data.error);
          }
        })
        .catch(error => console.error('❌ Ошибка сети при отправке email:', error));
    }

    toast({ title: 'Конференция создана!', description: `Приглашения отправляются ${selectedUserIds.length} участникам в чат и на email` });
    await startCall(newConference);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) { audioTrack.enabled = !audioTrack.enabled; setIsMuted(!audioTrack.enabled); }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) { videoTrack.enabled = !videoTrack.enabled; setIsVideoOff(!videoTrack.enabled); }
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) { screenStreamRef.current.getTracks().forEach(track => track.stop()); screenStreamRef.current = null; }
      if (localStreamRef.current && localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
      setIsScreenSharing(false);
      toast({ title: 'Демонстрация экрана остановлена' });
    } else {
      try {
        const screenConstraints: any = {
          video: { cursor: 'always', displaySurface: 'monitor', frameRate: { ideal: 30, max: 60 }, width: { ideal: 1920, max: 3840 }, height: { ideal: 1080, max: 2160 } },
          audio: false
        };
        if (participantsCount > 20) {
          screenConstraints.video.frameRate = { ideal: 20, max: 30 };
          screenConstraints.video.width = { ideal: 1280, max: 1920 };
          screenConstraints.video.height = { ideal: 720, max: 1080 };
        }
        const screenStream = await navigator.mediaDevices.getDisplayMedia(screenConstraints);
        screenStreamRef.current = screenStream;
        if (screenShareRef.current) screenShareRef.current.srcObject = screenStream;
        screenStream.getVideoTracks()[0].onended = () => { toggleScreenShare(); };
        setIsScreenSharing(true);
        toast({ title: 'Демонстрация экрана началась' });
      } catch (error) {
        console.error('Ошибка захвата экрана:', error);
        toast({ title: 'Ошибка демонстрации экрана', description: 'Не удалось получить доступ к экрану', variant: 'destructive' });
      }
    }
  };

  const endCall = async () => {
    if ((window as any).jitsiIframe) {
      const container = document.querySelector('#jitsi-container');
      if (container) container.innerHTML = '';
      (window as any).jitsiIframe = null;
    }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(track => track.stop()); localStreamRef.current = null; }
    if (screenStreamRef.current) { screenStreamRef.current.getTracks().forEach(track => track.stop()); screenStreamRef.current = null; }
    if (qualityMonitorRef.current) { clearInterval(qualityMonitorRef.current); qualityMonitorRef.current = null; }
    if (currentConference && currentConference.creator_id === userId) {
      try {
        await fetch(`${VIDEO_CONFERENCES_URL}?action=end`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-User-Id': String(userId) },
          body: JSON.stringify({ id: currentConference.id, duration: 0 })
        });
      } catch (error) {
        console.error('Ошибка завершения конференции:', error);
      }
    }
    if (currentConference) addToHistory(currentConference);
    setInCall(false);
    setCurrentConference(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsScreenSharing(false);
    setNetworkQuality('high');
    setParticipantsCount(1);
  };

  useEffect(() => {
    if (inCall && currentConference) adjustStreamQuality(currentConference.participants.length);
  }, [participantsCount, networkQuality]);

  useEffect(() => {
    return () => {
      if (qualityMonitorRef.current) clearInterval(qualityMonitorRef.current);
      stopPreview();
    };
  }, []);

  const copyRoomLink = (conferenceId: string) => {
    const link = `${window.location.origin}/video-conference?room=${conferenceId}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Ссылка скопирована' });
  };

  const toggleUserSelection = (id: number) => {
    setSelectedUserIds(prev => prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]);
  };

  // — активный звонок —
  if (inCall && currentConference) {
    return (
      <ConferenceCallView
        conference={currentConference}
        loading={loading}
        onEndCall={endCall}
        onCopyLink={copyRoomLink}
      />
    );
  }

  // — главный экран —
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto p-6">
        {/* Шапка */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-white">
              <Icon name="ArrowLeft" size={20} className="mr-2" />
              Назад
            </Button>
            <OrganizationLogo size="sm" />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleOpenDeviceCheck} className="border-slate-600 text-slate-300">
              <Icon name="Settings" size={20} className="mr-2" />
              Проверить устройства
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Icon name="Plus" size={20} className="mr-2" />
              Создать конференцию
            </Button>
          </div>
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

          {(['active', 'my', 'favorites', 'history'] as const).map(tab => {
            const list = tab === 'active' ? conferences : tab === 'my' ? myRooms : tab === 'favorites' ? favoriteRooms : historyRooms;
            const emptyIcon = tab === 'favorites' ? 'Star' : tab === 'history' ? 'History' : 'Video';
            const emptyText = tab === 'active' ? 'Нет активных конференций' : tab === 'my' ? 'Нет созданных конференций' : tab === 'favorites' ? 'Нет избранных конференций' : 'История пуста';
            const emptySubtext = tab === 'active' ? 'Создайте новую конференцию для начала' : tab === 'my' ? 'Создайте свою первую конференцию' : tab === 'favorites' ? 'Добавьте конференции в избранное' : 'Здесь будут отображаться завершенные конференции';

            return (
              <TabsContent key={tab} value={tab}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {list.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                      <Icon name={emptyIcon} size={64} className="text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400 text-lg">{emptyText}</p>
                      <p className="text-slate-500 text-sm mt-2">{emptySubtext}</p>
                    </div>
                  ) : (
                    list.map(conf => (
                      <ConferenceCard
                        key={conf.id}
                        conf={conf}
                        variant={tab}
                        isFavorite={!!favoriteRooms.find(f => f.id === conf.id)}
                        loading={loading}
                        onJoin={startCall}
                        onCopyLink={copyRoomLink}
                        onToggleFavorite={toggleFavorite}
                      />
                    ))
                  )}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>

        {/* Диалог проверки устройств */}
        <DeviceCheckDialog
          open={showDeviceCheck}
          onOpenChange={handleCloseDeviceCheck}
          previewStream={previewStream}
          availableCameras={availableCameras}
          availableMicrophones={availableMicrophones}
          selectedCamera={selectedCamera}
          selectedMicrophone={selectedMicrophone}
          audioLevel={audioLevel}
          onCameraChange={(val) => { setSelectedCamera(val); stopPreview(); setTimeout(() => startPreview(), 100); }}
          onMicrophoneChange={(val) => { setSelectedMicrophone(val); stopPreview(); setTimeout(() => startPreview(), 100); }}
          onConfirm={handleCloseDeviceCheck}
        />

        {/* Диалог создания конференции */}
        <CreateConferenceDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          conferenceName={conferenceName}
          onConferenceNameChange={setConferenceName}
          selectedCompanyId={selectedCompanyId}
          onSelectedCompanyIdChange={setSelectedCompanyId}
          selectedUserIds={selectedUserIds}
          searchUser={searchUser}
          onSearchUserChange={setSearchUser}
          users={users.filter(u => u.id !== userId)}
          companies={companies}
          userRole={userRole}
          loading={loading}
          onToggleUser={toggleUserSelection}
          onCreate={handleCreateConference}
        />
      </div>

      <style>{`.mirror { transform: scaleX(-1); }`}</style>
    </div>
  );
};

export default VideoConferencePage;
