import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';

interface OrganizationUser {
  id: number;
  fio: string;
  position: string;
  subdivision: string;
  company: string;
  email: string;
  last_activity?: string;
}

interface ChatMessageDialogProps {
  open: boolean;
  selectedUser: OrganizationUser | null;
  chatMessage: string;
  showEmojiPicker: boolean;
  onChatMessageChange: (value: string) => void;
  onToggleEmojiPicker: () => void;
  onInsertEmoji: (emoji: string) => void;
  onSend: () => void;
  onClose: () => void;
}

const commonEmojis = ['😊', '😂', '❤️', '👍', '🔥', '✅', '⚠️', '📌', '💼', '🎯', '👋', '🙏', '💪', '🚀', '⭐', '✨'];

export default function ChatMessageDialog({
  open,
  selectedUser,
  chatMessage,
  showEmojiPicker,
  onChatMessageChange,
  onToggleEmojiPicker,
  onInsertEmoji,
  onSend,
  onClose
}: ChatMessageDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Icon name="MessageSquare" size={24} />
            Отправить сообщение
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {selectedUser && `Отправить сообщение для: ${selectedUser.fio}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {selectedUser && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2 rounded-lg">
                  <Icon name="User" size={20} className="text-white" />
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">{selectedUser.fio}</h4>
                  {selectedUser.position && (
                    <p className="text-slate-400 text-sm">{selectedUser.position}</p>
                  )}
                  {selectedUser.subdivision && (
                    <p className="text-slate-500 text-xs">{selectedUser.subdivision}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="relative">
            <Textarea
              placeholder="Введите сообщение..."
              value={chatMessage}
              onChange={(e) => onChatMessageChange(e.target.value)}
              className="min-h-[200px] bg-slate-800/50 border-slate-700 text-white resize-none"
            />
            
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onToggleEmojiPicker}
              className="absolute bottom-2 right-2 text-yellow-500 hover:text-yellow-400"
            >
              <Icon name="Smile" size={20} />
            </Button>
          </div>

          {showEmojiPicker && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
              <div className="flex flex-wrap gap-2">
                {commonEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => onInsertEmoji(emoji)}
                    className="text-2xl hover:scale-125 transition-transform p-2 hover:bg-slate-700 rounded"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-slate-600 text-white hover:bg-slate-800"
            >
              Отмена
            </Button>
            <Button
              onClick={onSend}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Icon name="Send" size={18} className="mr-2" />
              Отправить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
