#!/bin/bash

# --- CONFIGURATION ---
export SUPABASE_ACCESS_TOKEN="sbp_REPLACE_WITH_YOUR_TOKEN"
PROJECT_ID="rsfhrsvtefmxgfdadgij"

# --- DEPLOYMENT ---
echo "Restoring Gemini 2.0 Key..."
npx supabase secrets set GOOGLE_API_KEY=AIzaSyChv-_4yVRPV0Mvs7KxZW9xtqW27Kbl2Ow --project-ref $PROJECT_ID

echo "Deploying Avatar Generator (Gemini 2.0 Edition)..."
npx supabase functions deploy generate-avatar --no-verify-jwt --project-ref $PROJECT_ID
echo "Done!"
