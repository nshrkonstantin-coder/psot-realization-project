import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import Icon from '@/components/ui/icon';

interface Message {
  id: number;
  message_text: string;
  created_at: string;
  is_read: boolean;
  sender_id: number;
  sender_name: string;
  sender_company: string;
}

interface MessagesViewProps {
  messages: Message[];
  userId: number | null;
  newMessage: string;
  setNewMessage: (message: string) => void;
  onSendMessage: () => Promise<void>;
  loading: boolean;
}

const EMOJI_LIST = [
  '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘',
  '😗', '😙', '😚', '☺️', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥳', '🤩', '😏',
  '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠',
  '👍', '👎', '👏', '🙌', '👐', '🤝', '🙏', '✌️', '🤞', '🤟', '🤘', '👌', '👈', '👉', '👆', '👇',
  '💪', '🦾', '🦿', '🦵', '🦶', '👂', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
  '⭐', '🌟', '✨', '💫', '⚡', '🔥', '💥', '💯', '✅', '❌', '⚠️', '🚀', '🎉', '🎊', '🎈', '🎁'
];

export const MessagesView = ({
  messages,
  userId,
  newMessage,
  setNewMessage,
  onSendMessage,
  loading
}: MessagesViewProps) => {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const newMessageRef = useRef<HTMLTextAreaElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const renderMessageWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        const isVideoLink = part.includes('video-conference');
        const isInternalLink = part.includes(window.location.origin);
        
        if (isInternalLink && isVideoLink) {
          const roomMatch = part.match(/room=([^&\s]+)/);
          return (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                if (roomMatch) {
                  navigate(`/video-conference?room=${roomMatch[1]}`);
                }
              }}
              className="underline hover:opacity-80 font-semibold text-green-400 inline-flex items-center gap-1 break-all"
            >
              🎥 Присоединиться к конференции
            </button>
          );
        }
        
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline hover:opacity-80 font-semibold break-all inline-flex items-center gap-1 ${
              isVideoLink ? 'text-green-400' : 'text-blue-400'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {isVideoLink && '🎥 '}
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const addEmoji = (emoji: string) => {
    const textarea = newMessageRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = newMessage;
    const newText = text.substring(0, start) + emoji + text.substring(end);
    
    setNewMessage(newText);
    setShowEmojiPicker(false);
    
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + emoji.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (newMessage.trim()) {
        onSendMessage();
      }
    }
  };

  return (
    <Card className="bg-slate-800/50 border-blue-600/30 lg:col-span-2 flex flex-col" style={{ maxHeight: '600px' }}>
      <CardHeader className="flex-shrink-0">
        <CardTitle className="text-white">Сообщения</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-slate-400 text-center">Выберите чат для просмотра сообщений</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto mb-4 space-y-4">
              {messages.map(msg => {
                const isCurrentUser = msg.sender_id === userId;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-lg ${
                        isCurrentUser
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-white'
                      }`}
                    >
                      {!isCurrentUser && (
                        <div className="mb-1">
                          <p className="text-xs font-semibold text-blue-300">{msg.sender_name}</p>
                          <p className="text-xs text-slate-400">{msg.sender_company}</p>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap break-words">{renderMessageWithLinks(msg.message_text)}</p>
                      <p className="text-xs mt-1 opacity-70">
                        {new Date(msg.created_at).toLocaleString('ru-RU')}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="flex-shrink-0 space-y-2">
              <div className="flex gap-2 items-end">
                <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="bg-slate-700/50 border-blue-600/30 hover:bg-slate-600/50"
                    >
                      😊
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 bg-slate-800 border-blue-600/30 p-2">
                    <div className="grid grid-cols-8 gap-1 max-h-[200px] overflow-y-auto">
                      {EMOJI_LIST.map((emoji, idx) => (
                        <button
                          key={idx}
                          onClick={() => addEmoji(emoji)}
                          className="text-2xl hover:bg-slate-700/50 rounded p-1 transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Textarea
                  ref={newMessageRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Введите сообщение... (Enter - отправить, Shift+Enter - новая строка)"
                  className="flex-1 bg-slate-900/50 text-white border-blue-600/30 min-h-[80px]"
                />

                <Button
                  onClick={onSendMessage}
                  disabled={loading || !newMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700 self-end"
                >
                  <Icon name="Send" size={20} />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

import { useState } from 'react';
