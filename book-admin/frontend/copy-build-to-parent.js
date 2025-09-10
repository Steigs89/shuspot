const fs = require('fs');
const path = require('path');

console.log('Copying build files to parent directory for Vercel...');

const sourceBuildDir = path.join(__dirname, 'build');
const targetBuildDir = path.join(__dirname, '..', 'build');

// Remove existing build directory in parent
if (fs.existsSync(targetBuildDir)) {
  console.log('Removing existing build directory...');
  fs.rmSync(targetBuildDir, { recursive: true, force: true });
}

// Function to recursively copy directory
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const items = fs.readdirSync(src);
  
  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy build directory to parent
if (fs.existsSync(sourceBuildDir)) {
  copyDir(sourceBuildDir, targetBuildDir);
  console.log('Build files copied successfully to parent directory!');
  console.log('Target directory contents:', fs.readdirSync(targetBuildDir));
} else {
  console.error('Source build directory not found!');
  process.exit(1);
}
