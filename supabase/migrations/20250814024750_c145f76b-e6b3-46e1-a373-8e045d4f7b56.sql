-- Migration: Renomear coluna 'text' para 'content' na tabela messages
-- Objetivo: Corrigir incompatibilidade entre schema da tabela e Edge Function

-- 1. Verificar se a coluna 'text' existe e 'content' não existe
DO $$
DECLARE
    text_exists boolean;
    content_exists boolean;
BEGIN
    -- Verificar se coluna 'text' existe
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'text'
    ) INTO text_exists;
    
    -- Verificar se coluna 'content' existe
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'messages' 
        AND column_name = 'content'
    ) INTO content_exists;
    
    RAISE NOTICE 'Estado atual: text_exists=%, content_exists=%', text_exists, content_exists;
    
    -- Se 'text' existe e 'content' não existe, renomear
    IF text_exists AND NOT content_exists THEN
        RAISE NOTICE 'Renomeando coluna text para content...';
        ALTER TABLE public.messages RENAME COLUMN text TO content;
        RAISE NOTICE 'Coluna renomeada com sucesso!';
    ELSIF content_exists THEN
        RAISE NOTICE 'Coluna content já existe, nenhuma ação necessária';
    ELSIF NOT text_exists THEN
        RAISE NOTICE 'Coluna text não encontrada, verificando se precisa criar content...';
        IF NOT content_exists THEN
            RAISE NOTICE 'Criando coluna content...';
            ALTER TABLE public.messages ADD COLUMN content TEXT NOT NULL DEFAULT '';
            RAISE NOTICE 'Coluna content criada!';
        END IF;
    END IF;
END $$;

-- 2. Garantir que a coluna content tenha as restrições corretas
ALTER TABLE public.messages 
ALTER COLUMN content SET NOT NULL;

-- 3. Forçar reload do cache PostgREST
NOTIFY pgrst, 'reload schema';

-- 4. Verificação final
DO $$
DECLARE
    content_exists boolean;
    content_type text;
    content_nullable text;
BEGIN
    SELECT 
        EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'messages' 
            AND column_name = 'content'
        ),
        data_type,
        is_nullable
    INTO content_exists, content_type, content_nullable
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messages' 
    AND column_name = 'content';
    
    RAISE NOTICE 'RESULTADO FINAL:';
    RAISE NOTICE 'content_exists: %', content_exists;
    RAISE NOTICE 'content_type: %', content_type;
    RAISE NOTICE 'content_nullable: %', content_nullable;
    
    IF content_exists THEN
        RAISE NOTICE 'SUCCESS: Schema corrigido! Coluna content está disponível.';
    ELSE
        RAISE WARNING 'ERRO: Coluna content ainda não existe!';
    END IF;
END $$;