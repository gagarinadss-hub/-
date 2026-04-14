export type Profile = {
  id: string
  user_id: string
  full_name: string
  username: string | null
  city: string | null
  bio: string | null
  profession: string | null
  interests: string[]
  goals: string | null
  help_with: string | null
  looking_for: string[]
  avatar_url: string | null
  is_admin: boolean
  is_active: boolean
  allow_notifications: boolean
  allow_sound_notifications: boolean
  created_at: string
  updated_at: string
}

export type Match = {
  id: string
  user_a_id: string
  user_b_id: string
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'expired'
  match_reason: string | null
  score: number | null
  created_by: string | null
  created_at: string
  updated_at: string
  profile_a?: Profile
  profile_b?: Profile
}

export type MeetingStatus =
  | 'awaiting_response'    // proposed, waiting for partner to confirm
  | 'confirmed'            // partner accepted
  | 'reschedule_requested' // partner wants a different time
  | 'declined'             // partner declined
  | 'cancelled'            // initiator cancelled
  | 'proposed'             // legacy / admin-created
  | 'completed'            // meeting happened, feedback collected

export type Meeting = {
  id: string
  match_id: string
  proposed_by: string
  scheduled_at: string | null
  format: 'online' | 'offline' | 'any' | null
  location_or_link: string | null
  comment: string | null
  status: MeetingStatus
  created_at: string
  updated_at: string
}

export type MeetingFeedback = {
  id: string
  meeting_id: string
  user_id: string
  rating: number | null
  want_again: boolean | null
  comment: string | null
  submitted_at: string
}

export type Message = {
  id: string
  match_id: string
  sender_id: string
  receiver_id: string
  message_text: string
  is_read: boolean
  created_at: string
}

export type Notification = {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

export type Announcement = {
  id: string
  title: string
  body: string
  author_id: string
  pinned: boolean
  created_at: string
  author?: Profile
}

export type Event = {
  id: string
  title: string
  description: string | null
  event_date: string | null
  format: 'online' | 'offline' | 'hybrid' | null
  location_or_link: string | null
  is_active: boolean
  created_at: string
}

export type UserActivity = {
  id: string
  user_id: string
  last_seen_at: string
  available_for_matching: boolean
}
