import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { useTenant } from '@/components/tenant-provider';
export function useTenantQuery<T>(options: UseQueryOptions<T, Error, T, readonly unknown[]>) {
  const { tenantId } = useTenant();
  return useQuery({ ...options, queryKey: [tenantId, ...options.queryKey], enabled: Boolean(tenantId) && options.enabled !== false, throwOnError: true });
}
