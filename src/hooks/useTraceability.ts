// Hook de traçabilité
import { useAuth } from '../contexts/AuthContext';
import { TraceabilityService } from '../services/TraceabilityService';

export const useTraceability = () => {
  const { user } = useAuth();
  
  const logAction = async (
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    tableName: string,
    recordId: string,
    oldValues?: any,
    newValues?: any,
    additionalInfo?: any
  ) => {
    if (!user) return;
    
    switch (action) {
      case 'CREATE':
        await TraceabilityService.logCreation(
          tableName, recordId, newValues, user.id, additionalInfo
        );
        break;
      case 'UPDATE':
        await TraceabilityService.logUpdate(
          tableName, recordId, oldValues, newValues, user.id, additionalInfo
        );
        break;
      case 'DELETE':
        await TraceabilityService.logDeletion(
          tableName, recordId, oldValues, user.id, additionalInfo
        );
        break;
    }
  };
  
  return { logAction };
};
