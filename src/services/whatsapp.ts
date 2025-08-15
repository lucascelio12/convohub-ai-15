interface WhatsAppResponse {
  success: boolean;
  qrCode?: string;
  sessionId?: string;
  status?: string;
  error?: string;
  message?: string;
}

class WhatsAppService {
  private baseUrl = 'http://localhost:3001/whatsapp';

  async startConnection(chipId: string, authToken: string): Promise<WhatsAppResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ chipId })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao iniciar conexão');
      }

      return data;
    } catch (error) {
      console.error('Erro ao conectar chip:', error);
      throw error;
    }
  }


  async getStatus(chipId: string, authToken: string): Promise<WhatsAppResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/status?chipId=${chipId}`, {
        method: 'GET'
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao obter status');
      }

      return data;
    } catch (error) {
      console.error('Erro ao obter status:', error);
      throw error;
    }
  }

  async simulateScan(chipId: string, authToken: string, scanned: boolean = true): Promise<WhatsAppResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ chipId })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar scan');
      }

      return data;
    } catch (error) {
      console.error('Erro ao processar scan:', error);
      throw error;
    }
  }

  async sendMessage(chipId: string, phone: string, message: string, authToken: string): Promise<WhatsAppResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ chipId, phone, message })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar mensagem');
      }

      return data;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      throw error;
    }
  }
}

export const whatsappService = new WhatsAppService();