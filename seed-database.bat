@echo off
echo Seeding Raftar Group database with sample data...
cd /d %~dp0backend
npm run seed
echo Done! Check output above for status.
pause
