import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';

export interface UploadedFile {
  url: string;
  type: 'audio' | 'image' | 'video' | 'document';
  name: string;
}

export const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const getFileType = (file: File): 'audio' | 'image' | 'video' | 'document' => {
    // Audio types - common formats
    if (file.type.startsWith('audio/') || 
        file.type === 'application/ogg' ||
        file.name.toLowerCase().endsWith('.ogg') ||
        file.name.toLowerCase().endsWith('.mp3') ||
        file.name.toLowerCase().endsWith('.m4a') ||
        file.name.toLowerCase().endsWith('.wav')) {
      return 'audio';
    }
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    return 'document';
  };

  const uploadFile = async (file: File): Promise<UploadedFile | null> => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive",
      });
      return null;
    }

    // Validate file size (25MB limit)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      toast({
        title: "Erro",
        description: "Arquivo muito grande. Limite de 25MB.",
        variant: "destructive",
      });
      return null;
    }

    // Validate audio file types specifically
    const fileType = getFileType(file);
    if (fileType === 'audio') {
      const allowedAudioTypes = [
        'audio/mpeg', // MP3
        'audio/mp3',
        'audio/ogg', // OGG
        'application/ogg',
        'audio/wav', // WAV
        'audio/x-wav',
        'audio/mp4', // M4A
        'audio/x-m4a',
        'audio/webm', // WebM (gravações do navegador)
        'audio/webm;codecs=opus'
      ];
      
      const isValidAudio = allowedAudioTypes.includes(file.type) || 
                          file.name.toLowerCase().match(/\.(mp3|ogg|wav|m4a|webm)$/);
      
      if (!isValidAudio) {
        toast({
          title: "Erro",
          description: "Formato de áudio não suportado. Use MP3, OGG, WAV, M4A ou WebM.",
          variant: "destructive",
        });
        return null;
      }
    }

    setUploading(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('chat-uploads')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get signed URL for 24 hours
      const { data: urlData, error: urlError } = await supabase.storage
        .from('chat-uploads')
        .createSignedUrl(filePath, 86400); // 24 hours

      if (urlError) {
        throw urlError;
      }

      const uploadedFile: UploadedFile = {
        url: urlData.signedUrl,
        type: getFileType(file),
        name: file.name,
      };

      toast({
        title: "Sucesso",
        description: "Arquivo enviado com sucesso",
      });

      return uploadedFile;
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar arquivo",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  return {
    uploadFile,
    uploading,
  };
};