import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Volume2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
interface AudioPlayerProps {
  url: string;
  className?: string;
}
interface AudioState {
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  isLoading: boolean;
  hasError: boolean;
  isLoaded: boolean;
}
export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  url,
  className
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioState, setAudioState] = useState<AudioState>({
    isPlaying: false,
    duration: 0,
    currentTime: 0,
    isLoading: true,
    hasError: false,
    isLoaded: false
  });

  // Reset state when URL changes
  useEffect(() => {
    setAudioState({
      isPlaying: false,
      duration: 0,
      currentTime: 0,
      isLoading: true,
      hasError: false,
      isLoaded: false
    });
  }, [url]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleLoadStart = () => {
      setAudioState(prev => ({
        ...prev,
        isLoading: true,
        hasError: false
      }));
    };
    const handleLoadedMetadata = () => {
      setAudioState(prev => ({
        ...prev,
        duration: audio.duration || 0,
        isLoading: false,
        isLoaded: true
      }));
    };
    const handleTimeUpdate = () => {
      setAudioState(prev => ({
        ...prev,
        currentTime: audio.currentTime
      }));
    };
    const handlePlay = () => {
      setAudioState(prev => ({
        ...prev,
        isPlaying: true
      }));
    };
    const handlePause = () => {
      setAudioState(prev => ({
        ...prev,
        isPlaying: false
      }));
    };
    const handleEnded = () => {
      setAudioState(prev => ({
        ...prev,
        isPlaying: false,
        currentTime: 0
      }));
    };
    const handleError = () => {
      setAudioState(prev => ({
        ...prev,
        hasError: true,
        isLoading: false,
        isPlaying: false
      }));
    };
    const handleCanPlay = () => {
      setAudioState(prev => ({
        ...prev,
        isLoading: false
      }));
    };

    // Add event listeners
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);
    return () => {
      // Clean up event listeners
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, []);
  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio || audioState.hasError) return;
    try {
      if (audioState.isPlaying) {
        audio.pause();
      } else {
        await audio.play();
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setAudioState(prev => ({
        ...prev,
        hasError: true
      }));
    }
  };
  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio || audioState.hasError) return;
    const newTime = value[0];
    audio.currentTime = newTime;
    setAudioState(prev => ({
      ...prev,
      currentTime: newTime
    }));
  };
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  if (audioState.hasError) {
    return <Card className={cn("w-full max-w-sm", className)}>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">Erro ao carregar áudio</span>
          </div>
        </CardContent>
      </Card>;
  }
  return <Card className={cn("w-full max-w-sm", className)}>
      <CardContent className="p-3">
        <audio ref={audioRef} src={url} preload="metadata" className="hidden" />
        
        <div className="flex items-center gap-3">
          {/* Play/Pause Button */}
          <Button variant="outline" size="icon" onClick={togglePlayPause} disabled={audioState.isLoading || audioState.hasError} className="flex-shrink-0 h-8 w-8">
            {audioState.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : audioState.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>

          {/* Progress and Time */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Volume2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <div className="flex-1">
                <Slider value={[audioState.currentTime]} max={audioState.duration || 100} step={1} onValueChange={handleSeek} disabled={audioState.isLoading || audioState.hasError || !audioState.isLoaded} className="w-full" />
              </div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              
              
            </div>
          </div>
        </div>
      </CardContent>
    </Card>;
};