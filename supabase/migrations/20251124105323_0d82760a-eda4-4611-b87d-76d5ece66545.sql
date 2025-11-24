-- Adicionar campo assigned_to na tabela chips para atribuir atendente específico
ALTER TABLE chips ADD COLUMN assigned_to uuid REFERENCES profiles(user_id);

-- Criar índice para melhorar performance de consultas (apenas os que não existem)
CREATE INDEX IF NOT EXISTS idx_chips_assigned_to ON chips(assigned_to);
CREATE INDEX IF NOT EXISTS idx_chips_company_id ON chips(company_id);

-- Criar tabela de logs de conexão dos chips
CREATE TABLE chip_connection_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chip_id uuid NOT NULL REFERENCES chips(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- 'connection_attempt', 'connected', 'disconnected', 'error', 'qr_generated'
  status text NOT NULL, -- 'success', 'error', 'pending'
  details text,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índices para a tabela de logs
CREATE INDEX idx_chip_logs_chip_id ON chip_connection_logs(chip_id);
CREATE INDEX idx_chip_logs_created_at ON chip_connection_logs(created_at DESC);
CREATE INDEX idx_chip_logs_event_type ON chip_connection_logs(event_type);

-- RLS policies para chip_connection_logs
ALTER TABLE chip_connection_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view logs from their chips"
  ON chip_connection_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chips
      WHERE chips.id = chip_connection_logs.chip_id
      AND chips.created_by = auth.uid()
    )
  );

CREATE POLICY "System can insert logs"
  ON chip_connection_logs
  FOR INSERT
  WITH CHECK (true);

-- Atualizar política de visualização de chips para incluir assigned_to
DROP POLICY IF EXISTS "Users can view chips they have access to" ON chips;

CREATE POLICY "Users can view chips they have access to"
  ON chips
  FOR SELECT
  USING (
    auth.uid() = created_by 
    OR auth.uid() = assigned_to
    OR EXISTS (
      SELECT 1 FROM user_permissions
      WHERE user_permissions.user_id = auth.uid()
      AND user_permissions.resource_type = 'chip'
      AND user_permissions.resource_id = chips.id
    )
  );

-- Adicionar trigger para registrar mudanças de status automaticamente
CREATE OR REPLACE FUNCTION log_chip_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO chip_connection_logs (chip_id, event_type, status, details)
    VALUES (
      NEW.id,
      CASE 
        WHEN NEW.status = 'connected' THEN 'connected'
        WHEN NEW.status = 'disconnected' THEN 'disconnected'
        WHEN NEW.status = 'connecting' THEN 'connection_attempt'
        WHEN NEW.status = 'waiting_qr' THEN 'qr_generated'
        ELSE 'status_change'
      END,
      'success',
      'Status changed from ' || COALESCE(OLD.status, 'null') || ' to ' || NEW.status
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chip_status_change_trigger
  AFTER UPDATE ON chips
  FOR EACH ROW
  EXECUTE FUNCTION log_chip_status_change();