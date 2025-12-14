import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

const MessageNotifications = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>('');

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    // Не показываем уведомления на странице чатов и личного кабинета
    const excludedPaths = ['/chat-history', '/user-cabinet'];
    if (excludedPaths.includes(location.pathname)) return;

    checkUnreadMessages();

    const interval = setInterval(() => {
      checkUnreadMessages();
    }, 10000);

    return () => clearInterval(interval);
  }, [location.pathname]);

  const playCallSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      
      // Звонок: 2 секунды звук, 1 секунда пауза, повторить 3 раза
      setTimeout(() => oscillator.stop(), 2000);
      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        osc2.connect(gainNode);
        osc2.frequency.value = 800;
        osc2.type = 'sine';
        osc2.start();
        setTimeout(() => osc2.stop(), 2000);
      }, 3000);
    } catch (error) {
      console.error('Ошибка воспроизведения звука:', error);
    }
  };

  const checkUnreadMessages = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(`https://functions.poehali.dev/7ce14ae9-b117-45ff-a64a-52a3f9881389?userId=${userId}`);
      const data = await response.json();
      
      if (data.success) {
        const totalUnread = data.chats.reduce((sum: number, chat: { unreadCount: number }) => sum + chat.unreadCount, 0);
        
        // Показываем уведомление если есть новые сообщения
        if (totalUnread > unreadCount && totalUnread > 0) {
          setShowNotification(true);
          
          // Проверяем последнее сообщение
          const latestChat = data.chats[0];
          if (latestChat && latestChat.lastMessage) {
            setLastMessage(latestChat.lastMessage);
            
            // Воспроизводим звук для видеозвонка
            if (latestChat.lastMessage.includes('📞') && latestChat.lastMessage.includes('видеоконференцию')) {
              playCallSound();
            }
          }
          
          setTimeout(() => setShowNotification(false), 15000);
        }
        
        setUnreadCount(totalUnread);
      }
    } catch (error) {
      // Тихо игнорируем ошибки
    }
  };

  if (unreadCount === 0) return null;

  return (
    <>
      {/* Floating notification */}
      {showNotification && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow-2xl p-4 max-w-sm border border-blue-500">
            <div className="flex items-start gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Icon name="MessageCircle" size={24} />
              </div>
              <div className="flex-1">
                {lastMessage.includes('📞') && lastMessage.includes('видеоконференцию') ? (
                  <>
                    <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
                      <Icon name="Video" size={20} />
                      Входящий видеозвонок
                    </h3>
                    <p className="text-blue-100 text-sm mb-3">
                      {lastMessage.split('Присоединяйтесь:')[0]}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setShowNotification(false);
                          const roomMatch = lastMessage.match(/room=([^&\s]+)/);
                          if (roomMatch) {
                            navigate(`/video-conference?room=${roomMatch[1]}`);
                          }
                        }}
                        size="sm"
                        className="bg-green-500 text-white hover:bg-green-600"
                      >
                        <Icon name="Phone" size={16} className="mr-1" />
                        Принять
                      </Button>
                      <Button
                        onClick={() => {
                          setShowNotification(false);
                          navigate('/chat-history');
                        }}
                        size="sm"
                        variant="outline"
                        className="bg-white/10 text-white border-white/30 hover:bg-white/20"
                      >
                        Отклонить
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="font-semibold text-lg mb-1">Новые сообщения</h3>
                    <p className="text-blue-100 text-sm mb-3">
                      У вас {unreadCount} непрочитанных сообщений
                    </p>
                    <Button
                      onClick={() => {
                        setShowNotification(false);
                        navigate('/chat-history');
                      }}
                      size="sm"
                      className="bg-white text-blue-600 hover:bg-blue-50"
                    >
                      Открыть сообщения
                    </Button>
                  </>
                )}
              </div>
              <button
                onClick={() => setShowNotification(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <Icon name="X" size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Small persistent badge */}
      <button
        onClick={() => navigate('/chat-history')}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full p-4 shadow-2xl hover:scale-110 transition-transform"
        title={`${unreadCount} непрочитанных сообщений`}
      >
        <Icon name="MessageCircle" size={24} />
        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs px-2 py-1 rounded-full font-semibold min-w-[24px] text-center animate-pulse">
          {unreadCount}
        </span>
      </button>
    </>
  );
};

export default MessageNotifications;