
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
            "ai_feedback": {
                  Row: {
                    "comment": string | null,"created_at": string,"id": string,"message_id": string,"organization_id": string,"rating": number
                  }
                  ComputedFields: never
                  Insert: {
                    "comment"?: string | null,"created_at"?: string,"id"?: string,"message_id": string,"organization_id": string,"rating": number
                  }
                  Update: {
                    "comment"?: string | null,"created_at"?: string,"id"?: string,"message_id"?: string,"organization_id"?: string,"rating"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_feedback_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ai_feedback_organization_id_message_id_fkey"
      columns: ["organization_id","message_id"]
isOneToOne: false
      referencedRelation: "messages"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"conversations": {
                  Row: {
                    "assigned_to": string | null,"created_at": string,"customer_id": string,"id": string,"organization_id": string,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_to"?: string | null,"created_at"?: string,"customer_id": string,"id"?: string,"organization_id": string,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "assigned_to"?: string | null,"created_at"?: string,"customer_id"?: string,"id"?: string,"organization_id"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversations_organization_id_customer_id_fkey"
      columns: ["organization_id","customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "conversations_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"customers": {
                  Row: {
                    "created_at": string,"email": string | null,"external_id": string | null,"id": string,"name": string | null,"organization_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"external_id"?: string | null,"id"?: string,"name"?: string | null,"organization_id": string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"external_id"?: string | null,"id"?: string,"name"?: string | null,"organization_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "customers_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"knowledge_chunks": {
                  Row: {
                    "content": string,"created_at": string,"embedding": string | null,"id": string,"metadata": NonNullable<Json>,"organization_id": string,"source_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content": string,"created_at"?: string,"embedding"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"organization_id": string,"source_id": string
                  }
                  Update: {
                    "content"?: string,"created_at"?: string,"embedding"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"organization_id"?: string,"source_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "knowledge_chunks_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "knowledge_chunks_organization_id_source_id_fkey"
      columns: ["organization_id","source_id"]
isOneToOne: false
      referencedRelation: "knowledge_sources"
      referencedColumns: ["organization_id","id"]
    }
                  ]
                },"knowledge_sources": {
                  Row: {
                    "created_at": string,"created_by": string,"id": string,"name": string,"organization_id": string,"source_type": string,"status": string,"storage_path": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by": string,"id"?: string,"name": string,"organization_id": string,"source_type": string,"status"?: string,"storage_path"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"id"?: string,"name"?: string,"organization_id"?: string,"source_type"?: string,"status"?: string,"storage_path"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "knowledge_sources_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"messages": {
                  Row: {
                    "content": string,"conversation_id": string,"created_at": string,"id": string,"organization_id": string,"sender_type": string,"source_references": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "content": string,"conversation_id": string,"created_at"?: string,"id"?: string,"organization_id": string,"sender_type": string,"source_references"?: NonNullable<Json>
                  }
                  Update: {
                    "content"?: string,"conversation_id"?: string,"created_at"?: string,"id"?: string,"organization_id"?: string,"sender_type"?: string,"source_references"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_organization_id_conversation_id_fkey"
      columns: ["organization_id","conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "messages_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"organization_members": {
                  Row: {
                    "created_at": string,"organization_id": string,"role": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"organization_id": string,"role": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"organization_id"?: string,"role"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "organization_members_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"organizations": {
                  Row: {
                    "created_at": string,"created_by": string,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by": string,"id"?: string,"name": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"tickets": {
                  Row: {
                    "category": string,"conversation_id": string,"created_at": string,"id": string,"organization_id": string,"priority": string,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category": string,"conversation_id": string,"created_at"?: string,"id"?: string,"organization_id": string,"priority"?: string,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "category"?: string,"conversation_id"?: string,"created_at"?: string,"id"?: string,"organization_id"?: string,"priority"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tickets_organization_id_conversation_id_fkey"
      columns: ["organization_id","conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["organization_id","id"]
    },{
      foreignKeyName: "tickets_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"workflow_events": {
                  Row: {
                    "created_at": string,"event_type": string,"id": string,"idempotency_key": string,"last_error": string | null,"organization_id": string,"payload": NonNullable<Json>,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"event_type": string,"id"?: string,"idempotency_key": string,"last_error"?: string | null,"organization_id": string,"payload"?: NonNullable<Json>,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"event_type"?: string,"id"?: string,"idempotency_key"?: string,"last_error"?: string | null,"organization_id"?: string,"payload"?: NonNullable<Json>,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workflow_events_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "create_knowledge_source":
{ Args: { "source_content": string,"source_name": string,"source_type": string,"target_organization_id": string }; Returns: {
              "source_id": string
            }[]
                           },
            "create_organization":
{ Args: { "organization_name": string }; Returns: {
              "created_at": string,"id": string,"name": string
            }[]
                           },
"create_public_conversation":
{ Args: { "customer_email": string,"customer_name": string,"first_message": string,"target_organization_id": string }; Returns: {
              "conversation_id": string
            }[]
                           },
"create_test_conversation":
{ Args: { "customer_email": string,"customer_name": string,"first_message": string,"target_organization_id": string }; Returns: {
              "conversation_id": string
            }[]
                           },
"is_organization_admin":
{ Args: { "target_organization_id": string }; Returns: boolean
                           },
"is_organization_creator":
{ Args: { "target_organization_id": string }; Returns: boolean
                           },
"is_organization_member":
{ Args: { "target_organization_id": string }; Returns: boolean
                           },
"is_organization_owner":
{ Args: { "target_organization_id": string }; Returns: boolean
                           }
          }
          Enums: {
            [_ in never]: never
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
            
          }
        }
} as const
