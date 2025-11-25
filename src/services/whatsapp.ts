import { supabase } from '@/integrations/supabase/client';

interface WhatsAppResponse {
  success: boolean;
  qrCode?: string;
  sessionId?: string;
  status?: string;
  error?: string;
  message?: string;
}

class WhatsAppService {
  private async getCompanyId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();
    
    if (!profile?.company_id) throw new Error('Empresa não encontrada');
    return profile.company_id;
  }

  async startConnection(chipId: string, authToken?: string): Promise<WhatsAppResponse> {
    try {
      const companyId = await this.getCompanyId();
      
      // Buscar o chip para obter o evolution_instance_id
      const { data: chip } = await supabase
        .from('chips')
        .select('evolution_instance_id')
        .eq('id', chipId)
        .single();
      
      const instanceId = chip?.evolution_instance_id || chipId;
      
      // Criar instância na Evolution API
      const { data: createData, error: createError } = await supabase.functions.invoke('evolution-manager', {
        body: { action: 'create-instance', chipId: instanceId, companyId }
      });

      if (createError) throw createError;
      
      // Conectar instância
      const { data: connectData, error: connectError } = await supabase.functions.invoke('evolution-manager', {
        body: { action: 'connect', chipId: instanceId, companyId }
      });

      if (connectError) throw connectError;

      return {
        success: true,
        qrCode: connectData.qrCode,
        status: connectData.status
      };
    } catch (error: any) {
      console.error("Error starting connection:", error);
      return { success: false, error: error.message || "Failed to start connection" };
    }
  }

  async getStatus(chipId: string, authToken?: string): Promise<WhatsAppResponse> {
    try {
      const companyId = await this.getCompanyId();
      
      // Buscar o chip para obter o evolution_instance_id
      const { data: chip } = await supabase
        .from('chips')
        .select('evolution_instance_id')
        .eq('id', chipId)
        .single();
      
      const instanceId = chip?.evolution_instance_id || chipId;
      
      const { data, error } = await supabase.functions.invoke('evolution-manager', {
        body: { action: 'get-status', chipId: instanceId, companyId }
      });

      if (error) throw error;

      return {
        success: true,
        status: data.status
      };
    } catch (error: any) {
      console.error("Error getting status:", error);
      return { success: false, error: error.message || "Failed to get status" };
    }
  }

  async simulateScan(chipId: string, authToken?: string, scanned: boolean = true): Promise<WhatsAppResponse> {
    try {
      const companyId = await this.getCompanyId();
      
      // Buscar o chip para obter o evolution_instance_id
      const { data: chip } = await supabase
        .from('chips')
        .select('evolution_instance_id')
        .eq('id', chipId)
        .single();
      
      const instanceId = chip?.evolution_instance_id || chipId;
      
      const { data, error } = await supabase.functions.invoke('evolution-manager', {
        body: { action: 'disconnect', chipId: instanceId, companyId }
      });

      if (error) throw error;

      return { success: true, message: 'Desconectado com sucesso' };
    } catch (error: any) {
      console.error("Error disconnecting:", error);
      return { success: false, error: error.message || "Failed to disconnect" };
    }
  }

  async sendMessage(
    chipId: string,
    phone: string,
    message: string,
    authToken?: string
  ): Promise<WhatsAppResponse> {
    try {
      const companyId = await this.getCompanyId();
      
      // Buscar o chip para obter o evolution_instance_id
      const { data: chip } = await supabase
        .from('chips')
        .select('evolution_instance_id')
        .eq('id', chipId)
        .single();
      
      const instanceId = chip?.evolution_instance_id || chipId;
      
      const { data, error } = await supabase.functions.invoke('evolution-manager', {
        body: { 
          action: 'send-message', 
          chipId: instanceId, 
          phoneNumber: phone, 
          message,
          companyId 
        }
      });

      if (error) throw error;

      return {
        success: true,
        ...data
      };
    } catch (error: any) {
      console.error("Error sending message:", error);
      return { success: false, error: error.message || "Failed to send message" };
    }
  }

  async getQrCode(chipId: string): Promise<string | null> {
    try {
      // QR code é atualizado via webhook e salvo no banco
      const { data, error } = await supabase
        .from('chips')
        .select('qr_code')
        .eq('id', chipId)
        .single();

      if (error || !data?.qr_code) return null;
      
      return data.qr_code;
    } catch (error) {
      console.error("Error getting QR code:", error);
      return null;
    }
  }

  async listInstances(): Promise<any> {
    try {
      const companyId = await this.getCompanyId();
      
      const { data, error } = await supabase.functions.invoke('evolution-manager', {
        body: { action: 'list-instances', companyId }
      });

      if (error) throw error;

      return {
        success: true,
        instances: data.instances
      };
    } catch (error: any) {
      console.error("Error listing instances:", error);
      return { success: false, error: error.message || "Failed to list instances" };
    }
  }
}

export const whatsappService = new WhatsAppService();
