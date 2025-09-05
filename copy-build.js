const fs = require('fs');
const path = require('path');

console.log('Starting copy process...');
console.log('Current directory:', process.cwd());
console.log('Directory contents:', fs.readdirSync('.'));

// Check if build directory exists
if (!fs.existsSync('build')) {
  console.error('Build directory not found!');
  console.log('Available directories:', fs.readdirSync('.').filter(item => fs.statSync(item).isDirectory()));
  process.exit(1);
}

console.log('Build directory found!');
console.log('Build contents:', fs.readdirSync('build'));

// Remove public if it exists
if (fs.existsSync('public')) {
  console.log('Removing existing public directory...');
  fs.rmSync('public', { recursive: true, force: true });
}

// Try to create a symlink first, fallback to copy
try {
  console.log('Trying to create symlink...');
  fs.symlinkSync('build', 'public', 'dir');
  console.log('Symlink created successfully!');
} catch (err) {
  console.log('Symlink failed, copying files instead...');
  
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
  
  copyDir('build', 'public');
  console.log('Files copied successfully!');
}

// Verify public directory was created
if (fs.existsSync('public')) {
  console.log('Public directory created successfully!');
  console.log('Public contents:', fs.readdirSync('public'));
} else {
  console.error('Failed to create public directory!');
  process.exit(1);
}
