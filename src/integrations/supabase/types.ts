export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assessment_responses: {
        Row: {
          analysis: Json | null
          assessment_id: string | null
          candidate_id: string
          company_id: string
          created_at: string
          id: string
          payload: Json
          score: number | null
        }
        Insert: {
          analysis?: Json | null
          assessment_id?: string | null
          candidate_id: string
          company_id: string
          created_at?: string
          id?: string
          payload?: Json
          score?: number | null
        }
        Update: {
          analysis?: Json | null
          assessment_id?: string | null
          candidate_id?: string
          company_id?: string
          created_at?: string
          id?: string
          payload?: Json
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_responses_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_responses_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_responses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          company_id: string
          created_at: string
          generated_by: string
          id: string
          job_id: string
          payload: Json
          title: string
        }
        Insert: {
          company_id: string
          created_at?: string
          generated_by?: string
          id?: string
          job_id: string
          payload?: Json
          title?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          generated_by?: string
          id?: string
          job_id?: string
          payload?: Json
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_analyses: {
        Row: {
          candidate_id: string
          company_id: string
          compatibility: number | null
          conclusive: boolean
          confidence: number
          created_at: string
          generated_by: string
          id: string
          job_id: string
          payload: Json
        }
        Insert: {
          candidate_id: string
          company_id: string
          compatibility?: number | null
          conclusive?: boolean
          confidence?: number
          created_at?: string
          generated_by?: string
          id?: string
          job_id: string
          payload?: Json
        }
        Update: {
          candidate_id?: string
          company_id?: string
          compatibility?: number | null
          conclusive?: boolean
          confidence?: number
          created_at?: string
          generated_by?: string
          id?: string
          job_id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "candidate_analyses_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_analyses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_analyses_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_answers: {
        Row: {
          answer: string | null
          candidate_id: string
          company_id: string
          created_at: string
          id: string
          is_disqualifying: boolean
          question_id: string | null
          question_text: string | null
        }
        Insert: {
          answer?: string | null
          candidate_id: string
          company_id: string
          created_at?: string
          id?: string
          is_disqualifying?: boolean
          question_id?: string | null
          question_text?: string | null
        }
        Update: {
          answer?: string | null
          candidate_id?: string
          company_id?: string
          created_at?: string
          id?: string
          is_disqualifying?: boolean
          question_id?: string | null
          question_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_answers_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_answers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "job_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_events: {
        Row: {
          candidate_id: string
          company_id: string
          created_at: string
          detail: string | null
          id: string
          metadata: Json | null
          title: string
          type: string
        }
        Insert: {
          candidate_id: string
          company_id: string
          created_at?: string
          detail?: string | null
          id?: string
          metadata?: Json | null
          title: string
          type: string
        }
        Update: {
          candidate_id?: string
          company_id?: string
          created_at?: string
          detail?: string | null
          id?: string
          metadata?: Json | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_events_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          access_token: string
          applied_at: string
          city: string | null
          company_id: string
          current_company: string | null
          current_position: string | null
          current_tenure: string | null
          email: string | null
          employed_now: boolean | null
          id: string
          job_id: string
          linkedin: string | null
          name: string
          overall_score: number | null
          phone: string | null
          resume_text: string | null
          resume_url: string | null
          salary_expectation: string | null
          stage_id: string | null
          state: string | null
          status: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          access_token?: string
          applied_at?: string
          city?: string | null
          company_id: string
          current_company?: string | null
          current_position?: string | null
          current_tenure?: string | null
          email?: string | null
          employed_now?: boolean | null
          id?: string
          job_id: string
          linkedin?: string | null
          name: string
          overall_score?: number | null
          phone?: string | null
          resume_text?: string | null
          resume_url?: string | null
          salary_expectation?: string | null
          stage_id?: string | null
          state?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          access_token?: string
          applied_at?: string
          city?: string | null
          company_id?: string
          current_company?: string | null
          current_position?: string | null
          current_tenure?: string | null
          email?: string | null
          employed_now?: boolean | null
          id?: string
          job_id?: string
          linkedin?: string | null
          name?: string
          overall_score?: number | null
          phone?: string | null
          resume_text?: string | null
          resume_url?: string | null
          salary_expectation?: string | null
          stage_id?: string | null
          state?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "job_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      case_assignments: {
        Row: {
          candidate_id: string
          case_id: string
          company_id: string
          created_at: string
          delivered_at: string | null
          due_at: string | null
          evaluated_at: string | null
          id: string
          job_id: string
          presented_at: string | null
          ready_at: string | null
          scheduled_at: string | null
          sent_at: string
          status: string
        }
        Insert: {
          candidate_id: string
          case_id: string
          company_id: string
          created_at?: string
          delivered_at?: string | null
          due_at?: string | null
          evaluated_at?: string | null
          id?: string
          job_id: string
          presented_at?: string | null
          ready_at?: string | null
          scheduled_at?: string | null
          sent_at?: string
          status?: string
        }
        Update: {
          candidate_id?: string
          case_id?: string
          company_id?: string
          created_at?: string
          delivered_at?: string | null
          due_at?: string | null
          evaluated_at?: string | null
          id?: string
          job_id?: string
          presented_at?: string | null
          ready_at?: string | null
          scheduled_at?: string | null
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_assignments_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_assignments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "job_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_assignments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      case_deliveries: {
        Row: {
          assignment_id: string
          candidate_id: string
          company_id: string
          created_at: string
          file_path: string | null
          id: string
          kind: string
          notes: string | null
          url: string | null
        }
        Insert: {
          assignment_id: string
          candidate_id: string
          company_id: string
          created_at?: string
          file_path?: string | null
          id?: string
          kind?: string
          notes?: string | null
          url?: string | null
        }
        Update: {
          assignment_id?: string
          candidate_id?: string
          company_id?: string
          created_at?: string
          file_path?: string | null
          id?: string
          kind?: string
          notes?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_deliveries_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "case_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_deliveries_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_deliveries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      case_evaluations: {
        Row: {
          assignment_id: string | null
          attention_points: string | null
          candidate_id: string
          case_id: string
          company_id: string
          created_at: string
          evaluator: string | null
          id: string
          next_step: string | null
          notes: string | null
          questions_asked: string | null
          scores: Json
          strengths: string | null
        }
        Insert: {
          assignment_id?: string | null
          attention_points?: string | null
          candidate_id: string
          case_id: string
          company_id: string
          created_at?: string
          evaluator?: string | null
          id?: string
          next_step?: string | null
          notes?: string | null
          questions_asked?: string | null
          scores?: Json
          strengths?: string | null
        }
        Update: {
          assignment_id?: string | null
          attention_points?: string | null
          candidate_id?: string
          case_id?: string
          company_id?: string
          created_at?: string
          evaluator?: string | null
          id?: string
          next_step?: string | null
          notes?: string | null
          questions_asked?: string | null
          scores?: Json
          strengths?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_evaluations_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "case_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_evaluations_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_evaluations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "job_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_evaluations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      case_submissions: {
        Row: {
          candidate_id: string
          company_id: string
          created_at: string
          delivered_at: string | null
          evaluation: Json | null
          file_path: string | null
          id: string
          job_case_id: string | null
          link: string | null
          notes: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          candidate_id: string
          company_id: string
          created_at?: string
          delivered_at?: string | null
          evaluation?: Json | null
          file_path?: string | null
          id?: string
          job_case_id?: string | null
          link?: string | null
          notes?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          candidate_id?: string
          company_id?: string
          created_at?: string
          delivered_at?: string | null
          evaluation?: Json | null
          file_path?: string | null
          id?: string
          job_case_id?: string | null
          link?: string | null
          notes?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_submissions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_submissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_submissions_job_case_id_fkey"
            columns: ["job_case_id"]
            isOneToOne: false
            referencedRelation: "job_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          city: string | null
          created_at: string
          description: string | null
          expectations: string | null
          headcount: string | null
          id: string
          is_demo: boolean
          logo_url: string | null
          misaligned_behaviors: string | null
          mission: string | null
          name: string
          notes: string | null
          segment: string | null
          state: string | null
          updated_at: string
          valued_behaviors: string | null
          values_text: string | null
          vision: string | null
          website: string | null
          working_here: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          description?: string | null
          expectations?: string | null
          headcount?: string | null
          id?: string
          is_demo?: boolean
          logo_url?: string | null
          misaligned_behaviors?: string | null
          mission?: string | null
          name: string
          notes?: string | null
          segment?: string | null
          state?: string | null
          updated_at?: string
          valued_behaviors?: string | null
          values_text?: string | null
          vision?: string | null
          website?: string | null
          working_here?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          description?: string | null
          expectations?: string | null
          headcount?: string | null
          id?: string
          is_demo?: boolean
          logo_url?: string | null
          misaligned_behaviors?: string | null
          mission?: string | null
          name?: string
          notes?: string | null
          segment?: string | null
          state?: string | null
          updated_at?: string
          valued_behaviors?: string | null
          values_text?: string | null
          vision?: string | null
          website?: string | null
          working_here?: string | null
        }
        Relationships: []
      }
      company_documents: {
        Row: {
          company_id: string
          content_text: string | null
          created_at: string
          file_path: string | null
          id: string
          kind: string | null
          name: string
        }
        Insert: {
          company_id: string
          content_text?: string | null
          created_at?: string
          file_path?: string | null
          id?: string
          kind?: string | null
          name: string
        }
        Update: {
          company_id?: string
          content_text?: string | null
          created_at?: string
          file_path?: string | null
          id?: string
          kind?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          candidate_id: string
          company_id: string
          competency: string | null
          created_at: string
          id: string
          notes: string | null
          score: number | null
          source: string
          stage_id: string | null
        }
        Insert: {
          candidate_id: string
          company_id: string
          competency?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          score?: number | null
          source?: string
          stage_id?: string | null
        }
        Update: {
          candidate_id?: string
          company_id?: string
          competency?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          score?: number | null
          source?: string
          stage_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "job_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      hires: {
        Row: {
          agreed_salary: string | null
          candidate_id: string
          company_id: string
          contract_model: string | null
          created_at: string
          hired_at: string
          id: string
          notes: string | null
          role_title: string | null
          start_date: string | null
        }
        Insert: {
          agreed_salary?: string | null
          candidate_id: string
          company_id: string
          contract_model?: string | null
          created_at?: string
          hired_at?: string
          id?: string
          notes?: string | null
          role_title?: string | null
          start_date?: string | null
        }
        Update: {
          agreed_salary?: string | null
          candidate_id?: string
          company_id?: string
          contract_model?: string | null
          created_at?: string
          hired_at?: string
          id?: string
          notes?: string | null
          role_title?: string | null
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hires_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hires_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_script_questions: {
        Row: {
          category: string
          company_id: string
          id: string
          looking_for: string | null
          position: number
          question: string
          script_id: string
        }
        Insert: {
          category?: string
          company_id: string
          id?: string
          looking_for?: string | null
          position?: number
          question: string
          script_id: string
        }
        Update: {
          category?: string
          company_id?: string
          id?: string
          looking_for?: string | null
          position?: number
          question?: string
          script_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_script_questions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_script_questions_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "interview_scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_scripts: {
        Row: {
          candidate_id: string | null
          company_id: string
          created_at: string
          generated_by: string
          id: string
          job_id: string
          title: string
        }
        Insert: {
          candidate_id?: string | null
          company_id: string
          created_at?: string
          generated_by?: string
          id?: string
          job_id: string
          title?: string
        }
        Update: {
          candidate_id?: string | null
          company_id?: string
          created_at?: string
          generated_by?: string
          id?: string
          job_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_scripts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_scripts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          ai_analysis: Json | null
          analysis_history: Json
          analyzed_at: string | null
          answers: Json | null
          attention_points: string | null
          candidate_id: string
          company_id: string
          created_at: string
          id: string
          interviewed_at: string | null
          interviewer: string | null
          notes: string | null
          observations: string | null
          positives: string | null
          recommendation: string | null
          recording_link: string | null
          recruiter_observations: string | null
          source_file_name: string | null
          source_file_text: string | null
          stage_id: string | null
          transcript: string | null
        }
        Insert: {
          ai_analysis?: Json | null
          analysis_history?: Json
          analyzed_at?: string | null
          answers?: Json | null
          attention_points?: string | null
          candidate_id: string
          company_id: string
          created_at?: string
          id?: string
          interviewed_at?: string | null
          interviewer?: string | null
          notes?: string | null
          observations?: string | null
          positives?: string | null
          recommendation?: string | null
          recording_link?: string | null
          recruiter_observations?: string | null
          source_file_name?: string | null
          source_file_text?: string | null
          stage_id?: string | null
          transcript?: string | null
        }
        Update: {
          ai_analysis?: Json | null
          analysis_history?: Json
          analyzed_at?: string | null
          answers?: Json | null
          attention_points?: string | null
          candidate_id?: string
          company_id?: string
          created_at?: string
          id?: string
          interviewed_at?: string | null
          interviewer?: string | null
          notes?: string | null
          observations?: string | null
          positives?: string | null
          recommendation?: string | null
          recording_link?: string | null
          recruiter_observations?: string | null
          source_file_name?: string | null
          source_file_text?: string | null
          stage_id?: string | null
          transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interviews_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "job_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      job_cases: {
        Row: {
          agenda_link: string | null
          approved_at: string | null
          approved_by: string | null
          company_id: string
          content: string | null
          created_at: string
          criteria: string | null
          deadline_days: number | null
          deliverables: string[]
          delivery_description: string | null
          delivery_format: string | null
          evaluate_what: string | null
          evaluator_questions: string[]
          generated_by: string
          id: string
          job_id: string
          materials: Json
          meet_link: string | null
          modality: string
          needs_presentation: boolean
          objective: string | null
          prep_deadline: string | null
          presentation_format: string | null
          presentation_minutes: number | null
          public_token: string
          questions_minutes: number | null
          scheduling_mode: string | null
          sections: Json
          send_after: string
          stage_id: string | null
          status: string
          title: string | null
          tool_required: boolean
          tools: string[]
          version: number
        }
        Insert: {
          agenda_link?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          content?: string | null
          created_at?: string
          criteria?: string | null
          deadline_days?: number | null
          deliverables?: string[]
          delivery_description?: string | null
          delivery_format?: string | null
          evaluate_what?: string | null
          evaluator_questions?: string[]
          generated_by?: string
          id?: string
          job_id: string
          materials?: Json
          meet_link?: string | null
          modality?: string
          needs_presentation?: boolean
          objective?: string | null
          prep_deadline?: string | null
          presentation_format?: string | null
          presentation_minutes?: number | null
          public_token?: string
          questions_minutes?: number | null
          scheduling_mode?: string | null
          sections?: Json
          send_after?: string
          stage_id?: string | null
          status?: string
          title?: string | null
          tool_required?: boolean
          tools?: string[]
          version?: number
        }
        Update: {
          agenda_link?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          content?: string | null
          created_at?: string
          criteria?: string | null
          deadline_days?: number | null
          deliverables?: string[]
          delivery_description?: string | null
          delivery_format?: string | null
          evaluate_what?: string | null
          evaluator_questions?: string[]
          generated_by?: string
          id?: string
          job_id?: string
          materials?: Json
          meet_link?: string | null
          modality?: string
          needs_presentation?: boolean
          objective?: string | null
          prep_deadline?: string | null
          presentation_format?: string | null
          presentation_minutes?: number | null
          public_token?: string
          questions_minutes?: number | null
          scheduling_mode?: string | null
          sections?: Json
          send_after?: string
          stage_id?: string | null
          status?: string
          title?: string | null
          tool_required?: boolean
          tools?: string[]
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_cases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_cases_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_cases_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "job_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      job_competencies: {
        Row: {
          company_id: string
          id: string
          importance: string
          job_id: string
          name: string
          position: number
          weight: number | null
        }
        Insert: {
          company_id: string
          id?: string
          importance?: string
          job_id: string
          name: string
          position?: number
          weight?: number | null
        }
        Update: {
          company_id?: string
          id?: string
          importance?: string
          job_id?: string
          name?: string
          position?: number
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_competencies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_competencies_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_documents: {
        Row: {
          company_id: string
          content_text: string | null
          created_at: string
          file_path: string | null
          id: string
          job_id: string
          kind: string | null
          name: string
        }
        Insert: {
          company_id: string
          content_text?: string | null
          created_at?: string
          file_path?: string | null
          id?: string
          job_id: string
          kind?: string | null
          name: string
        }
        Update: {
          company_id?: string
          content_text?: string | null
          created_at?: string
          file_path?: string | null
          id?: string
          job_id?: string
          kind?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_documents_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_questions: {
        Row: {
          answer_type: string
          company_id: string
          disqualifying_answer: string | null
          field_key: string | null
          follow_up: Json | null
          id: string
          is_required: boolean
          job_id: string
          kind: string
          options: Json
          origin_label: string | null
          origin_type: string | null
          position: number
          question: string
          related_competency: string | null
          related_skill: string | null
          requirement_id: string | null
          section: string
          status: string
          tag: string | null
        }
        Insert: {
          answer_type?: string
          company_id: string
          disqualifying_answer?: string | null
          field_key?: string | null
          follow_up?: Json | null
          id?: string
          is_required?: boolean
          job_id: string
          kind?: string
          options?: Json
          origin_label?: string | null
          origin_type?: string | null
          position?: number
          question: string
          related_competency?: string | null
          related_skill?: string | null
          requirement_id?: string | null
          section?: string
          status?: string
          tag?: string | null
        }
        Update: {
          answer_type?: string
          company_id?: string
          disqualifying_answer?: string | null
          field_key?: string | null
          follow_up?: Json | null
          id?: string
          is_required?: boolean
          job_id?: string
          kind?: string
          options?: Json
          origin_label?: string | null
          origin_type?: string | null
          position?: number
          question?: string
          related_competency?: string | null
          related_skill?: string | null
          requirement_id?: string | null
          section?: string
          status?: string
          tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_questions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_questions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_questions_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "job_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      job_requirements: {
        Row: {
          category: string
          company_id: string
          description: string
          detail: Json
          id: string
          is_knockout: boolean
          job_id: string
          kind: string
          position: number
        }
        Insert: {
          category?: string
          company_id: string
          description: string
          detail?: Json
          id?: string
          is_knockout?: boolean
          job_id: string
          kind?: string
          position?: number
        }
        Update: {
          category?: string
          company_id?: string
          description?: string
          detail?: Json
          id?: string
          is_knockout?: boolean
          job_id?: string
          kind?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_requirements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_requirements_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_skills: {
        Row: {
          company_id: string
          id: string
          importance: string
          job_id: string
          level: string
          name: string
          position: number
        }
        Insert: {
          company_id: string
          id?: string
          importance?: string
          job_id: string
          level?: string
          name: string
          position?: number
        }
        Update: {
          company_id?: string
          id?: string
          importance?: string
          job_id?: string
          level?: string
          name?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_skills_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_skills_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_stages: {
        Row: {
          company_id: string
          has_evaluation: boolean
          has_score: boolean
          id: string
          is_required: boolean
          job_id: string
          name: string
          needs_manual_approval: boolean
          objective: string | null
          owner: string | null
          position: number
          public_agenda_link: string | null
          public_description: string | null
          public_duration_minutes: number | null
          public_format: string | null
          public_meet_link: string | null
          stage_key: string | null
        }
        Insert: {
          company_id: string
          has_evaluation?: boolean
          has_score?: boolean
          id?: string
          is_required?: boolean
          job_id: string
          name: string
          needs_manual_approval?: boolean
          objective?: string | null
          owner?: string | null
          position?: number
          public_agenda_link?: string | null
          public_description?: string | null
          public_duration_minutes?: number | null
          public_format?: string | null
          public_meet_link?: string | null
          stage_key?: string | null
        }
        Update: {
          company_id?: string
          has_evaluation?: boolean
          has_score?: boolean
          id?: string
          is_required?: boolean
          job_id?: string
          name?: string
          needs_manual_approval?: boolean
          objective?: string | null
          owner?: string | null
          position?: number
          public_agenda_link?: string | null
          public_description?: string | null
          public_duration_minutes?: number | null
          public_format?: string | null
          public_meet_link?: string | null
          stage_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_stages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_stages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          benefits: string | null
          challenges: string | null
          city: string | null
          company_id: string
          contract_model: string | null
          created_at: string
          expected_results: string | null
          form_approved_at: string | null
          form_approved_by: string | null
          form_version: number
          has_case: boolean
          id: string
          learn_after: string | null
          manager: string | null
          objective: string | null
          openings: number
          prior_knowledge: string | null
          public_visibility: Json
          reports_to: string | null
          responsibilities: string | null
          routine: string | null
          salary_max: number | null
          salary_min: number | null
          salary_type: string | null
          sector: string | null
          state: string | null
          status: string
          target_hire_date: string | null
          title: string
          updated_at: string
          welcome_message: string | null
          work_hours: string | null
          work_mode: string | null
          workload: string | null
          works_with: string | null
        }
        Insert: {
          benefits?: string | null
          challenges?: string | null
          city?: string | null
          company_id: string
          contract_model?: string | null
          created_at?: string
          expected_results?: string | null
          form_approved_at?: string | null
          form_approved_by?: string | null
          form_version?: number
          has_case?: boolean
          id?: string
          learn_after?: string | null
          manager?: string | null
          objective?: string | null
          openings?: number
          prior_knowledge?: string | null
          public_visibility?: Json
          reports_to?: string | null
          responsibilities?: string | null
          routine?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_type?: string | null
          sector?: string | null
          state?: string | null
          status?: string
          target_hire_date?: string | null
          title: string
          updated_at?: string
          welcome_message?: string | null
          work_hours?: string | null
          work_mode?: string | null
          workload?: string | null
          works_with?: string | null
        }
        Update: {
          benefits?: string | null
          challenges?: string | null
          city?: string | null
          company_id?: string
          contract_model?: string | null
          created_at?: string
          expected_results?: string | null
          form_approved_at?: string | null
          form_approved_by?: string | null
          form_version?: number
          has_case?: boolean
          id?: string
          learn_after?: string | null
          manager?: string | null
          objective?: string | null
          openings?: number
          prior_knowledge?: string | null
          public_visibility?: Json
          reports_to?: string | null
          responsibilities?: string | null
          routine?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_type?: string | null
          sector?: string | null
          state?: string | null
          status?: string
          target_hire_date?: string | null
          title?: string
          updated_at?: string
          welcome_message?: string | null
          work_hours?: string | null
          work_mode?: string | null
          workload?: string | null
          works_with?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      rejections: {
        Row: {
          candidate_id: string
          company_id: string
          created_at: string
          id: string
          notes: string | null
          reason: string
          requirement_id: string | null
        }
        Insert: {
          candidate_id: string
          company_id: string
          created_at?: string
          id?: string
          notes?: string | null
          reason: string
          requirement_id?: string | null
        }
        Update: {
          candidate_id?: string
          company_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          reason?: string
          requirement_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rejections_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rejections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rejections_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "job_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _case_candidate: {
        Args: { _email: string; _token: string }
        Returns: {
          access_token: string
          applied_at: string
          city: string | null
          company_id: string
          current_company: string | null
          current_position: string | null
          current_tenure: string | null
          email: string | null
          employed_now: boolean | null
          id: string
          job_id: string
          linkedin: string | null
          name: string
          overall_score: number | null
          phone: string | null
          resume_text: string | null
          resume_url: string | null
          salary_expectation: string | null
          stage_id: string | null
          state: string | null
          status: string
          tags: string[]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "candidates"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      apply_to_job: {
        Args: {
          _answers?: Json
          _assessment?: Json
          _city: string
          _current_company: string
          _current_position: string
          _current_tenure: string
          _email: string
          _employed_now: boolean
          _job_id: string
          _linkedin: string
          _name: string
          _phone: string
          _salary_expectation: string
          _state: string
        }
        Returns: string
      }
      apply_to_job_with_access: {
        Args: {
          _answers: Json
          _assessment: Json
          _city: string
          _current_company: string
          _current_position: string
          _current_tenure: string
          _email: string
          _employed_now: boolean
          _job_id: string
          _linkedin: string
          _name: string
          _phone: string
          _salary_expectation: string
          _state: string
        }
        Returns: string
      }
      bootstrap_current_user: { Args: { _full_name?: string }; Returns: string }
      confirm_case_ready: {
        Args: { _email: string; _token: string }
        Returns: string
      }
      get_candidate_journey: { Args: { _token: string }; Returns: Json }
      get_public_case: { Args: { _token: string }; Returns: Json }
      get_public_job: { Args: { _job_id: string }; Returns: Json }
      is_company_member: { Args: { _company_id: string }; Returns: boolean }
      submit_case_delivery: {
        Args: {
          _email: string
          _kind: string
          _notes: string
          _token: string
          _url: string
        }
        Returns: string
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
