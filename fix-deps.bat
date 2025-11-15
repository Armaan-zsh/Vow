@echo off
echo Fixing dependencies...
rmdir /s /q node_modules 2>nul
del package-lock.json 2>nul
npm install
echo Done! Now run: npm run type-check