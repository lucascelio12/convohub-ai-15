-- Adicionar campo para armazenar o nome da instância da Evolution API
ALTER TABLE chips ADD COLUMN IF NOT EXISTS evolution_instance_id TEXT;

-- Criar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_chips_evolution_instance_id ON chips(evolution_instance_id);

-- Comentário explicativo
COMMENT ON COLUMN chips.evolution_instance_id IS 'Nome da instância na Evolution API para vincular com serviços externos';