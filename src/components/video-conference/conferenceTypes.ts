export interface User {
  id: number;
  fio: string;
  email: string;
  company_id: number;
  company_name?: string;
}

export interface Company {
  id: number;
  name: string;
}

export interface Conference {
  id: string;
  name: string;
  creator_id: number;
  creator_name: string;
  participants: number[];
  created_at: string;
  status: 'active' | 'ended';
  is_favorite?: boolean;
  duration?: number;
  ended_at?: string;
}
