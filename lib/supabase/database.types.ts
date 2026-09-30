
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "admin_users": {
                  Row: {
                    "created_at": string,"email": string
                  }
                  Insert: {
                    "created_at"?: string,"email": string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string
                  }
                  Relationships: [
                    
                  ]
                },"attendees": {
                  Row: {
                    "city": string | null,"created_at": string,"current_last_name": string | null,"edit_token_hash": string,"email": string,"first_name": string,"grad_school": Database["public"]['Enums']["grad_school"],"hs_last_name": string,"id": string,"nickname": string | null,"phone": string | null,"photo_hidden": boolean,"photo_path": string | null,"show_in_directory": boolean,"state": string | null,"status": Database["public"]['Enums']["attendee_status"],"then_photo_path": string | null,"updated_at": string,"yearbook_crop": Json | null,"yearbook_page_id": string | null
                  }
                  Insert: {
                    "city"?: string | null,"created_at"?: string,"current_last_name"?: string | null,"edit_token_hash": string,"email": string,"first_name": string,"grad_school": Database["public"]['Enums']["grad_school"],"hs_last_name": string,"id"?: string,"nickname"?: string | null,"phone"?: string | null,"photo_hidden"?: boolean,"photo_path"?: string | null,"show_in_directory"?: boolean,"state"?: string | null,"status"?: Database["public"]['Enums']["attendee_status"],"then_photo_path"?: string | null,"updated_at"?: string,"yearbook_crop"?: Json | null,"yearbook_page_id"?: string | null
                  }
                  Update: {
                    "city"?: string | null,"created_at"?: string,"current_last_name"?: string | null,"edit_token_hash"?: string,"email"?: string,"first_name"?: string,"grad_school"?: Database["public"]['Enums']["grad_school"],"hs_last_name"?: string,"id"?: string,"nickname"?: string | null,"phone"?: string | null,"photo_hidden"?: boolean,"photo_path"?: string | null,"show_in_directory"?: boolean,"state"?: string | null,"status"?: Database["public"]['Enums']["attendee_status"],"then_photo_path"?: string | null,"updated_at"?: string,"yearbook_crop"?: Json | null,"yearbook_page_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "attendees_yearbook_page_id_fkey"
      columns: ["yearbook_page_id"]
isOneToOne: false
      referencedRelation: "yearbook_pages"
      referencedColumns: ["id"]
    }
                  ]
                },"email_log": {
                  Row: {
                    "attendee_id": string | null,"body_text": string | null,"created_at": string,"id": string,"provider_id": string | null,"subject": string,"template": string,"to_email": string,"transport": string
                  }
                  Insert: {
                    "attendee_id"?: string | null,"body_text"?: string | null,"created_at"?: string,"id"?: string,"provider_id"?: string | null,"subject": string,"template": string,"to_email": string,"transport": string
                  }
                  Update: {
                    "attendee_id"?: string | null,"body_text"?: string | null,"created_at"?: string,"id"?: string,"provider_id"?: string | null,"subject"?: string,"template"?: string,"to_email"?: string,"transport"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "email_log_attendee_id_fkey"
      columns: ["attendee_id"]
isOneToOne: false
      referencedRelation: "attendees"
      referencedColumns: ["id"]
    }
                  ]
                },"event_items": {
                  Row: {
                    "address": string | null,"address_confirmed": boolean,"allows_guests": boolean,"capacity": number | null,"choice_group": string | null,"confirmed": boolean,"created_at": string,"day": string,"description_md": string,"ends_at": string | null,"halftime_eligible": boolean,"id": string,"location_name": string | null,"price_cents": number | null,"requires_payment": boolean,"slug": string,"sort": number,"starts_at": string | null,"title": string,"unconfirmed_note": string | null,"updated_at": string,"visible": boolean
                  }
                  Insert: {
                    "address"?: string | null,"address_confirmed"?: boolean,"allows_guests"?: boolean,"capacity"?: number | null,"choice_group"?: string | null,"confirmed"?: boolean,"created_at"?: string,"day": string,"description_md"?: string,"ends_at"?: string | null,"halftime_eligible"?: boolean,"id"?: string,"location_name"?: string | null,"price_cents"?: number | null,"requires_payment"?: boolean,"slug": string,"sort"?: number,"starts_at"?: string | null,"title": string,"unconfirmed_note"?: string | null,"updated_at"?: string,"visible"?: boolean
                  }
                  Update: {
                    "address"?: string | null,"address_confirmed"?: boolean,"allows_guests"?: boolean,"capacity"?: number | null,"choice_group"?: string | null,"confirmed"?: boolean,"created_at"?: string,"day"?: string,"description_md"?: string,"ends_at"?: string | null,"halftime_eligible"?: boolean,"id"?: string,"location_name"?: string | null,"price_cents"?: number | null,"requires_payment"?: boolean,"slug"?: string,"sort"?: number,"starts_at"?: string | null,"title"?: string,"unconfirmed_note"?: string | null,"updated_at"?: string,"visible"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"guests": {
                  Row: {
                    "first_name": string,"id": string,"last_name": string,"registration_id": string
                  }
                  Insert: {
                    "first_name": string,"id"?: string,"last_name": string,"registration_id": string
                  }
                  Update: {
                    "first_name"?: string,"id"?: string,"last_name"?: string,"registration_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "guests_registration_id_fkey"
      columns: ["registration_id"]
isOneToOne: false
      referencedRelation: "registrations"
      referencedColumns: ["id"]
    }
                  ]
                },"lodging": {
                  Row: {
                    "address": string,"booking_url": string | null,"created_at": string,"cutoff_date": string | null,"drive_times_md": string | null,"group_code": string | null,"id": string,"is_official_block": boolean,"name": string,"notes_md": string | null,"phone": string | null,"photo_path": string | null,"rate_text": string | null,"sort": number,"updated_at": string,"visible": boolean
                  }
                  Insert: {
                    "address": string,"booking_url"?: string | null,"created_at"?: string,"cutoff_date"?: string | null,"drive_times_md"?: string | null,"group_code"?: string | null,"id"?: string,"is_official_block"?: boolean,"name": string,"notes_md"?: string | null,"phone"?: string | null,"photo_path"?: string | null,"rate_text"?: string | null,"sort"?: number,"updated_at"?: string,"visible"?: boolean
                  }
                  Update: {
                    "address"?: string,"booking_url"?: string | null,"created_at"?: string,"cutoff_date"?: string | null,"drive_times_md"?: string | null,"group_code"?: string | null,"id"?: string,"is_official_block"?: boolean,"name"?: string,"notes_md"?: string | null,"phone"?: string | null,"photo_path"?: string | null,"rate_text"?: string | null,"sort"?: number,"updated_at"?: string,"visible"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"memoriam": {
                  Row: {
                    "grad_school": Database["public"]['Enums']["grad_school"],"id": string,"name": string,"note": string | null,"photo_path": string | null,"sort": number
                  }
                  Insert: {
                    "grad_school": Database["public"]['Enums']["grad_school"],"id"?: string,"name": string,"note"?: string | null,"photo_path"?: string | null,"sort"?: number
                  }
                  Update: {
                    "grad_school"?: Database["public"]['Enums']["grad_school"],"id"?: string,"name"?: string,"note"?: string | null,"photo_path"?: string | null,"sort"?: number
                  }
                  Relationships: [
                    
                  ]
                },"payments": {
                  Row: {
                    "amount_cents": number,"attendee_id": string | null,"created_at": string,"fee_cents": number,"id": string,"line_items": NonNullable<Json>,"status": Database["public"]['Enums']["payment_status"],"stripe_payment_intent_id": string | null,"stripe_session_id": string | null,"updated_at": string
                  }
                  Insert: {
                    "amount_cents": number,"attendee_id"?: string | null,"created_at"?: string,"fee_cents"?: number,"id"?: string,"line_items"?: NonNullable<Json>,"status"?: Database["public"]['Enums']["payment_status"],"stripe_payment_intent_id"?: string | null,"stripe_session_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "amount_cents"?: number,"attendee_id"?: string | null,"created_at"?: string,"fee_cents"?: number,"id"?: string,"line_items"?: NonNullable<Json>,"status"?: Database["public"]['Enums']["payment_status"],"stripe_payment_intent_id"?: string | null,"stripe_session_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_attendee_id_fkey"
      columns: ["attendee_id"]
isOneToOne: false
      referencedRelation: "attendees"
      referencedColumns: ["id"]
    }
                  ]
                },"rate_limits": {
                  Row: {
                    "count": number,"key": string,"window_start": string
                  }
                  Insert: {
                    "count": number,"key": string,"window_start": string
                  }
                  Update: {
                    "count"?: number,"key"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"refund_flags": {
                  Row: {
                    "attendee_id": string | null,"created_at": string,"id": string,"reason": string,"registration_id": string | null,"resolved": boolean
                  }
                  Insert: {
                    "attendee_id"?: string | null,"created_at"?: string,"id"?: string,"reason": string,"registration_id"?: string | null,"resolved"?: boolean
                  }
                  Update: {
                    "attendee_id"?: string | null,"created_at"?: string,"id"?: string,"reason"?: string,"registration_id"?: string | null,"resolved"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "refund_flags_attendee_id_fkey"
      columns: ["attendee_id"]
isOneToOne: false
      referencedRelation: "attendees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "refund_flags_registration_id_fkey"
      columns: ["registration_id"]
isOneToOne: false
      referencedRelation: "registrations"
      referencedColumns: ["id"]
    }
                  ]
                },"registrations": {
                  Row: {
                    "attendee_id": string,"created_at": string,"event_item_id": string,"guest_count": number,"halftime_walk": boolean,"id": string,"status": Database["public"]['Enums']["registration_status"],"updated_at": string
                  }
                  Insert: {
                    "attendee_id": string,"created_at"?: string,"event_item_id": string,"guest_count"?: number,"halftime_walk"?: boolean,"id"?: string,"status": Database["public"]['Enums']["registration_status"],"updated_at"?: string
                  }
                  Update: {
                    "attendee_id"?: string,"created_at"?: string,"event_item_id"?: string,"guest_count"?: number,"halftime_walk"?: boolean,"id"?: string,"status"?: Database["public"]['Enums']["registration_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "registrations_attendee_id_fkey"
      columns: ["attendee_id"]
isOneToOne: false
      referencedRelation: "attendees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "registrations_event_item_id_fkey"
      columns: ["event_item_id"]
isOneToOne: false
      referencedRelation: "event_items"
      referencedColumns: ["id"]
    }
                  ]
                },"settings": {
                  Row: {
                    "is_public": boolean,"key": string,"updated_at": string,"value": NonNullable<Json>
                  }
                  Insert: {
                    "is_public"?: boolean,"key": string,"updated_at"?: string,"value": NonNullable<Json>
                  }
                  Update: {
                    "is_public"?: boolean,"key"?: string,"updated_at"?: string,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"yearbook_books": {
                  Row: {
                    "school": Database["public"]['Enums']["yearbook_school"],"seniors_end_seq": number | null,"seniors_start_seq": number | null,"title": string
                  }
                  Insert: {
                    "school": Database["public"]['Enums']["yearbook_school"],"seniors_end_seq"?: number | null,"seniors_start_seq"?: number | null,"title": string
                  }
                  Update: {
                    "school"?: Database["public"]['Enums']["yearbook_school"],"seniors_end_seq"?: number | null,"seniors_start_seq"?: number | null,"title"?: string
                  }
                  Relationships: [
                    
                  ]
                },"yearbook_pages": {
                  Row: {
                    "display_jpg_url": string,"display_url": string,"height": number,"hidden": boolean,"id": string,"ocr_text": string | null,"ocr_tsv": unknown,"page_label": string | null,"school": Database["public"]['Enums']["yearbook_school"],"seq": number,"thumb_url": string,"width": number,"zoom_url": string
                  }
                  Insert: {
                    "display_jpg_url": string,"display_url": string,"height": number,"hidden"?: boolean,"id"?: string,"ocr_text"?: string | null,"ocr_tsv"?: never,"page_label"?: string | null,"school": Database["public"]['Enums']["yearbook_school"],"seq": number,"thumb_url": string,"width": number,"zoom_url": string
                  }
                  Update: {
                    "display_jpg_url"?: string,"display_url"?: string,"height"?: number,"hidden"?: boolean,"id"?: string,"ocr_text"?: string | null,"ocr_tsv"?: never,"page_label"?: string | null,"school"?: Database["public"]['Enums']["yearbook_school"],"seq"?: number,"thumb_url"?: string,"width"?: number,"zoom_url"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "yearbook_pages_school_fkey"
      columns: ["school"]
isOneToOne: false
      referencedRelation: "yearbook_books"
      referencedColumns: ["school"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "event_availability":
{ Args: Record<PropertyKey, never>; Returns: {
              "capacity": number,"slug": string,"taken": number
            }[]
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"keepalive":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"rate_limit_hit":
{ Args: { "p_key": string,"p_max": number,"p_window_seconds": number }; Returns: boolean
                           },
"rsvp_apply_selections":
{ Args: { "p_attendee_id": string,"p_selections": Json }; Returns: undefined
                           },
"rsvp_create":
{ Args: { "p": Json,"p_token_hash": string }; Returns: Json
                           },
"rsvp_delete":
{ Args: { "p_token_hash": string }; Returns: Json
                           },
"rsvp_rotate_token":
{ Args: { "p_email": string,"p_new_hash": string }; Returns: Json
                           },
"rsvp_update":
{ Args: { "p": Json,"p_token_hash": string }; Returns: Json
                           }
          }
          Enums: {
            "attendee_status": "active"|"cancelled","grad_school": "crown"|"jacobs"|"other","payment_status": "pending"|"paid"|"expired"|"refunded"|"offline","registration_status": "confirmed"|"pending_payment"|"pending_offline"|"waitlist"|"cancelled","yearbook_school": "crown"|"jacobs"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "attendee_status": ["active", "cancelled"],"grad_school": ["crown", "jacobs", "other"],"payment_status": ["pending", "paid", "expired", "refunded", "offline"],"registration_status": ["confirmed", "pending_payment", "pending_offline", "waitlist", "cancelled"],"yearbook_school": ["crown", "jacobs"]
          }
        }
} as const

