export type Client = {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type Appointment = {
  id: string;
  date: string; // YYYY-MM-DD, local salon date
  time: string; // HH:MM, 24h
  duration: number; // minutes
  clientId: string;
  service: string; // ServiceType.id
  notes: string;
};

export type StaffMember = {
  id: string;
  name: string;
  role: string;
  initials: string;
};

export type ServiceType = {
  id: string;
  label: string;
  color: string; // hex
};

export type AgendaState = {
  clients: Client[];
  appointments: Appointment[];
  staff: StaffMember[];
  services: ServiceType[];
};
