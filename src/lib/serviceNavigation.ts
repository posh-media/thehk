import { Alert } from 'react-native';
import { Service } from '@/types/domain';

export function openService(router: { push: (path: any) => void }, service: Service) {
  if (service.implemented === false) {
    Alert.alert('Coming Soon', 'This service is not yet available.');
    return;
  }
  if (service.route) {
    router.push(service.route as any);
  }
}
