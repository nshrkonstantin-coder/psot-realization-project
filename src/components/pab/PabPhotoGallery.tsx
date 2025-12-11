import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';

interface PabPhotoGalleryProps {
  photoFiles: (File | null)[];
  onPhotoChange: (index: number, file: File | null) => void;
}

export const PabPhotoGallery = ({ photoFiles, onPhotoChange }: PabPhotoGalleryProps) => {
  return (
    <Card className="bg-slate-800/50 border-yellow-600/30 p-6">
      <h2 className="text-2xl font-bold text-yellow-500 mb-6">Фотографии</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[0, 1, 2].map((index) => (
          <div key={index}>
            <Label className="text-slate-300">Фото {index + 1}</Label>
            <input
              type="file"
              accept="*/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                onPhotoChange(index, file);
              }}
              className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-yellow-600 file:text-white file:cursor-pointer hover:file:bg-yellow-700"
            />
            {photoFiles[index] && (
              <div className="mt-2 flex items-center gap-2 text-green-500">
                <Icon name="CheckCircle" size={16} />
                <span className="text-sm">{photoFiles[index]?.name}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};