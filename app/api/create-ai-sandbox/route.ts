import { NextResponse } from 'next/server';
import type { SandboxState } from '@/types/sandbox';
import { appConfig } from '@/config/app.config';
import { createSandbox, execSandbox, deleteSandbox, healthCheck, exposePort } from '@/lib/sandboxd';

// Store active sandbox globally
declare global {
  var activeSandboxId: string | null;
  var sandboxData: any;
  var existingFiles: Set<string>;
  var sandboxState: SandboxState;
}

export async function POST() {
  let sandboxId: string | null = null;

  try {
    console.log('[create-ai-sandbox] Creating base sandbox...');

    // Verify sandboxd health first
    const healthy = await healthCheck();
    if (!healthy) {
      console.warn('[create-ai-sandbox] Sandbox health check failed; attempting to create anyway...');
    }
    
    // Kill existing sandbox if any
    if (global.activeSandboxId) {
      console.log('[create-ai-sandbox] Killing existing sandbox...');
      try {
        await deleteSandbox(global.activeSandboxId);
      } catch (e) {
        console.error('Failed to close existing sandbox:', e);
      }
      global.activeSandboxId = null;
    }
    
    // Clear existing files tracking
    if (global.existingFiles) {
      global.existingFiles.clear();
    } else {
      global.existingFiles = new Set<string>();
    }

    // Create base sandbox - we'll set up Vite ourselves for full control
    console.log('[create-ai-sandbox] Creating sandbox via sandboxd...');
    const info = await createSandbox('node');
    sandboxId = info.id;
    const host = info.host;
    // URL may be provided after expose; default to host:port if present
    let url = info.host && info.port ? `http://${info.host}:${info.port}` : '';

    console.log(`[create-ai-sandbox] Sandbox created: ${sandboxId}`);
    console.log(`[create-ai-sandbox] Sandbox host: ${url}`);

    // Set up a basic Vite React app using Python to write files
    console.log('[create-ai-sandbox] Setting up Vite React app...');
    
    // Write all files in a single Python script to avoid multiple executions
    const setupScript = `
import os
import json

print('Setting up React app with Vite and Tailwind...')

# Create directory structure
os.makedirs('/home/user/app/src', exist_ok=True)

# Package.json
package_json = {
    "name": "sandbox-app",
    "version": "1.0.0",
    "type": "module",
    "scripts": {
        "dev": "vite --host",
        "build": "vite build",
        "preview": "vite preview"
    },
    "dependencies": {
        "react": "^18.2.0",
        "react-dom": "^18.2.0"
    },
    "devDependencies": {
        "@vitejs/plugin-react": "^4.0.0",
        "vite": "^4.3.9",
        "tailwindcss": "^3.3.0",
        "postcss": "^8.4.31",
        "autoprefixer": "^10.4.16"
    }
}

with open('/home/user/app/package.json', 'w') as f:
    json.dump(package_json, f, indent=2)
print('✓ package.json')

# Vite config for E2B - with allowedHosts
vite_config = """import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// E2B-compatible Vite configuration
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: false,
    allowedHosts: ['.e2b.app', 'localhost', '127.0.0.1']
  }
})"""

with open('/home/user/app/vite.config.js', 'w') as f:
    f.write(vite_config)
print('✓ vite.config.js')

# Tailwind config - standard without custom design tokens
tailwind_config = """/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}"""

with open('/home/user/app/tailwind.config.js', 'w') as f:
    f.write(tailwind_config)
print('✓ tailwind.config.js')

# PostCSS config
postcss_config = """export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}"""

with open('/home/user/app/postcss.config.js', 'w') as f:
    f.write(postcss_config)
print('✓ postcss.config.js')

# Index.html
index_html = """<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sandbox App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>"""

with open('/home/user/app/index.html', 'w') as f:
    f.write(index_html)
print('✓ index.html')

# Main.jsx
main_jsx = """import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)"""

with open('/home/user/app/src/main.jsx', 'w') as f:
    f.write(main_jsx)
print('✓ src/main.jsx')

# App.jsx with explicit Tailwind test
app_jsx = """function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        <p className="text-lg text-gray-400">
          Sandbox Ready<br/>
          Start building your React app with Vite and Tailwind CSS!
        </p>
      </div>
    </div>
  )
}

export default App"""

with open('/home/user/app/src/App.jsx', 'w') as f:
    f.write(app_jsx)
print('✓ src/App.jsx')

# Index.css with explicit Tailwind directives
index_css = """@tailwind base;
@tailwind components;
@tailwind utilities;

/* Force Tailwind to load */
@layer base {
  :root {
    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    -webkit-text-size-adjust: 100%;
  }
  
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background-color: rgb(17 24 39);
}"""

with open('/home/user/app/src/index.css', 'w') as f:
    f.write(index_css)
print('✓ src/index.css')

print('\\nAll files created successfully!')
`;

    // Execute the setup script
    await execSandbox(sandboxId!, `python - <<'PY'\n${setupScript}\nPY`);
    
    // Install dependencies
    console.log('[create-ai-sandbox] Installing dependencies...');
    await execSandbox(sandboxId!, `cd /home/user/app && npm install`);
    
    // Start Vite dev server
    console.log('[create-ai-sandbox] Starting Vite dev server...');
    await execSandbox(sandboxId!, `cd /home/user/app && pkill -f vite || true && npm run dev &`);
    
    // Wait for Vite to be fully ready
    await new Promise(resolve => setTimeout(resolve, appConfig.sandbox.viteStartupDelay));
    
    // Force Tailwind CSS to rebuild by touching the CSS file
    await execSandbox(sandboxId!, `touch /home/user/app/src/index.css`);

    // Expose dev server for external access if supported by sandboxd
    try {
      const exposed = await exposePort(sandboxId!, appConfig.sandbox.vitePort);
      if (exposed?.url) {
        url = exposed.url;
        console.log('[create-ai-sandbox] Exposed URL:', url);
      }
    } catch (exErr) {
      console.warn('[create-ai-sandbox] exposePort failed or unsupported, falling back to host:port if available.', exErr);
    }

    // Store sandbox globally
    global.activeSandboxId = sandboxId;
    global.sandboxData = {
      sandboxId,
      url
    };
    
    // Initialize sandbox state
    global.sandboxState = {
      fileCache: {
        files: {},
        lastSync: Date.now(),
        sandboxId
      },
      sandboxId,
      sandboxData: {
        sandboxId,
        url
      }
    };
    
    // Track initial files
    global.existingFiles.add('src/App.jsx');
    global.existingFiles.add('src/main.jsx');
    global.existingFiles.add('src/index.css');
    global.existingFiles.add('index.html');
    global.existingFiles.add('package.json');
    global.existingFiles.add('vite.config.js');
    global.existingFiles.add('tailwind.config.js');
    global.existingFiles.add('postcss.config.js');
    
    console.log('[create-ai-sandbox] Sandbox ready at:', url);

    return NextResponse.json({
      success: true,
      sandboxId,
      url,
      message: 'Sandbox created and Vite React app initialized'
    });

  } catch (error) {
    console.error('[create-ai-sandbox] Error:', error);
    
    // Clean up on error
    if (sandboxId) {
      try {
        await deleteSandbox(sandboxId);
      } catch (e) {
        console.error('Failed to close sandbox on error:', e);
      }
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create sandbox',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
