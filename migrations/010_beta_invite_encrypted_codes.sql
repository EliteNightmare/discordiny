-- Apply ONLY to production discordiny D1 before using new beta code generation.
-- Existing hashed invitations remain valid, but their original codes cannot be recovered.
ALTER TABLE beta_invites ADD COLUMN code_ciphertext TEXT;
