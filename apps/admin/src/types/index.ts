export type UserRole = 'customer' | 'technician' | 'admin'
export type TechnicianStatus = 'pending' | 'approved' | 'denied'
export type WorkOrderStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Technician {
  id: string; user_id: string; status: TechnicianStatus; full_name: string; email: string
  phone: string; address: string | null; city: string | null; state: string | null; zip: string | null
  skills: string[]; certifications: string[]; years_experience: number; bio: string | null
  current_lat: number | null; current_lng: number | null; last_location_at: string | null
  is_online: boolean; admin_notes: string | null; reviewed_at: string | null
  created_at: string; updated_at: string
}

export interface Customer {
  id: string; user_id: string; full_name: string; email: string; phone: string | null
  address: string | null; city: string | null; state: string | null; zip: string | null
}

export interface WorkOrder {
  id: string; wo_number: string; title: string; description: string; service_type: string
  priority: WorkOrderPriority; status: WorkOrderStatus
  customer_id: string | null; assigned_tech_id: string | null; assigned_at: string | null
  job_address: string; job_city: string; job_state: string; job_zip: string
  job_lat: number | null; job_lng: number | null
  scheduled_date: string | null; scheduled_time: string | null; estimated_hours: number | null
  started_at: string | null; completed_at: string | null; completion_notes: string | null
  estimated_cost: number | null; final_cost: number | null; notes: string | null
  created_at: string; updated_at: string
  customer?: Customer; technician?: Technician
}

export interface WorkOrderHistory {
  id: string; work_order_id: string; from_status: WorkOrderStatus | null
  to_status: WorkOrderStatus; note: string | null; created_at: string
}

export interface Notification {
  id: string; user_id: string; title: string; message: string; type: string
  read: boolean; link: string | null; created_at: string
}

export const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  pending: 'Pending', assigned: 'Assigned', in_progress: 'In Progress',
  completed: 'Completed', cancelled: 'Cancelled',
}
export const STATUS_COLORS: Record<WorkOrderStatus, string> = {
  pending: '#F59E0B', assigned: '#3B82F6', in_progress: '#8B5CF6',
  completed: '#10B981', cancelled: '#6B7280',
}
export const PRIORITY_LABELS: Record<WorkOrderPriority, string> = {
  low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent',
}
export const PRIORITY_COLORS: Record<WorkOrderPriority, string> = {
  low: '#10B981', medium: '#3B82F6', high: '#F59E0B', urgent: '#EF4444',
}
export const TECH_STATUS_COLORS: Record<TechnicianStatus, string> = {
  pending: '#F59E0B', approved: '#10B981', denied: '#EF4444',
}

export const SERVICE_TYPES = [
  'Deep Cleaning','Standard Cleaning','Move-In / Move-Out','Post-Construction',
  'Commercial Cleaning','Carpet Cleaning','Window Cleaning','Upholstery Cleaning',
  'Pressure Washing','Other',
]
