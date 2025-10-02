-- Migration script to transition from old users table to better-auth tables
-- This should be run carefully in production

-- Step 1: Create better-auth tables (if not exists)
-- These will be created by drizzle-kit

-- Step 2: Drop foreign key constraints temporarily
ALTER TABLE workspace_members DROP CONSTRAINT IF EXISTS workspace_members_user_id_users_id_fk;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_created_by_users_id_fk;
ALTER TABLE cell_comments DROP CONSTRAINT IF EXISTS cell_comments_user_id_users_id_fk;
ALTER TABLE project_versions DROP CONSTRAINT IF EXISTS project_versions_created_by_users_id_fk;
ALTER TABLE data_connections DROP CONSTRAINT IF EXISTS data_connections_created_by_users_id_fk;

-- Step 3: Migrate existing users to better-auth user table
-- Note: This is a one-time migration and existing UUID users will get new text IDs
INSERT INTO "user" (id, name, email, "emailVerified", image, "createdAt", "updatedAt")
SELECT
  id::text,  -- Convert UUID to text
  COALESCE(name, email),  -- Use email as name if name is null
  email,
  false,  -- Email not verified by default
  NULL,  -- No image
  created_at,
  updated_at
FROM users
ON CONFLICT (email) DO NOTHING;

-- Step 4: Create account records for password-based auth
INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,  -- Generate new ID for account
  email,  -- Use email as accountId
  'credential',  -- Provider for email/password auth
  id::text,  -- Reference to user
  password_hash,  -- Migrate password hash
  created_at,
  updated_at
FROM users
WHERE password_hash IS NOT NULL
ON CONFLICT DO NOTHING;

-- Step 5: Update foreign keys to point to new user IDs
-- Note: This assumes you want to keep the existing references
-- You may need to adjust based on your data

-- For workspace_members
UPDATE workspace_members
SET user_id = (SELECT id::text FROM users WHERE users.id::text = workspace_members.user_id::text);

-- For projects
UPDATE projects
SET created_by = (SELECT id::text FROM users WHERE users.id::text = projects.created_by::text);

-- For cell_comments
UPDATE cell_comments
SET user_id = (SELECT id::text FROM users WHERE users.id::text = cell_comments.user_id::text);

-- For project_versions
UPDATE project_versions
SET created_by = (SELECT id::text FROM users WHERE users.id::text = project_versions.created_by::text);

-- For data_connections
UPDATE data_connections
SET created_by = (SELECT id::text FROM users WHERE users.id::text = data_connections.created_by::text);

-- Step 6: Re-add foreign key constraints with new references
ALTER TABLE workspace_members
  ADD CONSTRAINT workspace_members_user_id_user_id_fk
  FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;

ALTER TABLE projects
  ADD CONSTRAINT projects_created_by_user_id_fk
  FOREIGN KEY (created_by) REFERENCES "user"(id);

ALTER TABLE cell_comments
  ADD CONSTRAINT cell_comments_user_id_user_id_fk
  FOREIGN KEY (user_id) REFERENCES "user"(id);

ALTER TABLE project_versions
  ADD CONSTRAINT project_versions_created_by_user_id_fk
  FOREIGN KEY (created_by) REFERENCES "user"(id);

ALTER TABLE data_connections
  ADD CONSTRAINT data_connections_created_by_user_id_fk
  FOREIGN KEY (created_by) REFERENCES "user"(id);

-- Step 7: Drop old users table (optional, after verifying migration)
-- DROP TABLE users;
