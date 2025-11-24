-- Corrigir search_path da função log_chip_status_change
DROP FUNCTION IF EXISTS log_chip_status_change() CASCADE;

CREATE OR REPLACE FUNCTION log_chip_status_change()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Recriar trigger
CREATE TRIGGER chip_status_change_trigger
  AFTER UPDATE ON chips
  FOR EACH ROW
  EXECUTE FUNCTION log_chip_status_change();