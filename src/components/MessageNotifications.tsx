import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

const MessageNotifications = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotification, setShowNotification] = useState(false);

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
          setTimeout(() => setShowNotification(false), 10000);
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
