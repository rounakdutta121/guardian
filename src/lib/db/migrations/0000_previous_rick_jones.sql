CREATE TYPE "public"."blood_type" AS ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."language" AS ENUM('en', 'hi', 'es', 'fr');--> statement-breakpoint
CREATE TYPE "public"."theme" AS ENUM('light', 'dark', 'system');--> statement-breakpoint
CREATE TYPE "public"."emergency_status" AS ENUM('countdown', 'active', 'resolved', 'cancelled', 'failed');--> statement-breakpoint
CREATE TYPE "public"."emergency_trigger" AS ENUM('sos_button', 'test_sos', 'safe_checkin', 'guardian_mode', 'manual');--> statement-breakpoint
CREATE TYPE "public"."journey_status" AS ENUM('planned', 'active', 'paused', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."travel_type" AS ENUM('walking', 'cycling', 'driving', 'transit', 'other');--> statement-breakpoint
CREATE TYPE "public"."checkin_status" AS ENUM('active', 'confirmed', 'missed', 'need_help', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."fake_call_status" AS ENUM('scheduled', 'ringing', 'answered', 'missed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('emergency', 'checkin', 'journey', 'system', 'reminder', 'fake_call');--> statement-breakpoint
CREATE TYPE "public"."activity_type" AS ENUM('sos', 'test_sos', 'checkin', 'journey_start', 'journey_end', 'guardian_mode', 'fake_call', 'contact_added', 'profile_update', 'login', 'settings_change');--> statement-breakpoint
CREATE TYPE "public"."evidence_type" AS ENUM('photo', 'video', 'audio', 'document');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"last_request" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"phone" text,
	"phone_verified" boolean DEFAULT false NOT NULL,
	"profile_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"date_of_birth" date,
	"blood_type" "blood_type" DEFAULT 'unknown',
	"allergies" text,
	"medical_conditions" text,
	"medications" text,
	"emergency_notes" text,
	"address" text,
	"city" text,
	"country" text,
	"theme" "theme" DEFAULT 'system' NOT NULL,
	"language" "language" DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "emergency_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"relationship" text,
	"priority" integer DEFAULT 1 NOT NULL,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"notify_on_sos" boolean DEFAULT true NOT NULL,
	"notify_on_checkin" boolean DEFAULT false NOT NULL,
	"notify_on_journey" boolean DEFAULT false NOT NULL,
	"avatar_url" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "emergency_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"status" "emergency_status" DEFAULT 'countdown' NOT NULL,
	"trigger" "emergency_trigger" NOT NULL,
	"is_test" boolean DEFAULT false NOT NULL,
	"latitude" real,
	"longitude" real,
	"accuracy" real,
	"address" text,
	"maps_url" text,
	"battery_level" integer,
	"sms_preview" jsonb,
	"call_preview" jsonb,
	"timeline" jsonb,
	"contacts_notified" jsonb,
	"resolved_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "journey_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journey_id" uuid NOT NULL,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"accuracy" real,
	"altitude" real,
	"speed" real,
	"heading" real,
	"battery_level" integer,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journey_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"status" "journey_status" DEFAULT 'planned' NOT NULL,
	"travel_type" "travel_type" DEFAULT 'walking' NOT NULL,
	"origin_name" text,
	"origin_lat" real,
	"origin_lng" real,
	"destination_name" text NOT NULL,
	"destination_lat" real,
	"destination_lng" real,
	"eta_minutes" integer,
	"total_distance_meters" real,
	"current_distance_meters" real,
	"current_speed_kmh" real,
	"battery_level" integer,
	"share_token" text,
	"is_guardian_mode" boolean DEFAULT false NOT NULL,
	"started_at" timestamp with time zone,
	"paused_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "fake_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"status" "fake_call_status" DEFAULT 'scheduled' NOT NULL,
	"caller_name" text NOT NULL,
	"caller_number" text,
	"delay_seconds" integer DEFAULT 0 NOT NULL,
	"ringtone" text DEFAULT 'default',
	"scheduled_at" timestamp with time zone NOT NULL,
	"triggered_at" timestamp with time zone,
	"answered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "safe_checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"status" "checkin_status" DEFAULT 'active' NOT NULL,
	"duration_minutes" integer NOT NULL,
	"message" text,
	"scheduled_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"confirmed_at" timestamp with time zone,
	"emergency_session_id" uuid,
	"notify_contacts" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"data" jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" "activity_type" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"metadata" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"platform" text NOT NULL,
	"device_name" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"emergency_session_id" uuid,
	"type" "evidence_type" NOT NULL,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"mime_type" text,
	"file_size" integer,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "offline_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"payload" jsonb NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 5 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"location" boolean DEFAULT false NOT NULL,
	"notifications" boolean DEFAULT false NOT NULL,
	"contacts" boolean DEFAULT false NOT NULL,
	"camera" boolean DEFAULT false NOT NULL,
	"microphone" boolean DEFAULT false NOT NULL,
	"background_location" boolean DEFAULT false NOT NULL,
	"granted_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"sos_countdown_seconds" integer DEFAULT 3 NOT NULL,
	"auto_share_location" boolean DEFAULT true NOT NULL,
	"enable_vibration" boolean DEFAULT true NOT NULL,
	"enable_sound" boolean DEFAULT true NOT NULL,
	"fake_call_ringtone" text DEFAULT 'default',
	"default_checkin_minutes" integer DEFAULT 30 NOT NULL,
	"journey_auto_share" boolean DEFAULT true NOT NULL,
	"emergency_message" text,
	"privacy_share_data" boolean DEFAULT true NOT NULL,
	"analytics_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_sessions" ADD CONSTRAINT "emergency_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journey_locations" ADD CONSTRAINT "journey_locations_journey_id_journey_sessions_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journey_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journey_sessions" ADD CONSTRAINT "journey_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fake_calls" ADD CONSTRAINT "fake_calls_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safe_checkins" ADD CONSTRAINT "safe_checkins_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_files" ADD CONSTRAINT "evidence_files_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offline_queue" ADD CONSTRAINT "offline_queue_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "account_provider_idx" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_token_idx" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_phone_idx" ON "user" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "profiles_user_id_idx" ON "profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "emergency_contacts_user_id_idx" ON "emergency_contacts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "emergency_contacts_priority_idx" ON "emergency_contacts" USING btree ("user_id","priority");--> statement-breakpoint
CREATE INDEX "emergency_contacts_favorite_idx" ON "emergency_contacts" USING btree ("user_id","is_favorite");--> statement-breakpoint
CREATE INDEX "emergency_sessions_user_id_idx" ON "emergency_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "emergency_sessions_status_idx" ON "emergency_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "emergency_sessions_created_at_idx" ON "emergency_sessions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "journey_locations_journey_id_idx" ON "journey_locations" USING btree ("journey_id");--> statement-breakpoint
CREATE INDEX "journey_locations_recorded_at_idx" ON "journey_locations" USING btree ("recorded_at");--> statement-breakpoint
CREATE INDEX "journey_sessions_user_id_idx" ON "journey_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "journey_sessions_status_idx" ON "journey_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "journey_sessions_share_token_idx" ON "journey_sessions" USING btree ("share_token");--> statement-breakpoint
CREATE INDEX "fake_calls_user_id_idx" ON "fake_calls" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "fake_calls_status_idx" ON "fake_calls" USING btree ("status");--> statement-breakpoint
CREATE INDEX "fake_calls_scheduled_at_idx" ON "fake_calls" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "safe_checkins_user_id_idx" ON "safe_checkins" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "safe_checkins_status_idx" ON "safe_checkins" USING btree ("status");--> statement-breakpoint
CREATE INDEX "safe_checkins_expires_at_idx" ON "safe_checkins" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_is_read_idx" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "activity_logs_user_id_idx" ON "activity_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activity_logs_type_idx" ON "activity_logs" USING btree ("type");--> statement-breakpoint
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "device_tokens_user_id_idx" ON "device_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "device_tokens_token_idx" ON "device_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "evidence_files_user_id_idx" ON "evidence_files" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "evidence_files_emergency_session_id_idx" ON "evidence_files" USING btree ("emergency_session_id");--> statement-breakpoint
CREATE INDEX "offline_queue_user_id_idx" ON "offline_queue" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "offline_queue_status_idx" ON "offline_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "permissions_user_id_idx" ON "permissions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_settings_user_id_idx" ON "user_settings" USING btree ("user_id");