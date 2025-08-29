-- Adicionar campo queue_id na tabela chips para associar chips às filas
ALTER TABLE public.chips 
ADD COLUMN queue_id uuid;

-- Criar foreign key para queues
ALTER TABLE public.chips 
ADD CONSTRAINT chips_queue_id_fkey 
FOREIGN KEY (queue_id) REFERENCES public.queues(id) ON DELETE SET NULL;

-- Criar índice para melhor performance
CREATE INDEX idx_chips_queue_id ON public.chips(queue_id);