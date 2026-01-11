#!/bin/bash

# Setup script for linking to cloud Supabase project

echo "🚀 Setting up Supabase Cloud Connection"
echo ""

# Step 1: Login to Supabase
echo "Step 1: Logging in to Supabase..."
echo "You'll be prompted to open your browser to authenticate."
npx supabase login

# Step 2: List projects
echo ""
echo "Step 2: Fetching your Supabase projects..."
npx supabase projects list

# Step 3: Link to project
echo ""
echo "Step 3: Linking to your project..."
echo "Please enter your project reference ID (found in your Supabase dashboard URL or from the list above):"
read -p "Project Ref: " PROJECT_REF

if [ -z "$PROJECT_REF" ]; then
  echo "❌ Project ref is required. Exiting."
  exit 1
fi

echo "Linking to project: $PROJECT_REF"
npx supabase link --project-ref "$PROJECT_REF"

# Step 4: Push migrations
echo ""
echo "Step 4: Pushing database migrations..."
npx supabase db push

# Step 5: Seed database
echo ""
echo "Step 5: Seeding database..."
npm run db:seed

echo ""
echo "✅ Setup complete!"
echo ""
echo "Your Supabase project is now linked and initialized."
echo "You can find your connection details in the Supabase dashboard."

