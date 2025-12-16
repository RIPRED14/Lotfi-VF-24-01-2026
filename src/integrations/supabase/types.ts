export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      batch_numbers: {
        Row: {
          created_at: string
          id: string
          petri_dishes: string | null
          report_id: string
          vrbg_gel: string | null
          water_peptone: string | null
          ygc_gel: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          petri_dishes?: string | null
          report_id: string
          vrbg_gel?: string | null
          water_peptone?: string | null
          ygc_gel?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          petri_dishes?: string | null
          report_id?: string
          vrbg_gel?: string | null
          water_peptone?: string | null
          ygc_gel?: string | null
        }
        Relationships: []
      }
      change_history: {
        Row: {
          action: string
          field: string | null
          id: string
          new_value: string | null
          old_value: string | null
          role: string
          sample_id: string | null
          timestamp: string
          user_name: string
        }
        Insert: {
          action: string
          field?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          role: string
          sample_id?: string | null
          timestamp?: string
          user_name: string
        }
        Update: {
          action?: string
          field?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          role?: string
          sample_id?: string | null
          timestamp?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_history_sample_id_fkey"
            columns: ["sample_id"]
            isOneToOne: false
            referencedRelation: "samples"
            referencedColumns: ["id"]
          },
        ]
      }
      form_bacteria_selections: {
        Row: {
          bacteria_delay: string
          bacteria_name: string
          created_at: string
          form_id: string
          id: string
          modified_at: string
          reading_date: string | null
          reading_day: string
          status: string
        }
        Insert: {
          bacteria_delay: string
          bacteria_name: string
          created_at?: string
          form_id: string
          id?: string
          modified_at?: string
          reading_date?: string | null
          reading_day: string
          status?: string
        }
        Update: {
          bacteria_delay?: string
          bacteria_name?: string
          created_at?: string
          form_id?: string
          id?: string
          modified_at?: string
          reading_date?: string | null
          reading_day?: string
          status?: string
        }
        Relationships: []
      }
      form_samples: {
        Row: {
          additional_details: string | null
          analysis_date: string | null
          break_date: string | null
          created_at: string
          id: string
          lab_comment: string | null
          label: string | null
          nature: string | null
          program: string | null
          report_id: string
          storage_temp: string | null
          temperature: string | null
        }
        Insert: {
          additional_details?: string | null
          analysis_date?: string | null
          break_date?: string | null
          created_at?: string
          id?: string
          lab_comment?: string | null
          label?: string | null
          nature?: string | null
          program?: string | null
          report_id: string
          storage_temp?: string | null
          temperature?: string | null
        }
        Update: {
          additional_details?: string | null
          analysis_date?: string | null
          break_date?: string | null
          created_at?: string
          id?: string
          lab_comment?: string | null
          label?: string | null
          nature?: string | null
          program?: string | null
          report_id?: string
          storage_temp?: string | null
          temperature?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          sample_id: string | null
          sample_number: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          sample_id?: string | null
          sample_number: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          sample_id?: string | null
          sample_number?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_sample_id_fkey"
            columns: ["sample_id"]
            isOneToOne: false
            referencedRelation: "samples"
            referencedColumns: ["id"]
          },
        ]
      }
      sample_forms: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          reference: string | null
          report_id: string
          sample_date: string
          site: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          reference?: string | null
          report_id: string
          sample_date: string
          site: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          reference?: string | null
          report_id?: string
          sample_date?: string
          site?: string
        }
        Relationships: []
      }
      produits: {
        Row: {
          id: string
          site_id: string
          nom: string
          type_produit: string
          description: string | null
          actif: boolean
          ph_seuil: string | null
          ph_unite: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          site_id: string
          nom: string
          type_produit: string
          description?: string | null
          actif?: boolean
          ph_seuil?: string | null
          ph_unite?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          site_id?: string
          nom?: string
          type_produit?: string
          description?: string | null
          actif?: boolean
          ph_seuil?: string | null
          ph_unite?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produits_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      bacteries_types: {
        Row: {
          id: string
          nom: string
          nom_technique: string | null
          description: string | null
          unite: string | null
          actif: boolean
          created_at: string
        }
        Insert: {
          id?: string
          nom: string
          nom_technique?: string | null
          description?: string | null
          unite?: string | null
          actif?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          nom?: string
          nom_technique?: string | null
          description?: string | null
          unite?: string | null
          actif?: boolean
          created_at?: string
        }
        Relationships: []
      }
      produit_bacteries: {
        Row: {
          id: string
          produit_id: string
          bacterie_id: string
          seuil: string
          actif: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          produit_id: string
          bacterie_id: string
          seuil: string
          actif?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          produit_id?: string
          bacterie_id?: string
          seuil?: string
          actif?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produit_bacteries_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "produits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produit_bacteries_bacterie_id_fkey"
            columns: ["bacterie_id"]
            isOneToOne: false
            referencedRelation: "bacteries_types"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          id: string
          nom: string
          adresse: string | null
          responsable: string | null
          actif: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nom: string
          adresse?: string | null
          responsable?: string | null
          actif?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nom?: string
          adresse?: string | null
          responsable?: string | null
          actif?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          table_name: string
          record_id: string
          action: string
          old_values: Json | null
          new_values: Json | null
          user_id: string | null
          ip_address: string | null
          user_agent: string | null
          session_id: string | null
          timestamp: string
          change_reason: string | null
          change_category: string | null
          impact_level: string | null
        }
        Insert: {
          id?: string
          table_name: string
          record_id: string
          action: string
          old_values?: Json | null
          new_values?: Json | null
          user_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          session_id?: string | null
          timestamp?: string
          change_reason?: string | null
          change_category?: string | null
          impact_level?: string | null
        }
        Update: {
          id?: string
          table_name?: string
          record_id?: string
          action?: string
          old_values?: Json | null
          new_values?: Json | null
          user_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          session_id?: string | null
          timestamp?: string
          change_reason?: string | null
          change_category?: string | null
          impact_level?: string | null
        }
        Relationships: []
      }
      samples: {
        Row: {
          acidity: string | null
          aspect: string
          assigned_to: string | null
          brand: string | null
          created_at: string
          dlc: string
          enterobacteria: string | null
          enterobacteria_count: number | null
          yeast_mold_count: number | null
          listeria_count: number | null
          coliforms_count: number | null
          staphylococcus_count: number | null
          escherichia_coli_count: number | null
          total_flora_count: number | null
          leuconostoc_count: number | null
          yeast_mold_3j_count: number | null
          yeast_mold_5j_count: number | null
          salmonella_count: number | null
          campylobacter_count: number | null
          clostridium_count: number | null
          bacillus_count: number | null
          pseudomonas_count: number | null
          lactobacillus_count: number | null
          streptococcus_count: number | null
          enterococcus_count: number | null
          vibrio_count: number | null
          shigella_count: number | null
          reading_comments: string | null
          reading_technician: string | null
          reading_date: string | null
          fabrication: string
          form_id: string | null
          id: string
          lab_comment: string | null
          modified_at: string
          modified_by: string | null
          notification_sent: boolean | null
          number: string
          of_count: number | null
          of_value: string | null
          parfum: string | null
          ph: string | null
          product: string
          ready_time: string
          report_title: string | null
          resultat: string | null
          site: string | null
          smell: string
          status: string
          taste: string
          texture: string
          yeast_mold: string | null
        }
        Insert: {
          acidity?: string | null
          aspect?: string
          assigned_to?: string | null
          brand?: string | null
          created_at?: string
          dlc: string
          enterobacteria?: string | null
          enterobacteria_count?: number | null
          yeast_mold_count?: number | null
          listeria_count?: number | null
          coliforms_count?: number | null
          staphylococcus_count?: number | null
          escherichia_coli_count?: number | null
          total_flora_count?: number | null
          leuconostoc_count?: number | null
          yeast_mold_3j_count?: number | null
          yeast_mold_5j_count?: number | null
          salmonella_count?: number | null
          campylobacter_count?: number | null
          clostridium_count?: number | null
          bacillus_count?: number | null
          pseudomonas_count?: number | null
          lactobacillus_count?: number | null
          streptococcus_count?: number | null
          enterococcus_count?: number | null
          vibrio_count?: number | null
          shigella_count?: number | null
          reading_comments?: string | null
          reading_technician?: string | null
          reading_date?: string | null
          fabrication: string
          form_id?: string | null
          id?: string
          lab_comment?: string | null
          modified_at?: string
          modified_by?: string | null
          notification_sent?: boolean | null
          number: string
          of_count?: number | null
          of_value?: string | null
          parfum?: string | null
          ph?: string | null
          product: string
          ready_time: string
          report_title?: string | null
          resultat?: string | null
          site?: string | null
          smell?: string
          status?: string
          taste?: string
          texture?: string
          yeast_mold?: string | null
        }
        Update: {
          acidity?: string | null
          aspect?: string
          assigned_to?: string | null
          brand?: string | null
          created_at?: string
          dlc?: string
          enterobacteria?: string | null
          enterobacteria_count?: number | null
          yeast_mold_count?: number | null
          listeria_count?: number | null
          coliforms_count?: number | null
          staphylococcus_count?: number | null
          escherichia_coli_count?: number | null
          total_flora_count?: number | null
          leuconostoc_count?: number | null
          yeast_mold_3j_count?: number | null
          yeast_mold_5j_count?: number | null
          salmonella_count?: number | null
          campylobacter_count?: number | null
          clostridium_count?: number | null
          bacillus_count?: number | null
          pseudomonas_count?: number | null
          lactobacillus_count?: number | null
          streptococcus_count?: number | null
          enterococcus_count?: number | null
          vibrio_count?: number | null
          shigella_count?: number | null
          reading_comments?: string | null
          reading_technician?: string | null
          reading_date?: string | null
          fabrication?: string
          form_id?: string | null
          id?: string
          lab_comment?: string | null
          modified_at?: string
          modified_by?: string | null
          notification_sent?: boolean | null
          number?: string
          of_count?: number | null
          of_value?: string | null
          parfum?: string | null
          ph?: string | null
          product?: string
          ready_time?: string
          report_title?: string | null
          resultat?: string | null
          site?: string | null
          smell?: string
          status?: string
          taste?: string
          texture?: string
          yeast_mold?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
