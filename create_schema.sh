#!/bin/bash

# Database connection details
DB_USER="postgres"
DB_PASS="password" # Replace with your actual password
DB_NAME="postgres"
SCHEMA_NAME="og"
# SQL_FILE="/Users/kevinlau/Documents/Dev/MyMarketPlaceGuard/database/my_market_place_guard.sql"
SQL_FILE="/Users/kevinlau/Documents/Dev/MyMarketPlaceGuard/tempFiles/backend1/my_market_place_guard.sql"
# Check if SQL file exists
if [ ! -f "$SQL_FILE" ]; then
  echo "Error: SQL file not found at $SQL_FILE"
  exit 1
fi

# Drop the schema if it exists
psql -U "$DB_USER" -d "$DB_NAME" -w "$DB_PASS" -c "DROP SCHEMA IF EXISTS $SCHEMA_NAME CASCADE;"

# Create the schema
psql -U "$DB_USER" -d "$DB_NAME" -w "$DB_PASS" -c "CREATE SCHEMA $SCHEMA_NAME;"

# Apply the SQL script to the schema
psql -U "$DB_USER" -d "$DB_NAME" -w "$DB_PASS" -f "$SQL_FILE"

# Optional: Set the search path to the newly created schema
# psql -U "$DB_USER" -d "$DB_NAME" -w "$DB_PASS" -c "SET search_path TO $SCHEMA_NAME;"

echo "Schema '$SCHEMA_NAME' recreated and SQL script applied successfully."

exit 0
