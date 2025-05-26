
import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Volume2, VolumeX } from 'lucide-react';
import { SoundManager } from '@/services/soundManager';

export const SoundSettings: React.FC = () => {
  const soundManager = SoundManager.getInstance();
  const [enabled, setEnabled] = React.useState(soundManager.isEnabled());
  const [volume, setVolume] = React.useState(soundManager.getVolume());

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    soundManager.setEnabled(checked);
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    soundManager.setVolume(newVolume);
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-slate-900/50 border-slate-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {enabled ? <Volume2 className="w-4 h-4 text-gray-300" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
          <span className="font-medium text-gray-100">Sound Effects</span>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={handleToggle}
        />
      </div>

      {enabled && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-400">
            <span>Volume</span>
            <span>{Math.round(volume * 100)}%</span>
          </div>
          <Slider
            value={[volume]}
            onValueChange={handleVolumeChange}
            min={0}
            max={1}
            step={0.1}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
};
