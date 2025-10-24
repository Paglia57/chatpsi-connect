import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { logger, GENERIC_ERROR_MESSAGES } from '@/lib/logger';

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
    const fileName = file.name.toLowerCase();
    
    // Check for HEIC files specifically (MIME type can be inconsistent)
    if (fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
      logger.debug('HEIC file detected', { name: file.name, type: file.type });
      return 'image';
    }
    
    // Audio types - common formats
    if (file.type.startsWith('audio/') || 
        file.type === 'application/ogg' ||
        fileName.endsWith('.ogg') ||
        fileName.endsWith('.mp3') ||
        fileName.endsWith('.m4a') ||
        fileName.endsWith('.wav')) {
      return 'audio';
    }
    
    // Image types - check extension for better compatibility
    if (file.type.startsWith('image/') || 
        fileName.match(/\.(jpg|jpeg|png|webp)$/)) {
      return 'image';
    }
    
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

    // Validate file types specifically
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
    
    if (fileType === 'image') {
      const fileName = file.name.toLowerCase();
      const allowedImageTypes = [
        'image/jpeg', // JPG/JPEG
        'image/jpg',
        'image/png', // PNG
        'image/heic', // HEIC
        'image/heif', // HEIF (variante do HEIC)
        'image/webp', // WEBP
        'application/octet-stream' // Fallback para HEIC em alguns sistemas
      ];
      
      // For HEIC files, prioritize extension over MIME type
      const isHEIC = fileName.match(/\.(heic|heif)$/);
      const isValidImage = allowedImageTypes.includes(file.type) || 
                          fileName.match(/\.(jpg|jpeg|png|heic|heif|webp)$/) ||
                          (isHEIC && file.type === 'application/octet-stream');
      
      logger.debug('Image validation result', {
        fileName: file.name,
        fileType: file.type,
        isHEIC,
        isValidImage
      });
      
      if (!isValidImage) {
        toast({
          title: "Erro",
          description: "Formato de imagem não suportado. Use JPG, JPEG, PNG, HEIC ou WEBP.",
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

      // Generate public URL (permanent, no expiry)
      const supabaseUrl = 'https://rrdvivxdasezvhfbetra.supabase.co';
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/chat-uploads/${filePath}`;

      const uploadedFile: UploadedFile = {
        url: publicUrl,
        type: getFileType(file),
        name: file.name,
      };

      toast({
        title: "Sucesso",
        description: "Arquivo enviado com sucesso",
      });

      return uploadedFile;
    } catch (error) {
      logger.error('File upload failed', error);
      toast({
        title: "Erro",
        description: GENERIC_ERROR_MESSAGES.UPLOAD_FAILED,
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