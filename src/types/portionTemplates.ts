// Portion Template types for dynamic portion management

export interface PortionTemplate {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PortionTemplateFormData {
  name: string;
  display_order?: number;
}
