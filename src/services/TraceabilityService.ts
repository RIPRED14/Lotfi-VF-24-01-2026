// Service de traçabilité des créations et modifications
import { supabase } from '../integrations/supabase/client';

export class TraceabilityService {
  static async logCreation(
    tableName: string,
    recordId: string,
    newValues: any,
    userId: string,
    additionalInfo?: any
  ) {
    try {
      await supabase.from('audit_logs').insert({
        table_name: tableName,
        record_id: recordId,
        action: 'CREATE',
        new_values: newValues,
        user_id: userId,
        ip_address: await this.getClientIP(),
        user_agent: navigator.userAgent,
        session_id: this.getSessionId(),
        change_reason: additionalInfo?.reason || 'Création de produit',
        change_category: 'PRODUCT_CREATION',
        impact_level: 'HIGH'
      });
    } catch (error) {
      console.error('Erreur de traçabilité:', error);
    }
  }
  
  static async logUpdate(
    tableName: string,
    recordId: string,
    oldValues: any,
    newValues: any,
    userId: string,
    additionalInfo?: any
  ) {
    try {
      await supabase.from('audit_logs').insert({
        table_name: tableName,
        record_id: recordId,
        action: 'UPDATE',
        old_values: oldValues,
        new_values: newValues,
        user_id: userId,
        ip_address: await this.getClientIP(),
        user_agent: navigator.userAgent,
        session_id: this.getSessionId(),
        change_reason: additionalInfo?.reason || 'Modification de produit',
        change_category: additionalInfo?.category || 'PRODUCT_UPDATE',
        impact_level: additionalInfo?.impact || 'MEDIUM'
      });
    } catch (error) {
      console.error('Erreur de traçabilité:', error);
    }
  }
  
  static async logDeletion(
    tableName: string,
    recordId: string,
    oldValues: any,
    userId: string,
    additionalInfo?: any
  ) {
    try {
      await supabase.from('audit_logs').insert({
        table_name: tableName,
        record_id: recordId,
        action: 'DELETE',
        old_values: oldValues,
        user_id: userId,
        ip_address: await this.getClientIP(),
        user_agent: navigator.userAgent,
        session_id: this.getSessionId(),
        change_reason: additionalInfo?.reason || 'Suppression de produit',
        change_category: 'PRODUCT_DELETION',
        impact_level: 'HIGH'
      });
    } catch (error) {
      console.error('Erreur de traçabilité:', error);
    }
  }
  
  private static async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return '127.0.0.1';
    }
  }
  
  private static getSessionId(): string {
    return sessionStorage.getItem('sessionId') || 'unknown';
  }
}
