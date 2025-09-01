// Secure logging utility that prevents sensitive data exposure in production
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: Date;
}

class SecureLogger {
  private isDevelopment = import.meta.env.DEV;
  
  private sanitizeData(data: any): any {
    if (!data) return data;
    
    // Remove sensitive keys
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth', 'session'];
    
    if (typeof data === 'object') {
      const sanitized = { ...data };
      
      for (const key of Object.keys(sanitized)) {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          sanitized[key] = '[REDACTED]';
        }
      }
      
      return sanitized;
    }
    
    return data;
  }
  
  private log(level: LogLevel, message: string, data?: any) {
    // Only log in development
    if (!this.isDevelopment) return;
    
    const entry: LogEntry = {
      level,
      message,
      data: this.sanitizeData(data),
      timestamp: new Date()
    };
    
    switch (level) {
      case 'debug':
        console.log(`[${entry.timestamp.toISOString()}] DEBUG: ${message}`, entry.data);
        break;
      case 'info':
        console.info(`[${entry.timestamp.toISOString()}] INFO: ${message}`, entry.data);
        break;
      case 'warn':
        console.warn(`[${entry.timestamp.toISOString()}] WARN: ${message}`, entry.data);
        break;
      case 'error':
        console.error(`[${entry.timestamp.toISOString()}] ERROR: ${message}`, entry.data);
        break;
    }
  }
  
  debug(message: string, data?: any) {
    this.log('debug', message, data);
  }
  
  info(message: string, data?: any) {
    this.log('info', message, data);
  }
  
  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }
  
  error(message: string, data?: any) {
    this.log('error', message, data);
  }
}

export const logger = new SecureLogger();

// Generic error messages for production
export const GENERIC_ERROR_MESSAGES = {
  AUTH_FAILED: 'Falha na autenticação. Tente novamente.',
  INVALID_CREDENTIALS: 'Credenciais inválidas.',
  SESSION_EXPIRED: 'Sessão expirada. Faça login novamente.',
  NETWORK_ERROR: 'Erro de conexão. Verifique sua internet.',
  GENERIC: 'Ocorreu um erro inesperado. Tente novamente.',
  PASSWORD_RESET_FAILED: 'Não foi possível redefinir a senha. Tente novamente.',
  UPLOAD_FAILED: 'Falha no upload do arquivo.',
} as const;