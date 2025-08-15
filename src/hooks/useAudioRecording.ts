import { useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export type RecordingState = 'idle' | 'requesting-permission' | 'recording' | 'processing';

export interface AudioRecordingResult {
  file: File;
  duration: number;
}

export const useAudioRecording = () => {
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  
  const { toast } = useToast();

  const requestPermission = async (): Promise<boolean> => {
    try {
      setState('requesting-permission');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      streamRef.current = stream;
      setHasPermission(true);
      setState('idle');
      
      // Stop the stream immediately, we'll request it again when recording
      stream.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      
      return true;
    } catch (error) {
      console.error('Permission denied:', error);
      setHasPermission(false);
      setState('idle');
      
      toast({
        title: "Permissão negada",
        description: "Precisamos acessar o microfone para gravar áudio. Verifique as configurações do seu navegador.",
        variant: "destructive",
      });
      
      return false;
    }
  };

  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      // Check permission first
      if (hasPermission === null) {
        const permitted = await requestPermission();
        if (!permitted) return false;
      } else if (hasPermission === false) {
        await requestPermission();
        return false;
      }

      setState('requesting-permission');
      
      // Get media stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      streamRef.current = stream;
      chunksRef.current = [];
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/webm'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      startTimeRef.current = Date.now();
      setState('recording');
      setDuration(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
      
      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      setState('idle');
      
      toast({
        title: "Erro ao iniciar gravação",
        description: "Não foi possível acessar o microfone. Tente novamente.",
        variant: "destructive",
      });
      
      return false;
    }
  }, [hasPermission, toast]);

  const stopRecording = useCallback((): Promise<AudioRecordingResult | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || state !== 'recording') {
        resolve(null);
        return;
      }

      setState('processing');
      
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      mediaRecorderRef.current.onstop = () => {
        try {
          const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
          const blob = new Blob(chunksRef.current, { type: mimeType });
          
          // Create file
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const extension = mimeType.includes('webm') ? 'webm' : 'ogg';
          const filename = `audio_gravado_${timestamp}.${extension}`;
          
          const file = new File([blob], filename, { type: mimeType });
          const recordingDuration = duration;
          
          // Cleanup
          cleanup();
          
          resolve({
            file,
            duration: recordingDuration
          });
        } catch (error) {
          console.error('Error processing recording:', error);
          cleanup();
          resolve(null);
        }
      };
      
      mediaRecorderRef.current.stop();
    });
  }, [state, duration]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    cleanup();
  }, [state]);

  const cleanup = useCallback(() => {
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Reset refs
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    
    setState('idle');
    setDuration(0);
  }, []);

  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Cleanup on unmount
  const destroy = useCallback(() => {
    cleanup();
  }, [cleanup]);

  return {
    state,
    duration,
    hasPermission,
    formatDuration,
    startRecording,
    stopRecording,
    cancelRecording,
    cleanup,
    destroy
  };
};