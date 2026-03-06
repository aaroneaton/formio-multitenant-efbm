import { TenantConfig } from '../../shared/models/tenant.model';

export const TENANTS: TenantConfig[] = [
  {
    id: 'tenant-1',
    displayName: 'Tenant 1',
    projectUrl: 'http://localhost:3000/tenant-1',
  },
  {
    id: 'tenant-2',
    displayName: 'Tenant 2',
    projectUrl: 'http://localhost:3000/tenant-2',
  },
];
