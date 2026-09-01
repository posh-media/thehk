import { showToast } from '@lib/toast';
import { Service } from '@/types/domain';

export function openService(router: { push: (path: any) => void }, service: Service) {
  if (service.implemented === false) {
    showToast('Coming soon');
    return;
  }
  if (service.route) {
    router.push(service.route as any);
  }
}
