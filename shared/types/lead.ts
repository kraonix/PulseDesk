export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'PROPOSAL_SENT'
  | 'WON'
  | 'LOST';

export type LeadSource =
  | 'WEBSITE'
  | 'REFERRAL'
  | 'COLD_OUTREACH'
  | 'EVENT'
  | 'OTHER';

export type LeadActivityType =
  | 'LEAD_CREATED'
  | 'LEAD_UPDATED'
  | 'STATUS_CHANGED'
  | 'ASSIGNED_MEMBER_CHANGED'
  | 'FOLLOW_UP_DATE_CHANGED'
  | 'NOTE_ADDED'
  | 'LEAD_DELETED';

export interface LeadActivityMetadata {
  field?:    string;
  oldValue?: string | null;
  newValue?: string | null;
}

export interface LeadActivity {
  id:        string;
  action:    LeadActivityType;
  metadata:  LeadActivityMetadata | null;
  createdAt: string;
  user: {
    id:        string;
    name:      string;
    email:     string;
    avatarUrl: string | null;
  };
}

export interface Lead {
  id:              string;
  name:            string;
  company:         string | null;
  email:           string | null;
  phone:           string | null;
  status:          LeadStatus;
  source:          LeadSource;
  value:           number | null;
  organizationId:  string;
  createdById:     string;
  assignedToId:    string | null;
  followUpDate:    string | null;
  lastContactedAt: string | null;
  closedAt:        string | null;
  createdAt:       string;
  updatedAt:       string;

  createdBy?:   import('./user').User;
  assignedTo?:  import('./user').User | null;
  notes?:       LeadNote[];
  activities?:  LeadActivity[];
  tags?:        Array<{ name: string }>;
  _count?:      { notes: number };
}

export interface LeadNote {
  id:        string;
  leadId:    string;
  authorId:  string;
  body:      string;
  createdAt: string;
  updatedAt: string;

  author?: import('./user').User;
}
